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
  const role = await getCurrentProfileRole();
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

    const normalizedUtilityClient: UtilityClient = normalizeUtilityClient(input.stormUtilityClient);
    if (normalizedUtilityClient !== input.template.utilityClient) {
      throw new Error('Template utility does not match storm utility client.');
    }

    const validatedPayload = input.template.schema.parse(input.payload) as Record<string, unknown>;
    const ticketNumber = input.template.getTicketNumber(validatedPayload);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: ticketRow, error: ticketError } = await (supabase.from('tickets') as any)
      .insert({
        storm_event_id: input.stormEventId,
        ticket_number: ticketNumber,
        utility_client: input.stormUtilityClient.trim(),
        template_key: input.template.templateKey,
        status: input.common.status,
        priority: input.common.priority,
        source_type: input.common.source_type,
        source_file_id: input.common.source_file_id ?? null,
        raw_ocr_text: input.common.raw_ocr_text ?? null,
        work_description: `${input.template.displayName} - ${ticketNumber}`,
        address: typeof validatedPayload.address_line === 'string' ? validatedPayload.address_line : 'Unknown',
        city: 'Unknown',
        state: 'NA',
        zip_code: '00000',
      })
      .select('id')
      .single();

    if (ticketError) {
      throw ticketError;
    }

    const created = ticketRow as TicketInsertResult;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: payloadError } = await (supabase.from('ticket_payloads') as any).upsert({
      ticket_id: created.id,
      payload: validatedPayload,
      payload_version: input.template.payloadVersion,
      extraction_confidence: input.extractionConfidence ?? {},
      extraction_warnings: input.extractionWarnings ?? [],
    });

    if (payloadError) {
      throw payloadError;
    }

    return { id: created.id };
  },
};
