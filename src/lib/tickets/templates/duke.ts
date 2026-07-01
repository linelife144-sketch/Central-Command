import { z } from 'zod';
import type { TicketTemplateDefinition } from './types';

export const dukePayloadSchema = z
  .object({
    external_ticket_id: z.string().min(1),
    ticket_type: z.string().min(1),
    address_line: z.string().min(1),
    device_or_asset_id: z.string().optional(),
    feeder_or_circuit_id: z.string().optional(),
    comments: z.string().optional(),
  })
  .strict();

export const DUKE_TEMPLATE: TicketTemplateDefinition = {
  templateKey: 'DUKE_TROUBLE_TICKET_V1',
  utilityClient: 'DUKE',
  displayName: 'Duke Trouble Ticket',
  schema: dukePayloadSchema,
  payloadVersion: 1,
  defaultValues: {
    external_ticket_id: '',
    ticket_type: '',
    address_line: '',
  },
  fieldConfig: [
    { section: 'Header', fieldKey: 'external_ticket_id', label: 'External Ticket ID', controlType: 'text', required: true },
    { section: 'Header', fieldKey: 'ticket_type', label: 'Ticket Type', controlType: 'text', required: true },
    { section: 'Location', fieldKey: 'address_line', label: 'Address', controlType: 'text', required: true },
    { section: 'Asset / Device', fieldKey: 'device_or_asset_id', label: 'Device / Asset ID', controlType: 'text', required: false },
    { section: 'Circuit / Feeder / Grid', fieldKey: 'feeder_or_circuit_id', label: 'Feeder / Circuit ID', controlType: 'text', required: false },
    { section: 'Notes / Comments', fieldKey: 'comments', label: 'Comments', controlType: 'textarea', required: false },
  ],
  ocrMapping: [],
  getTicketNumber: (payload) => String(payload.external_ticket_id ?? ''),
};
