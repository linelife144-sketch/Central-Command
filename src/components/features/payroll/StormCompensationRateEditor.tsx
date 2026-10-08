'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { StormRoleRateFields } from '@/components/features/storms/StormRoleRateFields';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { parseStormRoleRates, type StormRoleRateDrafts } from '@/lib/compensation/stormRates';
import { stormCompensationService } from '@/lib/services/stormCompensationService';
import { getErrorMessage } from '@/lib/utils/errorHandling';
import type { ContractorRole } from '@/types';

interface StormCompensationRateEditorProps {
  stormEventId: string;
  canEdit?: boolean;
  isClosed?: boolean;
}

export function StormCompensationRateEditor({ stormEventId, canEdit = false, isClosed = false }: StormCompensationRateEditorProps) {
  const [rates, setRates] = useState<StormRoleRateDrafts>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void stormCompensationService.getRates(stormEventId)
      .then((result) => { if (active) setRates(result); })
      .catch((error: unknown) => { if (active) toast.error(getErrorMessage(error, 'Unable to load storm compensation rates.')); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [stormEventId]);

  async function saveRates() {
    if (!canEdit || isClosed) return;
    let parsedRates: ReturnType<typeof parseStormRoleRates>;
    try {
      parsedRates = parseStormRoleRates(rates);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Enter a wage and bill rate for every role.'));
      return;
    }

    setIsSaving(true);
    try {
      await stormCompensationService.saveRates(stormEventId, parsedRates);
      setRates(Object.fromEntries(Object.entries(parsedRates).map(([role, value]) => [role, {
        payRate: value.payRate.toFixed(2),
        billRate: value.billRate.toFixed(2),
      }])));
      toast.success('Storm compensation rates saved. New clock-ins will use these rates.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to save storm compensation rates.'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Storm compensation rates</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isClosed ? (
          <p className="text-sm text-muted-foreground">Closed storms retain their final rates and payroll history.</p>
        ) : (
          <p className="text-sm text-muted-foreground">Rate changes apply to future clock-ins. Open and completed shifts keep their saved rate snapshots.</p>
        )}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading storm rates…</p>
        ) : (
          <StormRoleRateFields
            rates={rates}
            disabled={!canEdit || isSaving || isClosed}
            onChange={(role: ContractorRole, value) => setRates((current) => ({ ...current, [role]: value }))}
          />
        )}
        <Button type="button" variant="storm" disabled={!canEdit || isLoading || isSaving || isClosed} onClick={() => void saveRates()}>
          {isSaving ? 'Saving rates…' : 'Save storm rates'}
        </Button>
      </CardContent>
    </Card>
  );
}
