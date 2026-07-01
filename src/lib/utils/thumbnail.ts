export interface ThumbnailOptions {
  maxDimension?: number;
  quality?: number;
  outputType?: string;
}

export interface ThumbnailDimensions {
  width: number;
  height: number;
}

export interface ThumbnailGenerationResult {
  file: File;
  dataUrl: string;
  width: number;
  height: number;
}

const DEFAULT_MAX_DIMENSION = 360;
const DEFAULT_QUALITY = 0.78;
const DEFAULT_OUTPUT_TYPE = 'image/jpeg';

export function calculateThumbnailDimensions(
  originalWidth: number,
  originalHeight: number,
  maxDimension = DEFAULT_MAX_DIMENSION,
): ThumbnailDimensions {
  if (originalWidth <= 0 || originalHeight <= 0) {
    return { width: maxDimension, height: maxDimension };
  }

  if (originalWidth <= maxDimension && originalHeight <= maxDimension) {
    return { width: originalWidth, height: originalHeight };
  }

  if (originalWidth >= originalHeight) {
    const width = maxDimension;
    const height = Math.max(1, Math.round((originalHeight / originalWidth) * maxDimension));
    return { width, height };
  }

  const height = maxDimension;
  const width = Math.max(1, Math.round((originalWidth / originalHeight) * maxDimension));
  return { width, height };
}

function fallbackResult(file: File): ThumbnailGenerationResult {
  return {
    file,
    dataUrl: '',
    width: 0,
    height: 0,
  };
}

function buildThumbnailFile(originalFile: File, blob: Blob, outputType: string): File {
  const baseName = originalFile.name.replace(/\.[^.]+$/, '');
  return new File([blob], `${baseName}-thumb.jpg`, {
    type: outputType,
    lastModified: Date.now(),
  });
}

async function loadImageBitmap(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file);
  }

  throw new Error('Image bitmap support unavailable.');
}

export async function generateImageThumbnail(
  file: File,
  options: ThumbnailOptions = {},
): Promise<ThumbnailGenerationResult> {
  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = options.quality ?? DEFAULT_QUALITY;
  const outputType = options.outputType ?? DEFAULT_OUTPUT_TYPE;

  if (typeof document === 'undefined') {
    return fallbackResult(file);
  }

  try {
    const imageBitmap = await loadImageBitmap(file);
    const dimensions = calculateThumbnailDimensions(imageBitmap.width, imageBitmap.height, maxDimension);

    const canvas = document.createElement('canvas');
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    const context = canvas.getContext('2d');
    if (!context) {
      imageBitmap.close();
      return fallbackResult(file);
    }

    context.drawImage(imageBitmap, 0, 0, dimensions.width, dimensions.height);
    imageBitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((value) => resolve(value), outputType, quality);
    });

    if (!blob) {
      return fallbackResult(file);
    }

    const thumbnailFile = buildThumbnailFile(file, blob, outputType);
    const dataUrl = canvas.toDataURL(outputType, quality);

    return {
      file: thumbnailFile,
      dataUrl,
      width: dimensions.width,
      height: dimensions.height,
    };
  } catch {
    return fallbackResult(file);
  }
}
