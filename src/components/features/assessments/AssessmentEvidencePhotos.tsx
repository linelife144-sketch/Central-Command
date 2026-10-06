'use client';
import { useEffect, useState } from 'react';
import { db } from '@/lib/db/dexie';
import type { AssessmentPhotoEvidence } from '@/lib/schemas/fieldAssessment';

export function AssessmentEvidencePhotos({ ticketId, evidence }: { ticketId: string; evidence: AssessmentPhotoEvidence[] }) {
  const [photos, setPhotos] = useState<Array<{ id: string; url: string }>>([]);
  const [error, setError] = useState('');
  const evidenceIds = evidence.map(photo => photo.id).join(',');
  useEffect(() => {
    let active = true;
    const urls: string[] = [];
    void (async () => {
      try {
        const { supabase } = await import('@/lib/supabase/client');
        const ids = evidenceIds.split(',').filter(Boolean);
        const { data: sessionData } = await supabase.auth.getSession();
        const actor = sessionData.session?.user.id;
        const local = await db.photos.bulkGet(ids);
        if (actor && local.every(p=>p?.entity_id===ticketId && p.actor_profile_id===actor)) {
          const images=local.map(p=>{const url=URL.createObjectURL(p!.file);urls.push(url);return {id:p!.id,url};});
          if(active){setPhotos(images);setError('');}return;
        }
        const { data, error } = await supabase.from('media_assets').select('id, storage_bucket, storage_path').eq('entity_type', 'ticket').eq('entity_id', ticketId).in('id', ids).eq('upload_status', 'COMPLETED');
        if (error) throw error;
        if ((data ?? []).length !== ids.length) throw new Error('Photo upload is pending. Sync this ticket to view all evidence.');
        const images = [];
        for (const media of data ?? []) {
          const result = await supabase.storage.from(media.storage_bucket).download(media.storage_path);
          if (result.error || !result.data) throw new Error('Unable to load photo evidence.');
          const url = URL.createObjectURL(result.data); urls.push(url); images.push({ id: media.id, url });
        }
        if (active) { setPhotos(images); setError(''); }
      } catch (error) { if (active) setError(error instanceof Error ? error.message : 'Photo evidence is unavailable.'); }
      finally { if (!active) urls.forEach(url => URL.revokeObjectURL(url)); }
    })();
    return () => { active = false; urls.forEach(url => URL.revokeObjectURL(url)); };
  }, [ticketId, evidenceIds]);
  /* Original evidence is displayed without an optimization proxy. */
  /* eslint-disable @next/next/no-img-element */
  return <div className="mt-3">{error ? <p role="status" className="text-sm text-muted-foreground">{error}</p> : !photos.length ? <p className="text-sm text-muted-foreground">Loading photo evidence…</p> : <div className="grid gap-3 sm:grid-cols-2">{photos.map(photo => <a key={photo.id} href={photo.url} target="_blank" rel="noopener noreferrer" aria-label="Open damage evidence photo"><img src={photo.url} alt="Attached assessment evidence" className="max-h-64 w-full rounded-lg border object-contain" /></a>)}</div>}</div>;
}
