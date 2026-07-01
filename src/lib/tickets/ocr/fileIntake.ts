export const TICKET_OCR_MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

export const TICKET_OCR_ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/heic',
  'image/heif',
] as const;

export const TICKET_OCR_ACCEPTED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.heic', '.heif'] as const;

export const TICKET_OCR_ACCEPT_ATTRIBUTE = [
  ...TICKET_OCR_ACCEPTED_MIME_TYPES,
  ...TICKET_OCR_ACCEPTED_EXTENSIONS,
].join(',');

export type TicketOcrSourceType = 'OCR_SCAN' | 'PDF_IMPORT';

function getNormalizedExtension(fileName: string): string | null {
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex === -1) {
    return null;
  }

  return fileName.slice(dotIndex).toLowerCase();
}

export function detectTicketOcrSourceType(file: Pick<File, 'name' | 'type'>): TicketOcrSourceType {
  const extension = getNormalizedExtension(file.name);
  const isPdf = file.type === 'application/pdf' || extension === '.pdf';
  return isPdf ? 'PDF_IMPORT' : 'OCR_SCAN';
}

export function validateTicketOcrIntakeFile(file: Pick<File, 'name' | 'type' | 'size'>): string | null {
  const normalizedMime = file.type.toLowerCase();
  const extension = getNormalizedExtension(file.name);

  const hasAllowedMime = TICKET_OCR_ACCEPTED_MIME_TYPES.includes(normalizedMime as (typeof TICKET_OCR_ACCEPTED_MIME_TYPES)[number]);
  const hasAllowedExtension = extension !== null
    && TICKET_OCR_ACCEPTED_EXTENSIONS.includes(extension as (typeof TICKET_OCR_ACCEPTED_EXTENSIONS)[number]);

  if (!hasAllowedMime && !hasAllowedExtension) {
    return 'Unsupported file format. Upload PDF, PNG, JPG, JPEG, HEIC, or HEIF.';
  }

  if (file.size <= 0) {
    return 'File is empty. Select a valid ticket image or PDF.';
  }

  if (file.size > TICKET_OCR_MAX_FILE_SIZE_BYTES) {
    return 'File is too large. Maximum size is 25 MB.';
  }

  return null;
}
