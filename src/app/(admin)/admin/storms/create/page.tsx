'use client';

import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

import { PageHeader } from '@/components/common/layout/PageHeader';
import { useAuth } from '@/components/providers/AuthProvider';
import { useStormContext } from '@/components/providers/StormContextProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { canPerformManagementAction } from '@/lib/auth/authorization';
import { parseStormRoleRates, type StormRoleRateDrafts } from '@/lib/compensation/stormRates';
import { UTILITY_CLIENTS } from '@/lib/constants/utilityClients';
import { StormRoleRateFields } from '@/components/features/storms/StormRoleRateFields';
import { StormManagerField } from '@/components/features/storms/StormManagerControl';
import { stormEventService } from '@/lib/services/stormEventService';
import { getErrorMessage } from '@/lib/utils/errorHandling';
import { toast } from 'sonner';

const STATE_NAMES = [
  'Alabama',
  'Alaska',
  'Arizona',
  'Arkansas',
  'California',
  'Colorado',
  'Connecticut',
  'Delaware',
  'Florida',
  'Georgia',
  'Hawaii',
  'Idaho',
  'Illinois',
  'Indiana',
  'Iowa',
  'Kansas',
  'Kentucky',
  'Louisiana',
  'Maine',
  'Maryland',
  'Massachusetts',
  'Michigan',
  'Minnesota',
  'Mississippi',
  'Missouri',
  'Montana',
  'Nebraska',
  'Nevada',
  'New Hampshire',
  'New Jersey',
  'New Mexico',
  'New York',
  'North Carolina',
  'North Dakota',
  'Ohio',
  'Oklahoma',
  'Oregon',
  'Pennsylvania',
  'Rhode Island',
  'South Carolina',
  'South Dakota',
  'Tennessee',
  'Texas',
  'Utah',
  'Vermont',
  'Virginia',
  'Washington',
  'West Virginia',
  'Wisconsin',
  'Wyoming',
] as const;

const UTILITY_CLIENT_OPTIONS = [
  ...UTILITY_CLIENTS.filter((client) => client === 'Entergy'),
  ...UTILITY_CLIENTS.filter((client) => client !== 'Entergy'),
];

export default function CreateStormEventPage() {
  const { profile } = useAuth();
  return <CreateStormEventForm key={profile?.id ?? 'anonymous'} />;
}

