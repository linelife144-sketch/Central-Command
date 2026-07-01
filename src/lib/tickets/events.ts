export const GRID_TICKETS_CHANGED_EVENT = 'grid:tickets-changed';
export const GRID_TICKETS_VERSION_KEY = 'grid_tickets_version';

export function notifyTicketsChanged(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(GRID_TICKETS_VERSION_KEY, String(Date.now()));
  window.dispatchEvent(new CustomEvent(GRID_TICKETS_CHANGED_EVENT));
}
