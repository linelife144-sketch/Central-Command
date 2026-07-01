import { CENTERPOINT_TEMPLATE } from './centerpoint';
import { DUKE_TEMPLATE } from './duke';
import { ENTERGY_TEMPLATE } from './entergy';
import { FPL_TEMPLATE } from './fpl';
import { ONCOR_TEMPLATE } from './oncor';
import { TECO_TEMPLATE } from './teco';
import type { TicketTemplateDefinition, TicketTemplateKey, UtilityClient } from './types';

export const TICKET_TEMPLATE_REGISTRY: Record<UtilityClient, TicketTemplateDefinition> = {
  ENTERGY: ENTERGY_TEMPLATE,
  DUKE: DUKE_TEMPLATE,
  CENTERPOINT: CENTERPOINT_TEMPLATE,
  ONCOR: ONCOR_TEMPLATE,
  FPL: FPL_TEMPLATE,
  TECO: TECO_TEMPLATE,
};

export function getTicketTemplateByUtilityClient(utilityClient: UtilityClient): TicketTemplateDefinition {
  return TICKET_TEMPLATE_REGISTRY[utilityClient];
}

const TICKET_TEMPLATE_KEY_REGISTRY: Record<TicketTemplateKey, TicketTemplateDefinition> = {
  ENTERGY_TROUBLE_TICKET_V1: ENTERGY_TEMPLATE,
  DUKE_TROUBLE_TICKET_V1: DUKE_TEMPLATE,
  CENTERPOINT_TROUBLE_TICKET_V1: CENTERPOINT_TEMPLATE,
  ONCOR_TROUBLE_TICKET_V1: ONCOR_TEMPLATE,
  FPL_TROUBLE_TICKET_V1: FPL_TEMPLATE,
  TECO_TROUBLE_TICKET_V1: TECO_TEMPLATE,
};

export function getTicketTemplateByTemplateKey(templateKey: TicketTemplateKey): TicketTemplateDefinition {
  return TICKET_TEMPLATE_KEY_REGISTRY[templateKey];
}
