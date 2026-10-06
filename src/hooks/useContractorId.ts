'use client';

import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase/client';
import { getErrorLogContext, isAuthOrPermissionError } from '@/lib/utils/errorHandling';

interface UseContractorIdResult {
  contractorId: string | undefined;
  isLoading: boolean;
}

export function useContractorId(profileId?: string): UseContractorIdResult {
  const [resolved, setResolved] = useState<{ profileId?: string; id?: string }>({});
  const contractorId = resolved.profileId === profileId ? resolved.id : undefined;
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!profileId) {
      return;
    }

    let active = true;

    const resolveContractorId = async () => {
      setIsLoading(true);
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
          if (active) {
            setResolved({ profileId, id: undefined });
          }
          return;
        }

        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          const { db } = await import('@/lib/db/dexie');
          const cached = await db.contractorIdentities.get(profileId) ?? await db.payAgreements.where('viewer_profile_id').equals(profileId).first();
          if (active) setResolved({ profileId, id: cached?.contractor_id });
          return;
        }

        // Use a bounded list query instead of maybeSingle to tolerate legacy duplicate rows.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from('contractors') as any)
          .select('id')
          .eq('profile_id', profileId)
          .limit(1);


        if (error) {
          throw error;
        }

        if (active) {
          const resolvedId = Array.isArray(data) && data.length > 0 ? (data[0]?.id as string | undefined) : undefined;
          if(resolvedId){const {db}=await import('@/lib/db/dexie');await db.contractorIdentities.put({profile_id:profileId,contractor_id:resolvedId});}
          setResolved({ profileId, id: resolvedId });
        }
      } catch (error) {
        if (!isAuthOrPermissionError(error)) {
          console.warn('Failed to resolve contractor ID:', getErrorLogContext(error));
        }
        if (active) {
          setResolved({ profileId, id: undefined });
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void Promise.resolve().then(resolveContractorId);

    return () => {
      active = false;
    };
  }, [profileId]);

  return { contractorId, isLoading: !!profileId && isLoading };
}
