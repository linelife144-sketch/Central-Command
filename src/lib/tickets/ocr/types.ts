import type { TicketTemplateKey } from '@/lib/tickets/templates';

export interface TicketOcrExtractionResult {
  payloadDraft: Record<string, unknown>;
  confidenceByField: Record<string, number>;
  warnings: string[];
}

export type TicketOcrExtractor = (ocrText: string) => TicketOcrExtractionResult;

export interface TicketOcrRequest {
  templateKey: TicketTemplateKey;
  ocrText: string;
}
