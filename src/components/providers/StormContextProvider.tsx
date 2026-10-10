'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from './AuthProvider';
import { stormEventService, type StormEventSummary } from '@/lib/services/stormEventService';

export const COMPANY_STORM_SCOPE = 'ALL';
const storageKey = (actorId: string) => `cc-storm-context:${actorId}`;

interface StormContextValue {
  selection: string;
  stormEventId: string | undefined;
  selectedStorm: StormEventSummary | undefined;
  storms: StormEventSummary[];
  ready: boolean;
  error: string | null;
  selectStorm: (selection: string) => void;
  refresh: (options?: { selectStormId?: string }) => Promise<boolean>;
}

// Standalone component previews retain their existing company-wide behavior.
// Application routes always receive the actor-owned provider from RootLayout.
const StormContext = createContext<StormContextValue>({
  selection: COMPANY_STORM_SCOPE, stormEventId: undefined, selectedStorm: undefined,
  storms: [], ready: true, error: null, selectStorm: () => {}, refresh: async () => false,
});

function readSelection(actorId: string): string {
  try { return sessionStorage.getItem(storageKey(actorId)) || COMPANY_STORM_SCOPE; }
  catch { return COMPANY_STORM_SCOPE; }
}

function ActorStormContext({ actorId, canReadStorms, children }: { actorId?: string; canReadStorms: boolean; children: ReactNode }) {
  const [state, setState] = useState(() => ({ selection: actorId ? readSelection(actorId) : COMPANY_STORM_SCOPE, storms: [] as StormEventSummary[], ready: false, verified: false, error: null as string | null }));
  const request = useRef(0);
  const alive = useRef(true);
  const selectionRef = useRef(state.selection);
  const selectionVersion = useRef(0);
  const cancelRequests = useCallback(() => { request.current++; }, []);
  const refresh = useCallback(async (options?: { selectStormId?: string }) => {
    if (!alive.current || !actorId || !canReadStorms) return false;
    const version = ++request.current;
    const observedSelection = selectionVersion.current;
    setState(current => ({ ...current, ready: false, verified: false, error: null }));
    try {
      const storms = await stormEventService.listStormEvents();
      if (!alive.current || version !== request.current) return false;
      const selection = observedSelection === selectionVersion.current && options?.selectStormId
        ? options.selectStormId : selectionRef.current;
      const valid = selection === COMPANY_STORM_SCOPE || storms.some(storm => storm.id === selection);
      selectionRef.current = selection;
      if (valid) {
        try { sessionStorage.setItem(storageKey(actorId), selection); } catch { /* Keep verified in-memory selection. */ }
      }
      setState({ selection, storms, verified: true, ready: valid, error: valid ? null : 'The selected storm is no longer available. Choose a storm or Company-wide.' });
      return valid && (!options?.selectStormId || storms.some(storm => storm.id === options.selectStormId));
    } catch {
      if (alive.current && version === request.current) setState(current => ({ ...current, ready: false, verified: false, error: 'Unable to load storm context. Retry to verify the selected storm.' }));
      return false;
    }
  }, [actorId, canReadStorms]);

  useEffect(() => {
    alive.current = true;
    let active = true;
    void Promise.resolve().then(() => { if (active) return refresh(); });
    return () => { active = false; alive.current = false; cancelRequests(); };
  }, [refresh, cancelRequests]);

  const selectStorm = useCallback((selection: string) => {
    if (!alive.current || !actorId || !canReadStorms || (selection !== COMPANY_STORM_SCOPE && !state.storms.some(storm => storm.id === selection))) return;
    selectionRef.current = selection;
    selectionVersion.current++;
    try { sessionStorage.setItem(storageKey(actorId), selection); } catch { /* Selection still works in memory when storage is unavailable. */ }
    setState(current => ({ ...current, selection, ready: current.verified, error: current.verified ? null : current.error }));
  }, [actorId, canReadStorms, state.storms]);

  const stormEventId = state.selection === COMPANY_STORM_SCOPE ? undefined : state.selection;
  return <StormContext.Provider value={{ ...state, ready: canReadStorms && state.ready, stormEventId,
    selectedStorm: state.storms.find(storm => storm.id === stormEventId), selectStorm, refresh }}>{children}</StormContext.Provider>;
}

export function StormContextProvider({ children }: { children: ReactNode }) {
  const { profile, can } = useAuth();
  return <ActorStormContext key={`${profile?.id ?? 'anonymous'}:${can('admin.storms.view')}`} actorId={profile?.id}
    canReadStorms={can('admin.storms.view')} >{children}</ActorStormContext>;
}

export const useStormContext = () => useContext(StormContext);
