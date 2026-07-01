import { APP_CONFIG } from '../config/appConfig';

export interface ImageCompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  initialQuality?: number;
  useWebWorker?: boolean;
}

export interface ImageCompressionResult {
  file: File;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  compressed: boolean;
}

export interface ImageCompressionLibraryOptions {
  maxSizeMB: number;
  maxWidthOrHeight: number;
  initialQuality: number;
  useWebWorker: boolean;
  fileType: string;
}

export function getImageCompressionOptions(options: ImageCompressionOptions = {}): ImageCompressionLibraryOptions {
  return {
    maxSizeMB: options.maxSizeMB ?? APP_CONFIG.MAX_PHOTO_SIZE_MB,
    maxWidthOrHeight: options.maxWidthOrHeight ?? Math.max(APP_CONFIG.MAX_PHOTO_WIDTH, APP_CONFIG.MAX_PHOTO_HEIGHT),
    initialQuality: options.initialQuality ?? APP_CONFIG.PHOTO_QUALITY,
    useWebWorker: options.useWebWorker ?? true,
    fileType: 'image/jpeg',
  };
}

function toFile(blob: Blob, originalFile: File): File {
  if (blob instanceof File) {
    return blob;
  }

  const normalizedType = blob.type || originalFile.type || 'image/jpeg';
  return new File([blob], originalFile.name, { type: normalizedType, lastModified: Date.now() });
}

export async function compressImageFile(
  file: File,
  options: ImageCompressionOptions = {},
): Promise<ImageCompressionResult> {
  const normalizedOptions = getImageCompressionOptions(options);

  try {
    const compressionModule = await import('browser-image-compression');
    const compress = compressionModule.default;
    const compressedBlob = await compress(file, normalizedOptions);
    const compressedFile = toFile(compressedBlob, file);
    const compressed = compressedFile.size < file.size;

    return {
      file: compressedFile,
      originalSizeBytes: file.size,
      compressedSizeBytes: compressedFile.size,
      compressed,
    };
  } catch {
    return {
      file,
      originalSizeBytes: file.size,
      compressedSizeBytes: file.size,
      compressed: false,
    };
  }
}