function CreateStormEventForm() {
  const router = useRouter();
  const { profile, isLoading, permissions } = useAuth();
  const stormContext = useStormContext();
  const canCreateStormEvent = canPerformManagementAction(profile?.role, 'storm_event_write', permissions)
    && permissions['admin.payroll.edit'];
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eventCode, setEventCode] = useState('');
  const [name, setName] = useState('');
  const [utilityClient, setUtilityClient] = useState<string>('Entergy');
  const [region, setRegion] = useState('');
  const [notes, setNotes] = useState('');
  const [roleRates, setRoleRates] = useState<StormRoleRateDrafts>({});
  const [responsibleManagerId, setResponsibleManagerId] = useState('');
  const [managerReady, setManagerReady] = useState(false);
  const [savedStormId, setSavedStormId] = useState<string>();
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  async function openWithContext(stormId: string) {
    const verified = await stormContext.refresh({ selectStormId: stormId }).catch(() => false);
    if (!active.current) return;
    if (verified) {
      router.push(`/admin/storms/${stormId}`);
      router.refresh();
    }
  }

  async function retryContext() {
    if (!savedStormId) return;
    setIsSubmitting(true);
    try { await openWithContext(savedStormId); }
    finally { if (active.current) setIsSubmitting(false); }
  }

  useEffect(() => {
    if (!isLoading && !canCreateStormEvent) {
      router.replace('/forbidden');
    }
  }, [canCreateStormEvent, isLoading, router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error('Storm event name is required.');
      return;
    }

    if (!utilityClient.trim()) {
      toast.error('Utility client is required.');
      return;
    }

    if (!managerReady || !responsibleManagerId) {
      toast.error('Select an available responsible Storm Manager.');
      return;
    }

    let parsedRoleRates: ReturnType<typeof parseStormRoleRates>;
    try {
      parsedRoleRates = parseStormRoleRates(roleRates);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Enter a wage and bill rate for every role.'));
      return;
    }

    setIsSubmitting(true);
    try {
      const createdEvent = await stormEventService.createStormEvent({
        eventCode,
        name: trimmedName,
        utilityClient,
        region,
        notes,
        roleRates: parsedRoleRates,
        responsibleManagerId,
      });

      if (!active.current) return;
      setSavedStormId(createdEvent.id);

      if (typeof window !== 'undefined') {
        // Compatibility for the old TicketForm consumer until B5d replaces it.
        try { window.localStorage.setItem('active_storm_event_id', createdEvent.id); } catch { /* The storm is already saved. */ }
      }

      toast.success('Storm event created. Add contractors or create tickets for this event.');
      await openWithContext(createdEvent.id);
    } catch (error) {
      if (active.current) toast.error(getErrorMessage(error, 'Failed to create storm event.'));
    } finally {
      if (active.current) setIsSubmitting(false);
    }
  }

  if (isLoading || !canCreateStormEvent) {
    return <div className="storm-surface rounded-xl p-4 text-sm text-grid-muted">Checking access...</div>;
  }

  if (savedStormId) return (
    <Card className="mx-auto max-w-3xl cc-work-panel"><CardContent className="space-y-4 pt-6" role="alert">
      <p>Storm event saved. {isSubmitting ? 'Verifying dashboard context…' : 'Dashboard context could not be verified. Retry the context read or open the saved storm.'}</p>
      <div className="flex flex-wrap gap-3">
        <Button disabled={isSubmitting} onClick={() => void retryContext()}>Retry dashboard context</Button>
        <Button variant="outline" disabled={isSubmitting} onClick={() => router.push(`/admin/storms/${savedStormId}`)}>Open saved storm</Button>
      </div>
    </CardContent></Card>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Create Storm Event"
        description="Start a response workspace for tickets, contractor crews, time, and assessments."
        backHref="/admin/storms"
      />

      <Card className="cc-work-panel">
        <CardContent className="pt-6">
          <form className="space-y-6" onSubmit={onSubmit}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="storm-event-name">Storm Event Name *</Label>
                <Input
                  id="storm-event-name"
                  value={name}
                  onChange={(nextEvent) => setName(nextEvent.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="storm-event-code">Storm Event Code</Label>
                <Input
                  id="storm-event-code"
                  value={eventCode}
                  onChange={(nextEvent) => setEventCode(nextEvent.target.value)}
                  placeholder="Auto-generated if blank"
                />
              </div>

              <div className="space-y-2">
                <Label>Utility Client *</Label>
                <Select value={utilityClient} onValueChange={setUtilityClient}>
                  <SelectTrigger className="storm-contrast-field">
                    <SelectValue placeholder="Select utility client" />
                  </SelectTrigger>
                  <SelectContent>
                    {UTILITY_CLIENT_OPTIONS.map((client) => (
                      <SelectItem key={client} value={client}>
                        {client}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>State</Label>
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger className="storm-contrast-field" id="storm-event-region">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATE_NAMES.map((stateName) => (
                      <SelectItem key={stateName} value={stateName}>
                        {stateName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <StormManagerField key={profile?.id} value={responsibleManagerId} onChange={setResponsibleManagerId} onReadyChange={setManagerReady} disabled={isSubmitting} />

            <StormRoleRateFields
              rates={roleRates}
              onChange={(role, value) => setRoleRates((current) => ({ ...current, [role]: value }))}
            />

            <div className="space-y-2">
              <Label htmlFor="storm-event-notes">Notes</Label>
              <Textarea
                id="storm-event-notes"
                value={notes}
                onChange={(nextEvent) => setNotes(nextEvent.target.value)}
                placeholder="Negotiated terms, billing notes, utility contacts, and kickoff details."
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting || !managerReady} variant="storm">
                <Plus className="mr-2 h-4 w-4" />
                {isSubmitting ? 'Creating Storm Event...' : 'Create Storm Event'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
