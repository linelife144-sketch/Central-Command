import { describe, expect, it } from 'vitest';

import { detectTicketOcrSourceType, validateTicketOcrIntakeFile } from './fileIntake';

describe('validateTicketOcrIntakeFile', () => {
  it('accepts supported mime types', () => {
    const result = validateTicketOcrIntakeFile({
      name: 'ticket.png',
      type: 'image/png',
      size: 1024,
    });

    expect(result).toBeNull();
  });

  it('accepts supported extensions when mime type is generic', () => {
    const result = validateTicketOcrIntakeFile({
      name: 'ticket.HEIC',
      type: 'application/octet-stream',
      size: 1024,
    });

    expect(result).toBeNull();
  });

  it('rejects unsupported file types', () => {
    const result = validateTicketOcrIntakeFile({
      name: 'ticket.docx',
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 1024,
    });

    expect(result).toContain('Unsupported file format');
  });

  it('rejects empty files', () => {
    const result = validateTicketOcrIntakeFile({
      name: 'ticket.pdf',
      type: 'application/pdf',
      size: 0,
    });

    expect(result).toContain('File is empty');
  });

  it('rejects oversized files', () => {
    const result = validateTicketOcrIntakeFile({
      name: 'ticket.pdf',
      type: 'application/pdf',
      size: 26 * 1024 * 1024,
    });

    expect(result).toContain('Maximum size is 25 MB');
  });
});

describe('detectTicketOcrSourceType', () => {
  it('marks PDFs as PDF_IMPORT', () => {
    const sourceType = detectTicketOcrSourceType({
      name: 'ticket.pdf',
      type: 'application/pdf',
    });

    expect(sourceType).toBe('PDF_IMPORT');
  });

  it('marks images as OCR_SCAN', () => {
    const sourceType = detectTicketOcrSourceType({
      name: 'ticket.jpeg',
      type: 'image/jpeg',
    });

    expect(sourceType).toBe('OCR_SCAN');
  });
});
