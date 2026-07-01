import { describe, expect, it, vi } from 'vitest';
import { createPhotoUploadQueue } from './photoUploadQueue';
import type { CapturedAssessmentPhoto } from '../../types';
import type { LocalPhoto } from '../db/dexie';

function createCapturedPhoto(): CapturedAssessmentPhoto {
  return {
    id: 'captured-1',
    ticketId: 'ticket-1',
    type: 'DAMAGE',
    file: new File(['photo-data'], 'damage.jpg', { type: 'image/jpeg' }),
    previewUrl: 'blob://preview',
    capturedAt: '2026-02-12T10:00:00.000Z',
    metadata: {
      gpsLatitude: 27.95,
      gpsLongitude: -82.45,
      capturedAt: '2026-02-12T10:00:00.000Z',
      deviceMake: 'Google',
      deviceModel: 'Pixel 9',
    },
    originalSizeBytes: 1024,
    sizeBytes: 800,
    compressed: true,
    checksumSha256: 'abc123',
    isDuplicate: false,
  };
}

function createLocalPhoto(id: string): LocalPhoto {
  return {
    id,
    file: new Blob(['photo-data'], { type: 'image/jpeg' }),
    preview: 'data:image/jpeg;base64,thumb',
    type: 'DAMAGE',
    entity_type: 'ticket',
    entity_id: 'ticket-1',
    gps_latitude: 27.95,
    gps_longitude: -82.45,
    captured_at: '2026-02-12T10:00:00.000Z',
    checksum: '',
    uploaded: false,
    upload_status: 'pending',
  };
}

describe('createPhotoUploadQueue', () => {
  it('adds captured photos to local queue with generated preview', async () => {
    const addLocalPhoto = vi.fn().mockResolvedValue('local-1');
    const queue = createPhotoUploadQueue({
      addLocalPhoto,
      getPendingLocalPhotos: vi.fn().mockResolvedValue([]),
      markLocalPhotoUploaded: vi.fn().mockResolvedValue(undefined),
      markLocalPhotoFailed: vi.fn().mockResolvedValue(undefined),
      uploadPhotoAsset: vi.fn(),
      generatePreview: vi.fn().mockResolvedValue('data:image/jpeg;base64,preview'),
      isOnline: () => true,
    });

    const id = await queue.add(createCapturedPhoto());
    expect(id).toBe('local-1');
    expect(addLocalPhoto).toHaveBeenCalledTimes(1);
    expect(addLocalPhoto.mock.calls[0][0].preview).toBe('data:image/jpeg;base64,preview');
  });

  it('processes pending photos and reports failures', async () => {
    const pendingPhotos = [createLocalPhoto('photo-1'), createLocalPhoto('photo-2')];
    const uploadPhotoAsset = vi
      .fn()
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('upload failed'));
    const markLocalPhotoUploaded = vi.fn().mockResolvedValue(undefined);
    const markLocalPhotoFailed = vi.fn().mockResolvedValue(undefined);

    const queue = createPhotoUploadQueue({
      addLocalPhoto: vi.fn(),
      getPendingLocalPhotos: vi.fn().mockResolvedValue(pendingPhotos),
      markLocalPhotoUploaded,
      markLocalPhotoFailed,
      uploadPhotoAsset,
      generatePreview: vi.fn().mockResolvedValue(''),
      isOnline: () => true,
    });

    const result = await queue.process();

    expect(result.processed).toBe(2);
    expect(result.uploaded).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(markLocalPhotoUploaded).toHaveBeenCalledWith('photo-1');
    expect(markLocalPhotoFailed).toHaveBeenCalledWith('photo-2');
  });

  it('returns pending count from local queue', async () => {
    const queue = createPhotoUploadQueue({
      addLocalPhoto: vi.fn(),
      getPendingLocalPhotos: vi.fn().mockResolvedValue([createLocalPhoto('photo-1')]),
      markLocalPhotoUploaded: vi.fn(),
      markLocalPhotoFailed: vi.fn(),
      uploadPhotoAsset: vi.fn(),
      generatePreview: vi.fn().mockResolvedValue(''),
      isOnline: () => true,
    });

    await expect(queue.getPendingCount()).resolves.toBe(1);
  });
});
