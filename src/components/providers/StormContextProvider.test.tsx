import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ actor: 'manager-a', allowed: true, list: vi.fn(), refreshResult: vi.fn() }));
vi.mock('./AuthProvider', () => ({ useAuth: () => ({ profile: { id: mocks.actor }, can: () => mocks.allowed }) }));
vi.mock('@/lib/services/stormEventService', () => ({ stormEventService: { listStormEvents: mocks.list } }));
import { StormContextProvider, useStormContext } from './StormContextProvider';

const storms = [{ id: 'storm-a', name: 'Alpha' }, { id: 'storm-b', name: 'Bravo' }];
let capturedContext: ReturnType<typeof useStormContext>;
function Consumer() {
  const context = useStormContext();
  React.useEffect(() => { capturedContext = context; }, [context]);
  return <><div data-testid="scope">{context.ready ? context.stormEventId ?? 'company' : 'pending'}</div>
    <div role="status">{context.error}</div>
    <button onClick={() => context.selectStorm('storm-a')}>Alpha</button>
    <button onClick={() => context.selectStorm('storm-b')}>Bravo</button>
    <button onClick={() => context.selectStorm('ALL')}>Company</button>
    <button onClick={() => void context.refresh({ selectStormId: 'storm-new' }).then(mocks.refreshResult)}>Adopt created</button>
    <button onClick={() => void context.refresh().then(mocks.refreshResult)}>Refresh</button></>;
}
const view = () => <StormContextProvider><Consumer /></StormContextProvider>;
beforeEach(() => { sessionStorage.clear(); mocks.actor = 'manager-a'; mocks.allowed = true; mocks.list.mockReset().mockResolvedValue(storms); mocks.refreshResult.mockReset(); });
afterEach(cleanup);

