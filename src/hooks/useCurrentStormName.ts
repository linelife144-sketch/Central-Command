'use client';

import { useEffect, useState } from 'react';

import { useContractorId } from '@/hooks/useContractorId';
import { loadCurrentStormName } from '@/lib/storms/currentStormName';

export function useCurrentStormName(portal: 'admin' | 'contractor', profileId?: string): string | null {
  const { contractorId } = useContractorId(portal === 'contractor' ? profileId : undefined);
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void loadCurrentStormName(portal, contractorId)
      .then(next => { if (active) setName(next); })
      .catch(() => { if (active) setName(null); });
    return () => { active = false; };
  }, [portal, contractorId]);

  return name;
}
