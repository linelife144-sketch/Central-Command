'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Eye, LockKeyhole, Save, Search, ShieldCheck, SlidersHorizontal, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { PageHeader } from '@/components/common/layout/PageHeader';
import { useAuth } from '@/components/providers/AuthProvider';
import { PERMISSION_MODULES, resolvePermissions, roleDefault, type PermissionKey, type PermissionMap, type PermissionOverrides } from '@/lib/auth/permissionCatalog';

interface StaffUser { id: string; first_name: string; last_name: string; email: string; role: string; is_active: boolean; }
interface Settings { profile: StaffUser; overrides: PermissionOverrides; permissions: PermissionMap; version: string | null; }
async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', ...options });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? 'Unable to complete this request.');
  return result;
}
function nameOf(person: StaffUser) { return `${person.first_name} ${person.last_name}`.trim() || person.email; }

export function UserAccessDirectory() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<'staff' | 'all'>('staff');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { profile } = useAuth();
  const load = async () => {
    setLoading(true); setError('');
    try { setUsers((await requestJson<{ users: StaffUser[] }>('/api/admin/users')).users); }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to load users.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const staff = users.filter(user => user.role !== 'CONTRACTOR');
  const visible = users.filter(user => (scope === 'all' || user.role !== 'CONTRACTOR') && `${nameOf(user)} ${user.email} ${user.role}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-6">
    <PageHeader title="People & access" description="Give each person the workspace they need." />
    <section className="rounded-3xl bg-gradient-to-br from-grid-navy to-grid-blue p-6 text-white shadow-lg sm:p-8">
      <div className="flex items-start justify-between gap-5"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-grid-lightning">Access control</p><h2 className="mt-3 [font-family:var(--font-barlow),sans-serif] text-3xl text-white sm:text-4xl">One person. The right permissions.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">Control what staff can see and change, module by module. Contractor portal access stays fixed.</p></div><ShieldCheck className="hidden size-12 shrink-0 text-grid-lightning sm:block" /></div>
      <div className="mt-6 flex flex-wrap gap-6 border-t border-white/15 pt-5"><div><strong className="[font-family:var(--font-barlow),sans-serif] text-3xl">{loading || error ? '—' : staff.length}</strong><span className="ml-2 text-sm text-blue-100">staff accounts</span></div><div><strong className="[font-family:var(--font-barlow),sans-serif] text-3xl">{PERMISSION_MODULES.length}</strong><span className="ml-2 text-sm text-blue-100">permission modules</span></div></div>
    </section>
    <section className="cc-work-panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4 sm:p-5"><div className="relative min-w-0 flex-1 sm:max-w-md"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-grid-body" /><Input aria-label="Search people" placeholder="Search name, email, or role…" className="pl-10" value={search} onChange={event => setSearch(event.target.value)} /></div><div className="flex rounded-xl bg-grid-shell p-1"><Button variant={scope === 'staff' ? 'default' : 'ghost'} size="sm" onClick={() => setScope('staff')}>Staff</Button><Button variant={scope === 'all' ? 'default' : 'ghost'} size="sm" onClick={() => setScope('all')}>All accounts</Button></div></div>
      {loading ? <p role="status" className="p-8 text-grid-body">Loading people…</p> : error ? <div role="alert" className="p-6 text-grid-danger-ink">{error}<Button className="ml-3" variant="outline" onClick={load}>Retry</Button></div> : <div className="divide-y">{visible.map(person => {
        const editable = ['ADMIN', 'SUPER_ADMIN'].includes(person.role) && person.id !== profile?.id;
        return <div key={person.id} className="flex flex-wrap items-center gap-4 p-4 transition-colors hover:bg-grid-shell/60 sm:p-5"><div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-grid-storm-100 font-semibold text-grid-navy">{person.first_name?.slice(0,1)}{person.last_name?.slice(0,1)}</div><div className="min-w-0 flex-1"><p className="font-semibold text-grid-navy">{nameOf(person)} {person.id === profile?.id && <span className="text-xs font-normal text-grid-body">(you)</span>}</p><p className="break-all text-sm text-grid-body">{person.email}</p></div><div className="text-right"><p className="text-xs font-semibold text-grid-navy">{person.role==='ADMIN'?'Team lead (Admin)':person.role==='SUPER_ADMIN'?'Storm manager (Super Admin)':person.role.replaceAll('_',' ')}</p><span className={`text-xs ${person.is_active ? 'text-emerald-700' : 'text-grid-body'}`}>{person.is_active ? 'Active' : 'Inactive'}</span></div><Button asChild variant="outline" className="w-full sm:w-auto"><Link href={`/admin/users/${person.id}/permissions`}>{editable ? <SlidersHorizontal className="size-4" /> : <Eye className="size-4" />}{editable ? 'Set permissions' : 'View access'}<ArrowRight className="size-4" /></Link></Button></div>;
      })}{visible.length === 0 && <p className="p-8 text-center text-grid-body">No people match this search.</p>}</div>}
    </section>
  </div>;
}

export function UserPermissionEditor({ userId }: { userId: string }) {
  const { profile: actor, can } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [draft, setDraft] = useState<PermissionOverrides>({});
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const load = async () => {
    setError('');
    try { const result = await requestJson<Settings>(`/api/admin/users/${userId}/permissions`); setSettings(result); setDraft(result.overrides); }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to load permissions.'); }
  };
  useEffect(() => { void load(); }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = !!settings && JSON.stringify(draft) !== JSON.stringify(settings.overrides);
  useEffect(() => {
    const prevent = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [dirty]);
  if (!settings) return <div role={error ? 'alert' : 'status'} className="cc-work-panel p-6">{error || 'Loading permissions…'}{error && <Button className="ml-3" onClick={load}>Retry</Button>}</div>;
  const person = settings.profile;
  const locked = person.id === actor?.id || !['ADMIN','SUPER_ADMIN'].includes(person.role) || !can('admin.users.edit');
  const effective = resolvePermissions(person.role, draft, person.is_active);
  const toggle = (key: PermissionKey, enabled: boolean) => {
    setSaved(false); setError('');
    setDraft(previous => {
      const next = { ...previous, [key]: enabled ? 'allow' as const : 'deny' as const };
      if (key.endsWith('.view') && !enabled && PERMISSION_MODULES.find(module => `admin.${module.id}.view` === key)?.editable) next[key.replace(/\.view$/, '.edit') as PermissionKey] = 'deny';
      return next;
    });
  };
  const save = async () => {
    setSaving(true); setError(''); setSaved(false);
    try { const result = await requestJson<Settings>(`/api/admin/users/${userId}/permissions`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ overrides: draft, version: settings.version }) }); setSettings(result); setDraft(result.overrides); setSaved(true); }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to save.'); }
    finally { setSaving(false); }
  };
  return <div className="space-y-6">
    <PageHeader title="Individual permissions" description={`Set access for ${nameOf(person)}.`} showBackButton backHref="/admin/users" />
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-5">
        <section className="cc-work-panel flex flex-wrap items-center gap-4 p-5 sm:p-6"><div className="flex size-12 items-center justify-center rounded-2xl bg-grid-navy text-grid-lightning"><Users className="size-6" /></div><div className="min-w-0 flex-1"><h2 className="text-xl font-semibold text-grid-navy">{nameOf(person)}</h2><p className="break-all text-sm text-grid-body">{person.email}</p></div><span className="rounded-full bg-grid-shell px-3 py-1.5 text-xs font-semibold text-grid-navy">{person.role==='ADMIN'?'Team lead (Admin)':person.role==='SUPER_ADMIN'?'Storm manager (Super Admin)':person.role.replaceAll('_',' ')}</span></section>
        {locked && <div className="flex gap-3 rounded-2xl border border-grid-storm-100 bg-grid-storm-100/60 p-4 text-sm text-grid-navy"><LockKeyhole className="size-5 shrink-0" /><p>{person.role === 'CONTRACTOR' ? 'Contractor portal permissions are fixed and cannot be changed here.' : person.id === actor?.id ? 'Your own permissions are protected. Another Super Admin must make changes.' : 'This account is protected or your access is view only.'}</p></div>}
        {person.role !== 'CONTRACTOR' && [...new Set(PERMISSION_MODULES.map(module => module.group))].map(group => <section key={group} className="cc-work-panel overflow-hidden"><div className="flex items-center justify-between gap-4 border-b bg-grid-shell/60 px-5 py-4"><h3 className="font-semibold text-grid-navy">{group}</h3><div className="flex gap-7 text-xs font-semibold uppercase tracking-wide text-grid-body"><span className="w-11 text-center">View</span><span className="w-11 text-center">Edit</span></div></div><div className="divide-y">{PERMISSION_MODULES.filter(module => module.group === group).map(module => {
          const view: PermissionKey = `admin.${module.id}.view`; const edit: PermissionKey = `admin.${module.id}.edit`;
          const privileged = module.id === 'users' && person.role !== 'SUPER_ADMIN' || person.role === 'ADMIN' && !['tickets','assessments'].includes(module.id);
          return <div key={module.id} className="flex items-start gap-3 px-4 py-5 sm:px-5"><div className="min-w-0 flex-1"><h4 className="font-semibold text-grid-navy">{module.label}</h4><p className="mt-1 max-w-lg text-xs leading-5 text-grid-body sm:text-sm">{module.description}</p><p className="mt-2 text-[11px] font-medium text-grid-body">Role default: {roleDefault(person.role, view) ? 'View' : 'Hidden'}{module.editable && ` · ${roleDefault(person.role, edit) ? 'Edit' : 'Read only'}`}{(draft[view] || draft[edit]) && <span className="ml-2 text-grid-blue">• Custom access</span>}</p>{(draft[view] || draft[edit]) && !locked && <button className="mt-1 text-xs font-semibold text-grid-blue underline underline-offset-4" onClick={() => setDraft(previous => { const next = {...previous}; delete next[view]; delete next[edit]; return next; })} disabled={saving}>Use role default</button>}</div><div className="flex gap-7 pt-1"><div className="flex w-11 justify-center"><Switch aria-label={`View ${module.label}`} checked={!!effective[view]} disabled={locked || saving || privileged || !person.is_active} onCheckedChange={enabled => toggle(view, enabled)} /></div><div className="flex w-11 justify-center">{module.editable ? <Switch aria-label={`Edit ${module.label}`} checked={!!effective[edit]} disabled={locked || saving || privileged || !effective[view]} onCheckedChange={enabled => toggle(edit, enabled)} /> : <span aria-label="No edit actions" className="text-grid-body">—</span>}</div></div></div>;
        })}</div></section>)}
      </div>
      <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start"><div className="rounded-3xl bg-gradient-to-br from-grid-navy to-grid-blue p-6 text-white shadow-lg"><ShieldCheck className="size-7 text-grid-lightning" /><h3 className="mt-4 [font-family:var(--font-barlow),sans-serif] text-2xl text-white">Access summary</h3><p className="mt-3 text-sm text-blue-100">{PERMISSION_MODULES.filter(module => effective[`admin.${module.id}.view`]).length} of {PERMISSION_MODULES.length} modules visible</p><p className="mt-2 text-sm text-blue-100">{Object.keys(draft).length} explicit overrides</p><div className="mt-5 border-t border-white/15 pt-4 text-xs leading-5 text-blue-100">Account self-service is always available. Edit requires View. Saved restrictions also apply to direct links and database requests.</div></div><div className="cc-work-panel p-5"><p className="mb-4 text-sm text-grid-body">{dirty ? 'You have unsaved changes.' : 'These are the saved permissions.'}</p><Button className="w-full" disabled={locked || saving || !dirty} onClick={save}><Save className="size-4" />{saving ? 'Saving…' : 'Save permissions'}</Button><Button className="mt-2 w-full" variant="outline" disabled={locked || saving || !dirty} onClick={() => {setDraft(settings.overrides); setError('');}}>Discard changes</Button>{!locked && <Button className="mt-2 w-full" variant="ghost" disabled={saving} onClick={() => {setDraft({}); setSaved(false);}}>Reset to role defaults</Button>}{saved && <p role="status" className="mt-4 flex gap-2 text-sm text-emerald-700"><Check className="size-4" />Permissions saved.</p>}{error && <div role="alert" className="mt-4 text-sm text-grid-danger-ink">{error}<button className="mt-2 block font-semibold underline" onClick={load}>Reload saved permissions</button></div>}</div></aside>
    </div>
  </div>;
}
