'use client';

import { useEffect, useId, useState, type FormEvent } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { stormEventService, type StormManagerOption } from '@/lib/services/stormEventService';
import { getErrorMessage } from '@/lib/utils/errorHandling';

function useManagerOptions(stormId?: string) {
  const { profile } = useAuth();
  const source = `${profile?.id ?? ''}:${stormId ?? ''}`;
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ source: string; options: StormManagerOption[]; loading: boolean; error: string }>({ source: '', options: [], loading: true, error: '' });
  useEffect(() => {
    let alive = true;
    void Promise.resolve().then(async () => {
      if (!alive) return;
      setResult({ source, options: [], loading: true, error: '' });
      try {
        const options = await stormEventService.listStormManagers(stormId);
        if (alive) setResult({ source, options, loading: false, error: '' });
      } catch (error) {
        if (alive) setResult({ source, options: [], loading: false, error: getErrorMessage(error, 'Unable to read Storm Managers.') });
      }
    });
    return () => { alive = false; };
  }, [source, stormId, attempt]);
  return { ...(result.source === source ? result : { options: [], loading: true, error: '' }), retry: () => setAttempt(value => value + 1) };
}

export function StormManagerField({ value, onChange, onReadyChange, stormId, disabled = false }: {
  value: string;
  onChange: (value: string) => void;
  onReadyChange?: (ready: boolean) => void;
  stormId?: string;
  disabled?: boolean;
}) {
  const id = useId();
  const { options, loading, error, retry } = useManagerOptions(stormId);
  const ready = !loading && !error && options.some(option => option.id === value && option.eligible);
  useEffect(() => { onReadyChange?.(!!ready); }, [ready, onReadyChange]);
  return <div className="space-y-2">
    <Label htmlFor={id}>Responsible Storm Manager</Label>
    <select id={id} required className="storm-contrast-field h-10 w-full rounded-md border px-3 text-sm" value={value} disabled={disabled || loading || !!error} onChange={event => onChange(event.target.value)}>
      <option value="">Select a Storm Manager</option>
      {options.map(option => <option key={option.id} value={option.id} disabled={!option.eligible}>{option.displayName}{option.eligible ? '' : ' (unavailable for assignment)'}</option>)}
    </select>
    {loading && <p role="status" className="text-sm text-muted-foreground">Loading manager options…</p>}
    {error && <div role="alert" className="text-sm text-destructive">{error} <Button type="button" variant="outline" size="sm" onClick={retry}>Retry manager options</Button></div>}
    {!loading && !error && !options.some(option => option.eligible) && <p role="status" className="text-sm text-muted-foreground">No eligible Storm Manager is available. Complete management account setup before creating or assigning a storm.</p>}
  </div>;
}

function ManagerReadback({ stormId, managerId }: { stormId: string; managerId: string | null }) {
  const { options, loading, error, retry } = useManagerOptions(stormId);
  if (loading) return <p role="status">Loading manager…</p>;
  if (error) return <div role="alert">{error} <Button type="button" variant="outline" size="sm" onClick={retry}>Retry manager options</Button></div>;
  return <p>{managerId ? options.find(option => option.id === managerId)?.displayName ?? 'Assigned manager information is unavailable.' : 'Not configured for this existing storm.'}</p>;
}

export function StormManagerEditor({ stormId, managerId, canEdit, onSaved }: {
  stormId: string;
  managerId: string | null;
  canEdit: boolean;
  onSaved: () => Promise<void>;
}) {
  const [selected, setSelected] = useState(managerId ?? '');
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || selected === managerId || saving || saved) return;
    setSaving(true); setError(''); setSaved(false);
    try {
      await stormEventService.setStormManager(stormId, selected, managerId);
      setSaved(true);
      try { await onSaved(); } catch { setError('Responsible Storm Manager saved. Readback is unavailable. Retry to refresh the storm.'); }
    } catch (error) { setError(getErrorMessage(error, 'Unable to save the responsible Storm Manager.')); }
    finally { setSaving(false); }
  }
  return <section className="storm-surface space-y-3 rounded-xl p-6" aria-label="Storm management">
    <h2 className="text-xl font-semibold">Responsible Storm Manager</h2>
    {canEdit ? <form className="space-y-3" onSubmit={save}>
      <StormManagerField stormId={stormId} value={selected} onChange={value => { setSelected(value); setSaved(false); }} onReadyChange={setReady} disabled={saving || saved} />
      <Button type="submit" variant="storm" disabled={saving || saved || !ready || selected === managerId}>{saving ? 'Saving…' : 'Save manager'}</Button>
    </form> : <ManagerReadback stormId={stormId} managerId={managerId} />}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {saved && <p role="status">Responsible Storm Manager saved.</p>}
    {saved && error && <Button variant="outline" disabled={saving} onClick={async () => {
      setSaving(true);
      try { await onSaved(); setError(''); }
      catch { setError('Responsible Storm Manager saved. Readback is unavailable. Retry to refresh the storm.'); }
      finally { setSaving(false); }
    }}>Retry storm readback</Button>}
  </section>;
}
