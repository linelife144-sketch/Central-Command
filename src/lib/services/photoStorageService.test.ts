import { describe, expect, it, vi } from 'vitest';
import {
  buildPhotoStoragePath,
  sanitizeStorageSegment,
  uploadPhotoPipeline,
} from './photoStorageService';

function createFile(name: string, type = 'image/jpeg', size = 1024): File {
  return new File(['x'.repeat(Math.min(size, 128))], name, { type });
}

function createMockClient() {
  const upload = vi.fn().mockResolvedValue({ error: null });
  const getPublicUrl = vi.fn((path: string) => ({ data: { publicUrl: `https://cdn.example/${path}` } }));
  const insert = vi.fn().mockResolvedValue({ error: null });

  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      }),
    },
    storage: {
      from: vi.fn(() => ({
        upload,
        getPublicUrl,
      })),
    },
    from: vi.fn((table: string) => {
      if (table === 'contractors') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 'sub-1' },
                error: null,
              }),
            })),
          })),
        };
      }

      if (table === 'media_assets') {
        return {
          insert,
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  return {
    client,
    spies: {
      upload,
      getPublicUrl,
      insert,
    },
  };
}

describe('sanitizeStorageSegment', () => {
  it('replaces unsupported characters', () => {
    expect(sanitizeStorageSegment('abc/def ghi')).toBe('abc_def_ghi');
  });
});

describe('buildPhotoStoragePath', () => {
  it('builds deterministic storage paths', () => {
    const path = buildPhotoStoragePath({
      userId: 'user-1',
      ticketId: 'ticket-1',
      photoId: 'photo-1',
      variant: 'original',
      extension: 'jpg',
    });

    expect(path).toBe('user-1/tickets/ticket-1/photo-1-original.jpg');
  });
});

describe('uploadPhotoPipeline', () => {
  it('uploads original + thumbnail and writes media metadata', async () => {
    const { client, spies } = createMockClient();
    const originalFile = createFile('damage-photo.jpg');
    const thumbnailFile = createFile('damage-photo-thumb.jpg');

    const result = await uploadPhotoPipeline(
      {
        photoId: 'photo-1',
        ticketId: 'ticket-1',
        type: 'DAMAGE',
        file: originalFile,
        thumbnailFile,
        metadata: {
          gpsLatitude: 27.9506,
          gpsLongitude: -82.4572,
          capturedAt: '2026-02-12T10:15:00.000Z',
          deviceMake: 'Google',
          deviceModel: 'Pixel 9',
        },
      },
      client as never,
    );

    expect(spies.upload).toHaveBeenCalledTimes(2);
    expect(spies.insert).toHaveBeenCalledTimes(1);
    expect(result.storagePath).toContain('photo-1-original');
    expect(result.thumbnailPath).toContain('photo-1-thumbnail');
  });
});
