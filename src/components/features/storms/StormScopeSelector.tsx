'use client';

import { useStormContext, COMPANY_STORM_SCOPE } from '@/components/providers/StormContextProvider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function StormScopeSelector() {
  const context = useStormContext();
  return <section className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3" aria-label="Dashboard storm context">
    <div><Label htmlFor="dashboard-storm-context">Dashboard scope</Label>
      <p className="mt-1 text-xs text-muted-foreground">{context.stormEventId ? 'Selected storm' : 'Company-wide · all storms'}</p></div>
    <Select value={context.selection} onValueChange={context.selectStorm}>
      <SelectTrigger id="dashboard-storm-context" className="w-full sm:w-80"><SelectValue placeholder="Choose a storm" /></SelectTrigger>
      <SelectContent><SelectItem value={COMPANY_STORM_SCOPE}>Company-wide · All Storms</SelectItem>
        {context.storms.map(storm => <SelectItem key={storm.id} value={storm.id}>{storm.name || storm.eventCode} · {storm.eventCode}</SelectItem>)}
      </SelectContent>
    </Select>
    {context.error && <div role="alert" className="flex w-full flex-wrap items-center gap-3 text-sm text-destructive">{context.error}<Button size="sm" variant="outline" onClick={() => void context.refresh()}>Retry</Button></div>}
  </section>;
}
