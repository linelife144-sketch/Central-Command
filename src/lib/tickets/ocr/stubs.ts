import type { TicketOcrExtractor } from './types';

export const stubUtilityExtractor: TicketOcrExtractor = () => ({
  payloadDraft: {},
  confidenceByField: {},
  warnings: ['Extractor not implemented for this utility yet.'],
});
