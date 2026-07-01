'use client';

import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase/client';
import { getErrorLogContext, isAuthOrPermissionError, isMissingDatabaseObjectError } from '@/lib/utils/errorHandling';

interface UseContractorIdResult {
  contractorId: string | undefined;
  isLoading: boolean;
}

export function useContractorId(profileId?: string): UseContractorIdResult {
  const [contractorId, setContractorId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!profileId) {
      setContractorId(undefined);
      setIsLoading(false);
      return;
    }

    let active = true;

    const resolveContractorId = async () => {
      setIsLoading(true);
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
          if (active) {
            setContractorId(profileId);
          }
          return;
        }

        // Use a bounded list query instead of maybeSingle to tolerate legacy duplicate rows.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let { data, error } = await (supabase.from('contractors') as any)
          .select('id')
          .eq('profile_id', profileId)
          .limit(1);

        if (error && isMissingDatabaseObjectError(error)) {
          // Fallback for pre-migration schema.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const legacyResult = await (supabase.from('subcontractors') as any)
            .select('id')
            .eq('profile_id', profileId)
            .limit(1);
          data = legacyResult.data;
          error = legacyResult.error;
        }

        if (error) {
          throw error;
        }

        if (active) {
          const resolvedId = Array.isArray(data) && data.length > 0 ? (data[0]?.id as string | undefined) : undefined;
          setContractorId(resolvedId ?? profileId);
        }
      } catch (error) {
        if (!isAuthOrPermissionError(error)) {
          console.warn('Failed to resolve contractor ID:', getErrorLogContext(error));
        }
        if (active) {
          setContractorId(profileId);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void resolveContractorId();

    return () => {
      active = false;
    };
  }, [profileId]);

  return { contractorId, isLoading };
}
