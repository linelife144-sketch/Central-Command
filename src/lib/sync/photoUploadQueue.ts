import type { CapturedAssessmentPhoto, AssessmentPhotoType } from '../../types';
import {
  getPendingPhotos,
  markPhotoUploadFailed,
  markPhotoUploaded,
  queuePhoto,
  type LocalPhoto,
} from '../db/dexie';
import { uploadPhotoPipeline } from '../services/photoStorageService';
import { generateImageThumbnail } from '../utils/thumbnail';

export interface PhotoUploadQueue {
  add: (photo: CapturedAssessmentPhoto) => Promise<string>;
  process: () => Promise<PhotoUploadProcessResult>;
  getPendingCount: () => Promise<number>;
}

export interface PhotoUploadProcessResult {
  processed: number;
  uploaded: number;
  failed: number;
  errors: Array<{ photoId: string; message: string }>;
}

interface PhotoUploadQueueDependencies {
  addLocalPhoto: (photo: Omit<LocalPhoto, 'id'>) => Promise<string>;
  getPendingLocalPhotos: () => Promise<LocalPhoto[]>;
  markLocalPhotoUploaded: (id: string) => Promise<void>;
  markLocalPhotoFailed: (id: string) => Promise<void>;
  uploadPhotoAsset: typeof uploadPhotoPipeline;
  generatePreview: (file: File) => Promise<string>;
  isOnline: () => boolean;
}

function toAssessmentPhotoType(type: string): AssessmentPhotoType {
  if (type === 'OVERVIEW' || type === 'EQUIPMENT' || type === 'DAMAGE' || type === 'SAFETY') {
    return type;
  }

  return 'CONTEXT';
}

function inferExtensionFromMimeType(mimeType: string): string {
  if (mimeType === 'image/png') {
    return 'png';
  }

  if (mimeType === 'image/webp') {
    return 'webp';
  }

  return 'jpg';
}

function toUploadFile(localPhoto: LocalPhoto): File {
  if (localPhoto.file instanceof File) {
    return localPhoto.file;
  }

  const extension = inferExtensionFromMimeType(localPhoto.file.type);
  return new File([localPhoto.file], `${localPhoto.id}.${extension}`, {
    type: localPhoto.file.type || 'image/jpeg',
    lastModified: Date.now(),
  });
}

async function generatePreview(file: File): Promise<string> {
  const thumbnail = await generateImageThumbnail(file);
  return thumbnail.dataUrl;
}

function defaultIsOnline(): boolean {
  if (typeof navigator === 'undefined') {
    return true;
  }

  return navigator.onLine;
}

const defaultDependencies: PhotoUploadQueueDependencies = {
  addLocalPhoto: queuePhoto,
  getPendingLocalPhotos: getPendingPhotos,
  markLocalPhotoUploaded: markPhotoUploaded,
  markLocalPhotoFailed: markPhotoUploadFailed,
  uploadPhotoAsset: uploadPhotoPipeline,
  generatePreview,
  isOnline: defaultIsOnline,
};

export function createPhotoUploadQueue(
  overrides: Partial<PhotoUploadQueueDependencies> = {},
): PhotoUploadQueue {
  const dependencies: PhotoUploadQueueDependencies = {
    ...defaultDependencies,
    ...overrides,
  };

  return {
    async add(photo: CapturedAssessmentPhoto): Promise<string> {
      const preview = await dependencies.generatePreview(photo.file);

      return dependencies.addLocalPhoto({
        file: photo.file,
        preview: preview || photo.previewUrl,
        type: photo.type,
        entity_type: 'ticket',
        entity_id: photo.ticketId,
        gps_latitude: photo.metadata.gpsLatitude ?? undefined,
        gps_longitude: photo.metadata.gpsLongitude ?? undefined,
        captured_at: photo.metadata.capturedAt ?? photo.capturedAt,
        checksum: photo.checksumSha256,
        uploaded: false,
        upload_status: 'pending',
      });
    },

    async process(): Promise<PhotoUploadProcessResult> {
      const pendingPhotos = await dependencies.getPendingLocalPhotos();

      if (!dependencies.isOnline()) {
        return {
          processed: 0,
          uploaded: 0,
          failed: 0,
          errors: [],
        };
      }

      let uploaded = 0;
      let failed = 0;
      const errors: Array<{ photoId: string; message: string }> = [];

      for (const photo of pendingPhotos) {
        try {
          await dependencies.uploadPhotoAsset({
            photoId: photo.id,
            ticketId: photo.entity_id,
            type: toAssessmentPhotoType(photo.type),
            file: toUploadFile(photo),
            metadata: {
              gpsLatitude: photo.gps_latitude ?? null,
              gpsLongitude: photo.gps_longitude ?? null,
              capturedAt: photo.captured_at ?? null,
              deviceMake: null,
              deviceModel: null,
            },
            checksumSha256: photo.checksum || undefined,
          });

          await dependencies.markLocalPhotoUploaded(photo.id);
          uploaded += 1;
        } catch (error) {
          await dependencies.markLocalPhotoFailed(photo.id);
          failed += 1;
          errors.push({
            photoId: photo.id,
            message: error instanceof Error ? error.message : 'Upload failed.',
          });
        }
      }

      return {
        processed: pendingPhotos.length,
        uploaded,
        failed,
        errors,
      };
    },

    async getPendingCount(): Promise<number> {
      const pendingPhotos = await dependencies.getPendingLocalPhotos();
      return pendingPhotos.length;
    },
  };
}

export const photoUploadQueue = createPhotoUploadQueue();
