import { db, getPendingSyncItems, markSyncItemProcessing, markSyncItemFailed, markSyncItemSynced } from '@/lib/db/dexie';
import { createRemoteAssessment, type AssessmentPhotoMetadataInput } from '@/lib/services/assessmentSubmissionService';
import { validateFieldAssessment } from '@/lib/schemas/fieldAssessment';
import type { SafetyObservations } from '@/types';

let activeProcess: Promise<{ uploaded: number; failed: number }> | undefined;
async function processAssessments() {
  const { supabase } = await import('@/lib/supabase/client');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { uploaded: 0, failed: 0 };
  const contractor = await supabase.from('contractors').select('id').eq('profile_id', user.id).maybeSingle();
  if (contractor.error) throw contractor.error;
  if (!contractor.data) return { uploaded: 0, failed: 0 };
  let uploaded = 0, failed = 0;
  for (const item of await getPendingSyncItems()) {
    if (item.entity_type !== 'assessment' || item.status === 'processing') continue;
    const local = await db.assessments.get(item.entity_id);
    if (!local?.field_assessment || local.contractor_id !== contractor.data.id) continue;
    try {
      await markSyncItemProcessing(item.id);
      const remote = await createRemoteAssessment({
        id: local.id, ticketId: local.ticket_id, contractorId: local.contractor_id,
        fieldAssessment: validateFieldAssessment(local.field_assessment),
        photoMetadata: local.photo_metadata as AssessmentPhotoMetadataInput[],
        safetyObservations: local.safety_observations as SafetyObservations,
        damageClassification: { priority: local.priority as 'A' | 'C' }, equipmentItems: [],
      });
      await db.assessments.update(local.id, { ...remote, synced: true, sync_status: 'synced', last_error: undefined });
      await markSyncItemSynced(item.id); uploaded++;
    } catch (error) {
      const message = (error as { message?: string }).message ?? 'Assessment sync failed.';
      await db.assessments.update(local.id, { sync_status: 'failed', last_error: message });
      await markSyncItemFailed(item.id, message); failed++;
    }
  }
  return { uploaded, failed };
}
export const assessmentUploadQueue = {
  process() {
    if (!activeProcess) activeProcess = processAssessments().finally(() => { activeProcess = undefined; });
    return activeProcess;
  },
};
