import type { TicketTemplateKey } from '@/lib/tickets/templates';

import { extractEntergyFields } from './entergy';
import { stubUtilityExtractor } from './stubs';
import type { TicketOcrExtractionResult } from './types';

const EXTRACTORS: Record<TicketTemplateKey, (ocrText: string) => TicketOcrExtractionResult> = {
  ENTERGY_TROUBLE_TICKET_V1: extractEntergyFields,
  DUKE_TROUBLE_TICKET_V1: stubUtilityExtractor,
  CENTERPOINT_TROUBLE_TICKET_V1: stubUtilityExtractor,
  ONCOR_TROUBLE_TICKET_V1: stubUtilityExtractor,
  FPL_TROUBLE_TICKET_V1: stubUtilityExtractor,
  TECO_TROUBLE_TICKET_V1: stubUtilityExtractor,
};

export function runUtilityOcrExtraction(templateKey: TicketTemplateKey, ocrText: string): TicketOcrExtractionResult {
  return EXTRACTORS[templateKey](ocrText);
}