describe('management storm context', () => {
  it('adopts a newly created storm only after verifying it in the refreshed permitted list', async () => {
    render(view());
    await waitFor(() => expect(screen.getByTestId('scope').textContent).toBe('company'));
    mocks.list.mockResolvedValueOnce([...storms, { id: 'storm-new', name: 'New' }]);
    fireEvent.click(screen.getByText('Adopt created'));
    await waitFor(() => expect(screen.getByTestId('scope').textContent).toBe('storm-new'));
    expect(sessionStorage.getItem('cc-storm-context:manager-a')).toBe('storm-new');
    expect(mocks.refreshResult).toHaveBeenCalledWith(true);
  });
  it('does not select or persist a created storm missing from the permitted readback', async () => {
    render(view());
    await waitFor(() => expect(screen.getByTestId('scope').textContent).toBe('company'));
    fireEvent.click(screen.getByText('Adopt created'));
    await waitFor(() => expect(mocks.refreshResult).toHaveBeenCalledWith(false));
    expect(screen.getByTestId('scope').textContent).toBe('pending');
    expect(sessionStorage.getItem('cc-storm-context:manager-a')).not.toBe('storm-new');
    fireEvent.click(screen.getByText('Refresh'));
    await waitFor(() => expect(mocks.refreshResult).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('scope').textContent).toBe('pending');
  });
  it('keeps failed reads unavailable even when company mode is selected', async () => {
    render(view());
    await waitFor(() => expect(screen.getByTestId('scope').textContent).toBe('company'));
    mocks.list.mockRejectedValueOnce(new Error('Denied'));
    fireEvent.click(screen.getByText('Refresh'));
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/unable to load/i));
    fireEvent.click(screen.getByText('Company'));
    expect(screen.getByTestId('scope').textContent).toBe('pending');
    expect(mocks.refreshResult).toHaveBeenCalledWith(false);
  });
  it('preserves a newer explicit selection over delayed creation adoption', async () => {
    render(view());
    await waitFor(() => expect(screen.getByTestId('scope').textContent).toBe('company'));
    let resolve!: (value: typeof storms) => void;
    mocks.list.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    fireEvent.click(screen.getByText('Adopt created'));
    fireEvent.click(screen.getByText('Bravo'));
    await act(async () => resolve([...storms, { id: 'storm-new', name: 'New' }]));
    expect(screen.getByTestId('scope').textContent).toBe('storm-b');
    expect(sessionStorage.getItem('cc-storm-context:manager-a')).toBe('storm-b');
  });
  it('preserves a newer choice but does not verify a missing created storm', async () => {
    render(view());
    await waitFor(() => expect(screen.getByTestId('scope').textContent).toBe('company'));
    let resolve!: (value: typeof storms) => void;
    mocks.list.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    fireEvent.click(screen.getByText('Adopt created'));
    fireEvent.click(screen.getByText('Bravo'));
    await act(async () => resolve(storms));
    expect(screen.getByTestId('scope').textContent).toBe('storm-b');
    expect(sessionStorage.getItem('cc-storm-context:manager-a')).toBe('storm-b');
    expect(mocks.refreshResult).toHaveBeenCalledWith(false);
  });
  it('rejects a retained former-actor callback invoked after account switch', async () => {
    const mounted = render(view());
    await waitFor(() => expect(screen.getByTestId('scope').textContent).toBe('company'));
    const old = capturedContext;
    mocks.actor = 'manager-b'; mounted.rerender(view());
    await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(2));
    mocks.list.mockResolvedValueOnce([...storms, { id: 'storm-new', name: 'New' }]);
    let verified: boolean | undefined;
    await act(async () => { verified = await old.refresh({ selectStormId: 'storm-new' }); old.selectStorm('storm-a'); });
    expect(verified).toBe(false);
    expect(mocks.list).toHaveBeenCalledTimes(2);
    expect(sessionStorage.getItem('cc-storm-context:manager-a')).toBe('ALL');
  });
  it('does not persist a former actor created-storm adoption after account switch', async () => {
    const mounted = render(view());
    await waitFor(() => expect(screen.getByTestId('scope').textContent).toBe('company'));
    let resolve!: (value: typeof storms) => void;
    mocks.list.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    fireEvent.click(screen.getByText('Adopt created'));
    mocks.actor = 'manager-b'; mounted.rerender(view());
    await act(async () => resolve([...storms, { id: 'storm-new', name: 'New' }]));
    await waitFor(() => expect(screen.getByTestId('scope').textContent).toBe('company'));
    expect(mocks.refreshResult).toHaveBeenCalledWith(false);
    expect(sessionStorage.getItem('cc-storm-context:manager-a')).not.toBe('storm-new');
  });
  it('keeps explicit company mode until selected and restores selection across route remounts', async () => {
    const mounted = render(view());
    await waitFor(() => expect(screen.getByTestId('scope').textContent).toBe('company'));
    fireEvent.click(screen.getByText('Bravo'));
    expect(screen.getByTestId('scope').textContent).toBe('storm-b');
    mounted.unmount();
    render(view());
    await waitFor(() => expect(screen.getByTestId('scope').textContent).toBe('storm-b'));
  });

  it('does not expose the previous actor selection while the next actor loads', async () => {
    const mounted = render(view());
    await waitFor(() => expect(screen.getByTestId('scope').textContent).toBe('company'));
    fireEvent.click(screen.getByText('Alpha'));
    let resolve!: (value: typeof storms) => void;
    mocks.list.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    mocks.actor = 'manager-b';
    mounted.rerender(view());
    expect(screen.getByTestId('scope').textContent).toBe('pending');
    await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(2));
    await act(async () => resolve(storms));
    expect(screen.getByTestId('scope').textContent).toBe('company');
  });

  it('blocks a disappeared storm rather than substituting company-wide totals', async () => {
    const mounted = render(view());
    await waitFor(() => expect(screen.getByTestId('scope').textContent).toBe('company'));
    fireEvent.click(screen.getByText('Alpha'));
    mounted.unmount();
    mocks.list.mockResolvedValue([storms[1]]);
    render(view());
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/no longer available/i));
    expect(screen.getByTestId('scope').textContent).toBe('pending');
    fireEvent.click(screen.getByText('Company'));
    expect(screen.getByTestId('scope').textContent).toBe('company');
  });

  it('does not read management storms for a contractor and ignores a late former actor response', async () => {
    let resolve!: (value: typeof storms) => void;
    mocks.list.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const mounted = render(view());
    await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(1));
    mocks.actor = 'contractor'; mocks.allowed = false;
    mounted.rerender(view());
    await act(async () => resolve(storms));
    expect(mocks.list).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('scope').textContent).toBe('pending');
  });
});
