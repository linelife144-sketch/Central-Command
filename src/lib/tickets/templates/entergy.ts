import { z } from 'zod';
import { DATE_TIME_LOCAL_24H_PATTERN, normalizeDateTimeLocal24 } from '@/lib/utils/dateTime';
import type { TicketTemplateDefinition } from './types';

const incidentTypes = ['LGTS', 'WIRD', 'XFMR', 'OTHER'] as const;

function normalizeOptionalString(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

const optionalMilitaryDateTimeSchema = z.preprocess(
  (value) => {
    const normalized = normalizeOptionalString(value);
    if (typeof normalized !== 'string') {
      return normalized;
    }

    const converted = normalizeDateTimeLocal24(normalized);
    return converted || normalized;
  },
  z
    .string()
    .regex(DATE_TIME_LOCAL_24H_PATTERN, 'Use 24-hour format (YYYY-MM-DDTHH:mm).')
    .optional(),
);

const optionalUppercaseSchema = z.preprocess(
  (value) => {
    const normalized = normalizeOptionalString(value);
    return typeof normalized === 'string' ? normalized.toUpperCase() : normalized;
  },
  z.string().optional(),
);

export const entergyPayloadSchema = z
  .object({
    incident_number: (z.string as any)({ required_error: 'Incident Number is required.' })
      .regex(/^\d{10}$/, 'Incident Number must be exactly 10 digits.'),
    incident_type: z.enum(incidentTypes),
    affected_customers: z.number().int().min(0).optional(),
    address_line: z.string().min(1),
    calls_count: z.number().int().min(0).optional(),
    calls_start_time: optionalMilitaryDateTimeSchema,
    ert: optionalMilitaryDateTimeSchema,
    duration_hours: z.number().int().min(0).optional(),
    device_name: z.string().optional(),
    device_type: z.string().optional(),
    device_type_raw: z.string().optional(),
    network: z.string().optional(),
    feeder: z.preprocess(
      (value) => {
        const normalized = normalizeOptionalString(value);
        return typeof normalized === 'string' ? normalized.toUpperCase() : normalized;
      },
      z
        .string()
        .regex(/^N\d{4}$/, 'Feeder must start with "N" and 4 digits (for example: N1234).')
        .optional(),
    ),
    local_office: optionalUppercaseSchema,
    substation: optionalUppercaseSchema,
    poles_down: z.number().int().min(0).optional(),
    transformers_down: z.number().int().min(0).optional(),
    conductor_span: z.number().int().min(0).optional(),
    services: z.number().int().min(0).optional(),
    cross_arms: z.number().int().min(0).optional(),
    tree_trim: z.number().int().min(0).optional(),
    dispatcher_comments: z.string().optional(),
    crew_comments: z.string().optional(),
    need_scout: z.boolean().optional(),
    first_customer_comment: z.string().optional(),
    ticket_generated_by: z.enum(['MANUAL', 'OCR', 'SMS', 'UNKNOWN']).default('UNKNOWN'),
  })
  .strict();

export const ENTERGY_TEMPLATE: TicketTemplateDefinition = {
  templateKey: 'ENTERGY_TROUBLE_TICKET_V1',
  utilityClient: 'ENTERGY',
  displayName: 'Entergy Trouble Ticket',
  schema: entergyPayloadSchema,
  payloadVersion: 1,
  defaultValues: {
    incident_number: '',
    incident_type: 'LGTS',
    address_line: '',
    ticket_generated_by: 'UNKNOWN',
  },
  fieldConfig: [
    {
      section: 'Header',
      fieldKey: 'incident_number',
      label: 'Incident Number',
      controlType: 'text',
      required: true,
      helpText: 'Exactly 10 digits.',
      formattingRules: { transform: 'digits_only', maxLength: 10, regex: /^\d{10}$/ },
    },
    { section: 'Header', fieldKey: 'incident_type', label: 'Incident Type', controlType: 'select', required: true, enumValues: [...incidentTypes] },
    { section: 'Header', fieldKey: 'affected_customers', label: 'Affected Customers', controlType: 'number', required: false },
    { section: 'Location', fieldKey: 'address_line', label: 'Address', controlType: 'text', required: true },
    { section: 'Timing', fieldKey: 'calls_count', label: 'Calls', controlType: 'number', required: false },
    {
      section: 'Timing',
      fieldKey: 'calls_start_time',
      label: 'Calls Start Time',
      controlType: 'datetime',
      required: false,
      helpText: 'Use 24-hour time.',
    },
    { section: 'Timing', fieldKey: 'ert', label: 'ERT', controlType: 'datetime', required: false, helpText: 'Use 24-hour time.' },
    { section: 'Timing', fieldKey: 'duration_hours', label: 'Duration (h)', controlType: 'number', required: false },
    { section: 'Asset / Device', fieldKey: 'device_name', label: 'Device Name', controlType: 'text', required: false },
    { section: 'Asset / Device', fieldKey: 'device_type', label: 'Device Type', controlType: 'text', required: false },
    { section: 'Circuit / Feeder / Grid', fieldKey: 'network', label: 'Network', controlType: 'text', required: false },
    {
      section: 'Circuit / Feeder / Grid',
      fieldKey: 'feeder',
      label: 'Feeder',
      controlType: 'text',
      required: false,
      helpText: 'Format: N + 4 digits.',
      formattingRules: { transform: 'uppercase', maxLength: 5, regex: /^N\d{4}$/ },
    },
    {
      section: 'Circuit / Feeder / Grid',
      fieldKey: 'local_office',
      label: 'Local Office',
      controlType: 'text',
      required: false,
      helpText: 'Stored as UPPERCASE.',
      formattingRules: { transform: 'uppercase' },
    },
    {
      section: 'Circuit / Feeder / Grid',
      fieldKey: 'substation',
      label: 'Substation',
      controlType: 'text',
      required: false,
      helpText: 'Stored as UPPERCASE.',
      formattingRules: { transform: 'uppercase' },
    },
    { section: 'Damage Assessment', fieldKey: 'poles_down', label: 'Poles Down', controlType: 'number', required: false },
    { section: 'Damage Assessment', fieldKey: 'transformers_down', label: 'Transformers Down', controlType: 'number', required: false },
    { section: 'Damage Assessment', fieldKey: 'conductor_span', label: 'Conductor Span', controlType: 'number', required: false },
    { section: 'Damage Assessment', fieldKey: 'services', label: 'Services', controlType: 'number', required: false },
    { section: 'Damage Assessment', fieldKey: 'cross_arms', label: 'Cross Arms', controlType: 'number', required: false },
    { section: 'Damage Assessment', fieldKey: 'tree_trim', label: 'Tree Trim', controlType: 'number', required: false },
    { section: 'Notes / Comments', fieldKey: 'dispatcher_comments', label: 'Dispatcher Comments', controlType: 'textarea', required: false },
    { section: 'Notes / Comments', fieldKey: 'crew_comments', label: 'Crew Comments', controlType: 'textarea', required: false },
    { section: 'Notes / Comments', fieldKey: 'need_scout', label: 'Need Scout', controlType: 'toggle', required: false },
    { section: 'Notes / Comments', fieldKey: 'first_customer_comment', label: 'First Customer Comment', controlType: 'textarea', required: false },
    { section: 'Work Routing / SLA', fieldKey: 'ticket_generated_by', label: 'Ticket Generated By', controlType: 'select', required: false, enumValues: ['MANUAL', 'OCR', 'SMS', 'UNKNOWN'] },
  ],
  ocrMapping: [
    { fieldKey: 'incident_number', anchors: ['Incident Number'], regex: /Incident\s*Number\s*:?\s*(\d{10})/i },
    { fieldKey: 'incident_type', anchors: ['Incident Type'], regex: /Incident\s*Type\s*:?\s*([A-Z]{2,8})/i },
    { fieldKey: 'address_line', anchors: ['Address'], regex: /Address\s*:?\s*([^\n]+)/i },
    { fieldKey: 'feeder', anchors: ['Feeder'], regex: /Feeder\s*:?\s*([A-Z0-9-]+)/i },
  ],
  getTicketNumber: (payload) => String(payload.incident_number ?? ''),
};
