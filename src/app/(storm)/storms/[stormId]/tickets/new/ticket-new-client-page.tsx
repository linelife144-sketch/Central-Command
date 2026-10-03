'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { TicketFormRenderer } from '@/components/features/tickets/TicketFormRenderer';
import { useAuth } from '@/components/providers/AuthProvider';
import { canPerformManagementAction } from '@/lib/auth/authorization';
import { runUtilityOcrExtraction } from '@/lib/tickets/ocr';
import {
  detectTicketOcrSourceType,
  type TicketOcrSourceType,
  validateTicketOcrIntakeFile,
} from '@/lib/tickets/ocr/fileIntake';
import { notifyTicketsChanged } from '@/lib/tickets/events';
import {
  getTicketTemplateByTemplateKey,
  getTicketTemplateByUtilityClient,
  normalizeUtilityClient,
  type TicketTemplateKey,
} from '@/lib/tickets/templates';
import { stormEventService } from '@/lib/services/stormEventService';
import { ticketIntakeService } from '@/lib/services/ticketIntakeService';
import { getErrorMessage } from '@/lib/utils/errorHandling';
import { toast } from 'sonner';

interface TicketNewClientPageProps {
  stormId: string;
}

export function TicketNewClientPage({ stormId }: TicketNewClientPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, permissions } = useAuth();
  const canCreate = canPerformManagementAction(profile?.role, 'ticket_entry_write', permissions);

  const [stormName, setStormName] = useState('');
  const [eventCode, setEventCode] = useState('');
  const [stormUtility, setStormUtility] = useState('Entergy');
  const [snapshotFields, setSnapshotFields] = useState<import('@/lib/tickets/templates').TicketTemplateFieldConfig[] | null>(null);
  const [stormTemplateKey, setStormTemplateKey] = useState<TicketTemplateKey | null>(null);
  const [stormState, setStormState] = useState('Unknown');
  const [ready, setReady] = useState(false);
  const [initialValues, setInitialValues] = useState<Record<string, unknown>>({ priority: ['A', 'B', 'C', 'X'].includes(searchParams.get('priority') ?? '') ? searchParams.get('priority') : 'C' });
  const [confidenceByField, setConfidenceByField] = useState<Record<string, number>>({});
  const [extractionWarnings, setExtractionWarnings] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExtractingOcr, setIsExtractingOcr] = useState(false);

  const applyOcrExtractionResult = (ocrText: string, sourceType: TicketOcrSourceType) => {
    const result = runUtilityOcrExtraction(template.templateKey, ocrText);
    setInitialValues((current) => ({
      ...current,
      ...result.payloadDraft,
      source_type: sourceType,
      raw_ocr_text: ocrText,
    }));
    setConfidenceByField(result.confidenceByField);
    setExtractionWarnings(result.warnings);
  };

  useEffect(() => {
    void stormEventService
      .getStormEventById(stormId)
      .then((stormEvent) => {
        if (!stormEvent) {
          toast.error('Storm event not found.');
          router.replace('/admin/storms');
          return;
        }

        setStormName(stormEvent.name);
        setEventCode(stormEvent.eventCode);
        setStormUtility(stormEvent.utilityClient);
        setStormTemplateKey(stormEvent.ticketTemplateKey as TicketTemplateKey | null);
        setSnapshotFields((stormEvent.configSnapshot?.field_definitions as import('@/lib/tickets/templates').TicketTemplateFieldConfig[] | undefined) ?? null);
        setStormState(stormEvent.region ?? 'Unknown');
        setReady(true);
      })
      .catch((error) => {
        toast.error(getErrorMessage(error, 'Failed to load storm event.'));
        router.replace('/admin/storms');
      });
  }, [router, stormId]);

  const template = useMemo(() => {
    if (stormTemplateKey) {
      const definition = getTicketTemplateByTemplateKey(stormTemplateKey);
      return snapshotFields ? { ...definition, fieldConfig: snapshotFields } : definition;
    }
    const utility = normalizeUtilityClient(stormUtility);
    return getTicketTemplateByUtilityClient(utility);
  }, [stormTemplateKey, stormUtility, snapshotFields]);

  if (!canCreate) {
    return <div className="storm-surface rounded-xl border-[rgba(255,192,56,0.75)] p-4 text-sm text-blue-100 shadow-[0_12px_28px_rgba(0,20,80,0.3)]">Only authorized users can create tickets.</div>;
  }

  if (!ready) {
    return <div className="storm-surface rounded-xl border-[rgba(255,192,56,0.75)] p-4 text-sm text-blue-100 shadow-[0_12px_28px_rgba(0,20,80,0.3)]">Loading storm details...</div>;
  }

  return (
    <div className="storm-surface mx-auto max-w-5xl space-y-6 rounded-2xl border-[rgba(255,192,56,0.78)] p-4 shadow-[0_16px_36px_rgba(0,18,74,0.35)] sm:p-5">
      <h1 className="text-2xl font-semibold text-blue-50">Create Ticket</h1>
      <div className="rounded-xl border-[rgba(255,192,56,0.75)] bg-white p-4 shadow-[0_12px_28px_rgba(0,20,80,0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(0,18,72,0.38)]">
        <TicketFormRenderer
          storm={{ id: stormId, name: stormName, utilityClient: stormUtility, state: stormState, eventCode }}
          template={template}
          initialValues={initialValues}
          confidenceByField={confidenceByField}
          extractionWarnings={extractionWarnings}
          isSubmitting={isSubmitting}
          isExtractingOcr={isExtractingOcr}
          onRunOcr={(ocrText) => {
            const normalizedOcrText = ocrText.trim();
            if (normalizedOcrText.length === 0) {
              toast.error('Paste OCR text first, or upload a ticket file.');
              return;
            }

            applyOcrExtractionResult(normalizedOcrText, 'OCR_SCAN');
            toast.success('OCR text extracted. Review fields before saving.');
          }}
          onRunOcrFromFile={async (file) => {
            const validationError = validateTicketOcrIntakeFile(file);
            if (validationError) {
              toast.error(validationError);
              return;
            }

            try {
              setIsExtractingOcr(true);

              const formData = new FormData();
              formData.set('file', file, file.name);
              formData.set('templateKey', template.templateKey);

              const response = await fetch('/api/tickets/ocr-extract', {
                method: 'POST',
                body: formData,
              });

              const body = await response.json().catch(() => ({} as Record<string, unknown>));
              if (!response.ok) {
                const apiError = typeof body.error === 'string' ? body.error : 'Failed to run OCR extraction.';
                throw new Error(apiError);
              }

              const ocrText = typeof body.ocrText === 'string' ? body.ocrText.trim() : '';
              if (ocrText.length === 0) {
                throw new Error('OCR model returned no text.');
              }

              applyOcrExtractionResult(ocrText, detectTicketOcrSourceType(file));
              toast.success('File processed. Review extracted fields before saving.');
            } catch (error) {
              toast.error(getErrorMessage(error, 'Failed to extract text from file.'));
            } finally {
              setIsExtractingOcr(false);
            }
          }}
          onSubmitTicket={async (values) => {
            try {
              setIsSubmitting(true);
              const payloadInput = Object.fromEntries(
                template.fieldConfig.map((field) => [field.fieldKey, values[field.fieldKey]]),
              );
              const parsedPayload = template.schema.parse(payloadInput);

              const rawOcrText = typeof values.raw_ocr_text === 'string' ? values.raw_ocr_text : undefined;
              const sourceFileId = typeof values.source_file_id === 'string' && values.source_file_id.length > 0
                ? values.source_file_id
                : undefined;

              await ticketIntakeService.createUtilityTicket({
                stormEventId: stormId,
                stormUtilityClient: stormUtility,
                template,
                common: {
                  status: (typeof values.status === 'string' ? values.status : 'DRAFT') as 'DRAFT' | 'ASSIGNED' | 'IN_PROGRESS' | 'PENDING_REVIEW' | 'APPROVED' | 'CLOSED',
                  priority: (typeof values.priority === 'string' ? values.priority : 'C') as 'A' | 'B' | 'C' | 'X',
                  source_type: (typeof values.source_type === 'string' ? values.source_type : 'MANUAL') as 'MANUAL' | 'OCR_SCAN' | 'PDF_IMPORT' | 'CSV_IMPORT' | 'API',
                  raw_ocr_text: rawOcrText,
                  source_file_id: sourceFileId,
                },
                payload: parsedPayload as Record<string, unknown>,
                extractionConfidence: confidenceByField,
                extractionWarnings,
              });

              toast.success('Ticket created successfully.');

              if (typeof window !== 'undefined') {
                window.localStorage.setItem('active_storm_event_id', stormId);
              }

              notifyTicketsChanged();
              router.push(`/admin/storms/${stormId}`);
              router.refresh();
            } catch (error) {
              toast.error(getErrorMessage(error, 'Failed to create ticket.'));
            } finally {
              setIsSubmitting(false);
            }
          }}
        />
      </div>
    </div>
  );
}
