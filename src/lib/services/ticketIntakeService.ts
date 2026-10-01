import { isSuperAdminTestingEnabled, SUPER_ADMIN_TEST_PROFILE } from '@/lib/testing/superAdminTesting';
import { localTestStore } from '@/lib/testing/localTestStore';
import { stormEventService } from './stormEventService';
import { commonTicketCreateSchema, getTicketTemplateByUtilityClient, getTicketTemplateByTemplateKey, type TicketTemplateKey } from '@/lib/tickets/templates';
import { supabase } from '@/lib/supabase/client';
import { canPerformManagementAction, type ManagementAction } from '@/lib/auth/authorization';
import type { UserRole } from '@/types';
import type { UtilityClient, TicketTemplateDefinition } from '@/lib/tickets/templates';
import type { CommonTicketCreateInput } from '@/lib/tickets/templates';
import { normalizeUtilityClient } from '@/lib/tickets/templates';

interface TicketInsertResult {
  id: string;
}

async function getCurrentProfileRole(): Promise<UserRole | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('profiles') as any).select('role').eq('id', user.id).single();
  return (data?.role as UserRole | undefined) ?? null;
}

async function assertAllowed(action: ManagementAction): Promise<void> {
  const role = isSuperAdminTestingEnabled() ? SUPER_ADMIN_TEST_PROFILE.role : await getCurrentProfileRole();
  if (!canPerformManagementAction(role, action)) {
    throw new Error('You do not have permission to create tickets.');
  }
}

export interface CreateUtilityTicketInput {
  stormEventId: string;
  stormUtilityClient: string;
  template: TicketTemplateDefinition;
  common: CommonTicketCreateInput;
  payload: Record<string, unknown>;
  extractionConfidence?: Record<string, number>;
  extractionWarnings?: string[];
}

export const ticketIntakeService = {
  async createUtilityTicket(input: CreateUtilityTicketInput): Promise<{ id: string }> {
    await assertAllowed('ticket_entry_write');

    const storm = await stormEventService.getStormEventById(input.stormEventId);
    if (!storm) throw new Error('Create or select an existing storm event first.');
    const normalizedUtilityClient = normalizeUtilityClient(storm.utilityClient);
    const expectedTemplate = storm.ticketTemplateKey ? getTicketTemplateByTemplateKey(storm.ticketTemplateKey as TicketTemplateKey) : getTicketTemplateByUtilityClient(normalizedUtilityClient);
    if (normalizeUtilityClient(input.stormUtilityClient) !== normalizedUtilityClient || input.template.templateKey !== (storm.ticketTemplateKey ?? expectedTemplate.templateKey)) {
      throw new Error('Ticket utility and template must match the parent storm.');
    }
    const common = commonTicketCreateSchema.parse(input.common);

    const validatedPayload = expectedTemplate.schema.parse(input.payload) as Record<string, unknown>;
    const ticketNumber = expectedTemplate.getTicketNumber(validatedPayload);

    if (isSuperAdminTestingEnabled()) {
      const ticket = localTestStore.createTicket({
        storm_event_id: storm.id, ticket_number: ticketNumber, utility_client: storm.utilityClient,
        status: common.status, priority: common.priority, address: String(validatedPayload.address_line),
        work_description: `${input.template.displayName} - ${ticketNumber}`,
      }, validatedPayload);
      return { id: ticket.id };
    }
    const { data, error } = await supabase.rpc('create_storm_ticket' as never, {
      p_storm_id: storm.id, p_common: common, p_payload: validatedPayload,
      p_confidence: input.extractionConfidence ?? {}, p_warnings: input.extractionWarnings ?? [],
    } as never);
    if (error) throw error;
    return { id: data as string };
  },
};
