export type TicketWorkNoteKind = 'NOTE' | 'ENVIRONMENTAL' | 'PUBLIC_SAFETY';
export const ticketWorkNoteLabels: Record<TicketWorkNoteKind, string> = {
  NOTE: 'Field note', ENVIRONMENTAL: 'Environmental escalation', PUBLIC_SAFETY: 'Public safety escalation',
};
