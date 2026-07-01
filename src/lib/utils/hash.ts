interface HashSubtle {
  digest: (algorithm: string, data: BufferSource) => Promise<ArrayBuffer>;
}

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function getSubtleCrypto(): Promise<HashSubtle> {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    return globalThis.crypto.subtle as unknown as HashSubtle;
  }

  throw new Error('Web Crypto API is unavailable in this environment.');
}

function isArrayBuffer(value: unknown): value is ArrayBuffer {
  return Object.prototype.toString.call(value) === '[object ArrayBuffer]';
}

async function readBlobWithFileReader(input: Blob): Promise<ArrayBuffer> {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(reader.error ?? new Error('Failed to read blob.'));
    };

    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
        return;
      }

      reject(new TypeError('Unexpected FileReader result type.'));
    };

    reader.readAsArrayBuffer(input);
  });
}

async function toArrayBuffer(input: Blob | ArrayBuffer): Promise<ArrayBuffer> {
  if (isArrayBuffer(input)) {
    return input;
  }

  if (typeof input.arrayBuffer === 'function') {
    return input.arrayBuffer();
  }

  if (typeof FileReader !== 'undefined') {
    return readBlobWithFileReader(input);
  }

  const response = new Response(input);
  return response.arrayBuffer();
}

export async function calculateSHA256Hash(input: Blob | ArrayBuffer): Promise<string> {
  const subtle = await getSubtleCrypto();
  const buffer = await toArrayBuffer(input);
  const digest = await subtle.digest('SHA-256', buffer);
  return bufferToHex(digest);
}
