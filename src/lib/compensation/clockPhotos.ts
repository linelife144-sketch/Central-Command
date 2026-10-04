import { validatePhotoFile } from '@/lib/utils/validators';
export function clockPhotoPath(contractorId: string, entryId: string, kind: 'in' | 'out') {
  return `${contractorId}/time-entries/${entryId}/clock-${kind}`;
}
export async function uploadClockPhoto(contractorId: string, entryId: string, kind: 'in' | 'out', file: Blob) {
  const { supabase } = await import('@/lib/supabase/client');
  const validation = validatePhotoFile(file as File, 10, ['image/jpeg', 'image/png', 'image/webp']);
  if (!validation.valid) throw new Error(validation.error);
  const path = clockPhotoPath(contractorId, entryId, kind);
  const { error } = await supabase.storage.from('time-entry-photos').upload(path, file, { upsert: false, contentType: file.type });
  if (error && !('statusCode' in error && String(error.statusCode) === '409')) throw Object.assign(error, { code: 'CLOCK_PHOTO_UPLOAD' });
  return path;
}
