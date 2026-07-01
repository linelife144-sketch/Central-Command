interface OcrRecognitionResult {
  data?: {
    text?: string;
  };
}

type OcrRecognizer = (
  image: File | Blob,
  langs?: string,
  options?: {
    logger?: (message: unknown) => void;
  },
) => Promise<OcrRecognitionResult>;

interface ReceiptOcrDependencies {
  recognize: (file: File | Blob) => Promise<string | undefined>;
}

export interface ReceiptOcrService {
  extractText: (file: File | Blob) => Promise<string | undefined>;
}

async function loadRecognizer(): Promise<OcrRecognizer | null> {
  try {
    const tesseractModule = await import('tesseract.js');

    const recognize =
      (tesseractModule as unknown as { recognize?: OcrRecognizer }).recognize ??
      (tesseractModule as unknown as { default?: { recognize?: OcrRecognizer } }).default?.recognize;

    return recognize ?? null;
  } catch {
    return null;
  }
}

async function defaultRecognize(file: File | Blob): Promise<string | undefined> {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const recognize = await loadRecognizer();
  if (!recognize) {
    return undefined;
  }

  try {
    const result = await recognize(file, 'eng', {
      logger: () => {
        // Intentionally silent; OCR progress can be surfaced later if needed.
      },
    });

    const text = result.data?.text?.trim();
    return text || undefined;
  } catch {
    return undefined;
  }
}

const defaultDependencies: ReceiptOcrDependencies = {
  recognize: defaultRecognize,
};

export function createReceiptOcrService(
  overrides: Partial<ReceiptOcrDependencies> = {},
): ReceiptOcrService {
  const dependencies: ReceiptOcrDependencies = {
    ...defaultDependencies,
    ...overrides,
  };

  return {
    async extractText(file: File | Blob): Promise<string | undefined> {
      if (!file) {
        return undefined;
      }

      const text = await dependencies.recognize(file);
      const normalizedText = text?.trim();
      return normalizedText || undefined;
    },
  };
}

export const receiptOcrService = createReceiptOcrService();
