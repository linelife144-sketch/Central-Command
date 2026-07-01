import type { AssessmentPhotoType, CapturedPhotoMetadata, UploadStatus } from '../../types';
import { generateImageThumbnail } from '../utils/thumbnail';

export const PHOTO_STORAGE_BUCKET = 'assessment-photos';
export const PHOTO_STORAGE_AUTH_ERROR = 'You must be signed in to upload photos.';
export const PHOTO_STORAGE_UPLOAD_ERROR = 'Unable to upload photo assets.';

interface AuthClient {
  getUser: () => Promise<{ data: { user: { id: string } | null }; error: unknown }>;
}

interface StorageBucketClient {
  upload: (path: string, file: File, options?: { upsert?: boolean }) => Promise<{ error: unknown }>;
  getPublicUrl: (path: string) => { data: { publicUrl: string } };
}

interface StorageClient {
  from: (bucket: string) => StorageBucketClient;
}

interface ContractorsTableClient {
  select: (columns: string) => {
    eq: (column: string, value: string) => {
      maybeSingle: () => Promise<{ data: { id: string } | null; error: unknown }>;
    };
  };
}

type UploadStatusValue = UploadStatus | 'PENDING' | 'COMPLETED' | 'FAILED';

interface MediaAssetsTableClient {
  insert: (
    values: Array<{
      uploaded_by: string;
      contractor_id?: string | null;
      file_name: string;
      original_name: string;
      file_type: 'PHOTO';
      mime_type: string;
      file_size_bytes: number;
      storage_bucket: string;
      storage_path: string;
      public_url?: string;
      thumbnail_url?: string;
      exif_data?: Record<string, unknown>;
      captured_at?: string | null;
      gps_latitude?: number | null;
      gps_longitude?: number | null;
      checksum_sha256?: string | null;
      entity_type: 'ticket';
      entity_id: string;
      upload_status: UploadStatusValue;
    }>
  ) => Promise<{ error: unknown }>;
}

interface PhotoStorageSupabaseClient {
  auth: AuthClient;
  storage: StorageClient;
  from(table: 'contractors'): ContractorsTableClient;
  from(table: 'media_assets'): MediaAssetsTableClient;
}

interface UploadContext {
  userId: string;
  contractorId: string | null;
}

export interface PhotoUploadPipelineInput {
  photoId: string;
  ticketId: string;
  type: AssessmentPhotoType;
  file: Blob;
  metadata?: CapturedPhotoMetadata;
  checksumSha256?: string;
  thumbnailFile?: File;
}

export interface PhotoUploadPipelineResult {
  storagePath: string;
  thumbnailPath: string;
  publicUrl: string;
  thumbnailUrl: string;
}

export function sanitizeStorageSegment(segment: string): string {
  return segment.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function getFileExtension(fileName: string, fallback = 'jpg'): string {
  const extension = fileName.split('.').pop()?.toLowerCase();
  return extension && extension.length <= 10 ? extension : fallback;
}

export function buildPhotoStoragePath(params: {
  userId: string;
  ticketId: string;
  photoId: string;
  variant: 'original' | 'thumbnail';
  extension: string;
}): string {
  const userId = sanitizeStorageSegment(params.userId);
  const ticketId = sanitizeStorageSegment(params.ticketId);
  const photoId = sanitizeStorageSegment(params.photoId);
  const extension = sanitizeStorageSegment(params.extension);

  return `${userId}/tickets/${ticketId}/${photoId}-${params.variant}.${extension}`;
}

async function getDefaultClient(): Promise<PhotoStorageSupabaseClient> {
  const { supabase } = await import('../supabase/client');
  return supabase as unknown as PhotoStorageSupabaseClient;
}

async function resolveUploadContext(client: PhotoStorageSupabaseClient): Promise<UploadContext> {
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    throw new Error(PHOTO_STORAGE_AUTH_ERROR);
  }

  const { data: contractor } = await client
    .from('contractors')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle();

  return {
    userId: user.id,
    contractorId: contractor?.id ?? null,
  };
}

function toFile(blob: Blob, name: string, type: string): File {
  if (blob instanceof File) {
    return blob;
  }

  return new File([blob], name, { type: blob.type || type, lastModified: Date.now() });
}

export async function uploadPhotoPipeline(
  input: PhotoUploadPipelineInput,
  client?: PhotoStorageSupabaseClient,
): Promise<PhotoUploadPipelineResult> {
  const activeClient = client ?? await getDefaultClient();
  const context = await resolveUploadContext(activeClient);

  const originalFile = toFile(
    input.file,
    `${input.photoId}.${getFileExtension((input.file as File).name || 'photo.jpg')}`,
    'image/jpeg',
  );
  const thumbnailFile = input.thumbnailFile ?? (await generateImageThumbnail(originalFile)).file;

  const originalExtension = getFileExtension(originalFile.name);
  const thumbnailExtension = getFileExtension(thumbnailFile.name);

  const storagePath = buildPhotoStoragePath({
    userId: context.userId,
    ticketId: input.ticketId,
    photoId: input.photoId,
    variant: 'original',
    extension: originalExtension,
  });

  const thumbnailPath = buildPhotoStoragePath({
    userId: context.userId,
    ticketId: input.ticketId,
    photoId: input.photoId,
    variant: 'thumbnail',
    extension: thumbnailExtension,
  });

  const storageBucket = activeClient.storage.from(PHOTO_STORAGE_BUCKET);
  const originalUpload = await storageBucket.upload(storagePath, originalFile, { upsert: false });
  if (originalUpload.error) {
    throw new Error(PHOTO_STORAGE_UPLOAD_ERROR);
  }

  const thumbnailUpload = await storageBucket.upload(thumbnailPath, thumbnailFile, { upsert: false });
  if (thumbnailUpload.error) {
    throw new Error(PHOTO_STORAGE_UPLOAD_ERROR);
  }

  const publicUrl = storageBucket.getPublicUrl(storagePath).data.publicUrl;
  const thumbnailUrl = storageBucket.getPublicUrl(thumbnailPath).data.publicUrl;

  const insertResult = await activeClient
    .from('media_assets')
    .insert([
      {
        uploaded_by: context.userId,
        contractor_id: context.contractorId,
        file_name: originalFile.name,
        original_name: originalFile.name,
        file_type: 'PHOTO',
        mime_type: originalFile.type || 'image/jpeg',
        file_size_bytes: originalFile.size,
        storage_bucket: PHOTO_STORAGE_BUCKET,
        storage_path: storagePath,
        public_url: publicUrl,
        thumbnail_url: thumbnailUrl,
        exif_data: input.metadata
          ? {
            capturedAt: input.metadata.capturedAt,
            gpsLatitude: input.metadata.gpsLatitude,
            gpsLongitude: input.metadata.gpsLongitude,
            deviceMake: input.metadata.deviceMake,
            deviceModel: input.metadata.deviceModel,
          }
          : undefined,
        captured_at: input.metadata?.capturedAt ?? null,
        gps_latitude: input.metadata?.gpsLatitude ?? null,
        gps_longitude: input.metadata?.gpsLongitude ?? null,
        checksum_sha256: input.checksumSha256 ?? null,
        entity_type: 'ticket',
        entity_id: input.ticketId,
        upload_status: 'COMPLETED',
      },
    ]);

  if (insertResult.error) {
    throw new Error('Unable to persist uploaded photo metadata.');
  }

  return {
    storagePath,
    thumbnailPath,
    publicUrl,
    thumbnailUrl,
  };
}
