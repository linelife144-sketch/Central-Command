'use client';

import { type FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

import { PageHeader } from '@/components/common/layout/PageHeader';
import { useAuth } from '@/components/providers/AuthProvider';
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
import { UTILITY_CLIENTS } from '@/lib/constants/utilityClients';
import { stormEventService, type StormEventStatus } from '@/lib/services/stormEventService';
import { getErrorMessage } from '@/lib/utils/errorHandling';
import { toast } from 'sonner';

const STORM_EVENT_STATUS_OPTIONS: Array<{ value: StormEventStatus; label: string }> = [
  { value: 'MOB', label: 'MOB' },
  { value: 'ACTIVE', label: 'ACTIVE' },
  { value: 'DE-MOB', label: 'DE-MOB' },
  { value: 'RELEASED', label: 'RELEASED' },
  { value: 'BILLING', label: 'BILLING' },
  { value: 'CLOSED', label: 'CLOSED' },
];

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
  const router = useRouter();
  const { profile, isLoading } = useAuth();
  const canCreateStormEvent = canPerformManagementAction(profile?.role, 'storm_event_write');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eventCode, setEventCode] = useState('');
  const [name, setName] = useState('');
  const [utilityClient, setUtilityClient] = useState<string>('Entergy');
  const [status, setStatus] = useState<StormEventStatus>('MOB');
  const [region, setRegion] = useState('');
  const [notes, setNotes] = useState('');

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

    setIsSubmitting(true);
    try {
      const createdEvent = await stormEventService.createStormEvent({
        eventCode,
        name: trimmedName,
        utilityClient,
        status,
        region,
        notes,
      });

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('active_storm_event_id', createdEvent.id);
      }

      toast.success('Storm event created. Environment is now active on the dashboard.');
      router.push(`/admin/dashboard?storm_event_id=${encodeURIComponent(createdEvent.id)}`);
      router.refresh();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to create storm event.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading || !canCreateStormEvent) {
    return <div className="storm-surface rounded-xl p-4 text-sm text-grid-muted">Checking access...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Create Storm Event"
        description="Start a new storm event umbrella for tickets, contractors, time, expenses, and billing."
        backHref="/admin/storms"
      />

      <Card className="storm-surface">
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
                <Label>Status</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as StormEventStatus)}>
                  <SelectTrigger className="storm-contrast-field">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STORM_EVENT_STATUS_OPTIONS.map((stormEventStatus) => (
                      <SelectItem key={stormEventStatus.value} value={stormEventStatus.value}>
                        {stormEventStatus.label}
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
              <Button type="submit" disabled={isSubmitting} variant="storm">
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
