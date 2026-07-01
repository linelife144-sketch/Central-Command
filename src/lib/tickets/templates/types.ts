import { z } from 'zod';

export type UtilityClient = 'ENTERGY' | 'DUKE' | 'CENTERPOINT' | 'ONCOR' | 'FPL' | 'TECO';

export type TicketTemplateKey =
  | 'ENTERGY_TROUBLE_TICKET_V1'
  | 'DUKE_TROUBLE_TICKET_V1'
  | 'CENTERPOINT_TROUBLE_TICKET_V1'
  | 'ONCOR_TROUBLE_TICKET_V1'
  | 'FPL_TROUBLE_TICKET_V1'
  | 'TECO_TROUBLE_TICKET_V1';

export type TicketFormSection =
  | 'Header'
  | 'Location'
  | 'Timing'
  | 'Asset / Device'
  | 'Circuit / Feeder / Grid'
  | 'Damage Assessment'
  | 'Work Routing / SLA'
  | 'Notes / Comments'
  | 'Attachments / Source';

export type TicketFormControlType = 'text' | 'textarea' | 'select' | 'number' | 'datetime' | 'toggle';

export interface TicketTemplateFieldConfig {
  section: TicketFormSection;
  fieldKey: string;
  label: string;
  controlType: TicketFormControlType;
  required: boolean;
  enumValues?: string[];
  formattingRules?: {
    regex?: RegExp;
    transform?: 'uppercase' | 'trim' | 'digits_only';
    maxLength?: number;
  };
  helpText?: string;
}

export interface TicketTemplateOcrFieldMapping {
  fieldKey: string;
  anchors?: string[];
  regex?: RegExp;
  fallbackRegex?: RegExp;
  normalizer?: 'trim' | 'uppercase' | 'digits_only';
}

export interface TicketTemplateDefinition {
  templateKey: TicketTemplateKey;
  utilityClient: UtilityClient;
  displayName: string;
  schema: z.ZodTypeAny;
  payloadVersion: number;
  defaultValues: Record<string, unknown>;
  fieldConfig: TicketTemplateFieldConfig[];
  ocrMapping: TicketTemplateOcrFieldMapping[];
  getTicketNumber: (payload: Record<string, unknown>) => string;
}

export const COMMON_TICKET_STATUS = ['DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_REVIEW', 'APPROVED', 'CLOSED'] as const;
export const COMMON_TICKET_PRIORITY = ['A', 'B', 'C', 'X'] as const;
export const COMMON_SOURCE_TYPE = ['MANUAL', 'OCR_SCAN', 'PDF_IMPORT', 'CSV_IMPORT', 'API'] as const;

export const commonTicketCreateSchema = z.object({
  status: z.enum(COMMON_TICKET_STATUS),
  priority: z.enum(COMMON_TICKET_PRIORITY),
  source_type: z.enum(COMMON_SOURCE_TYPE),
  source_file_id: z.string().uuid().optional(),
  raw_ocr_text: z.string().optional(),
});

export type CommonTicketCreateInput = z.infer<typeof commonTicketCreateSchema>;
