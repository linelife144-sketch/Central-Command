'use client';

import { useMemo, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { APP_CONFIG } from '@/lib/config/appConfig';
import {
  assessmentSubmissionService,
  type CreateAssessmentInput,
} from '@/lib/services/assessmentSubmissionService';
import { getMissingRequiredPhotoTypes } from '@/lib/utils/assessmentPhotos';
import type { CapturedAssessmentPhoto, DamageAssessment } from '@/types';

import {
  createDefaultDamageClassification,
  createDefaultSafetyObservations,
  createEmptyEquipmentAssessment,
} from './assessmentFormTypes';
import { DamageClassification } from './DamageClassification';
import { EquipmentAssessment } from './EquipmentAssessment';
import { PhotoCapture } from './PhotoCapture';
import { SafetyChecklist } from './SafetyChecklist';

interface AssessmentFormProps {
  ticketId?: string;
  contractorId?: string;
  onSaved?: (assessment: DamageAssessment) => void;
}

function parseOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return undefined;
  }

  return parsed;
}

function toHumanPhotoType(type: string): string {
  return type
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function validateAssessmentDraft(
  ticketId: string | undefined,
  contractorId: string | undefined,
  equipmentCount: number,
  invalidEquipmentCount: number,
  photos: CapturedAssessmentPhoto[],
): string | null {
  if (!ticketId) {
    return 'Ticket context is required before starting an assessment.';
  }

  if (!contractorId) {
    return 'Contractor profile is required. Please sign in again.';
  }

  if (equipmentCount === 0) {
    return 'Add at least one equipment assessment item.';
  }

  if (invalidEquipmentCount > 0) {
    return 'Each equipment item must include a selected equipment type.';
  }

  if (photos.length < APP_CONFIG.MIN_PHOTOS_REQUIRED) {
    return `Minimum ${APP_CONFIG.MIN_PHOTOS_REQUIRED} photos are required before submission.`;
  }

  const missingRequiredTypes = getMissingRequiredPhotoTypes(photos);
  if (missingRequiredTypes.length > 0) {
    return `Missing required photo types: ${missingRequiredTypes.map(toHumanPhotoType).join(', ')}.`;
  }

  return null;
}

export function AssessmentForm({ ticketId, contractorId, onSaved }: AssessmentFormProps) {
  const [safetyObservations, setSafetyObservations] = useState(() => createDefaultSafetyObservations());
  const [damageClassification, setDamageClassification] = useState(() => createDefaultDamageClassification());
  const [equipmentItems, setEquipmentItems] = useState(() => [createEmptyEquipmentAssessment()]);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedAssessmentPhoto[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const missingRequiredPhotoTypes = useMemo(
    () => getMissingRequiredPhotoTypes(capturedPhotos),
    [capturedPhotos],
  );

  const invalidEquipmentCount = useMemo(
    () => equipmentItems.filter((item) => !item.equipmentTypeId.trim()).length,
    [equipmentItems],
  );

  const handleSubmit = async () => {
    const validationError = validateAssessmentDraft(
      ticketId,
      contractorId,
      equipmentItems.length,
      invalidEquipmentCount,
      capturedPhotos,
    );

    if (validationError) {
      setFormError(validationError);
      toast.error(validationError);
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    const payload: CreateAssessmentInput = {
      ticketId: ticketId as string,
      contractorId: contractorId as string,
      assessedBy: contractorId,
      safetyObservations,
      damageClassification: {
        damageCause: damageClassification.damageCause || undefined,
        weatherConditions: damageClassification.weatherConditions || undefined,
        estimatedRepairHours: parseOptionalNumber(damageClassification.estimatedRepairHours),
        priority: damageClassification.priority,
        immediateActions: damageClassification.immediateActions || undefined,
        repairVsReplace: damageClassification.repairVsReplace,
        estimatedRepairCost: parseOptionalNumber(damageClassification.estimatedRepairCost),
      },
      equipmentItems: equipmentItems.map((item) => ({
        equipmentTypeId: item.equipmentTypeId || undefined,
        equipmentType: item.equipmentType,
        wireSizeCode: item.wireSizeCode || undefined,
        equipmentTag: item.equipmentTag || undefined,
        equipmentDescription: item.equipmentDescription || undefined,
        condition: item.condition,
        damageDescription: item.damageDescription || undefined,
        requiresReplacement: item.requiresReplacement,
      })),
      photoMetadata: capturedPhotos.map((photo) => ({
        id: photo.id,
        type: photo.type,
        previewUrl: photo.previewUrl,
        checksumSha256: photo.checksumSha256,
      })),
    };

    try {
      const createdAssessment = await assessmentSubmissionService.createAssessment(payload);
      const createdOffline = createdAssessment.sync_status === 'PENDING';

      toast.success(
        createdOffline
          ? 'Assessment saved offline and queued for sync.'
          : 'Assessment submitted successfully.',
      );
      onSaved?.(createdAssessment);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to submit assessment.';
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      {!ticketId ? (
        <Alert variant="destructive">
          <AlertDescription>
            No ticket selected. Open the assessment form from a ticket to continue.
          </AlertDescription>
        </Alert>
      ) : null}

      <SafetyChecklist
        value={safetyObservations}
        onChange={setSafetyObservations}
        disabled={isSubmitting}
      />

      <EquipmentAssessment
        value={equipmentItems}
        onChange={setEquipmentItems}
        disabled={isSubmitting}
      />

      <DamageClassification
        value={damageClassification}
        onChange={setDamageClassification}
        disabled={isSubmitting}
      />

      {ticketId ? (
        <PhotoCapture
          ticketId={ticketId}
          queueOnCapture
          onPhotosCaptured={setCapturedPhotos}
        />
      ) : null}

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-slate-500">Equipment Items</p>
            <p className="text-lg font-semibold">{equipmentItems.length}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Captured Photos</p>
            <p className="text-lg font-semibold">{capturedPhotos.length}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Missing Required Types</p>
            <p className="text-lg font-semibold">{missingRequiredPhotoTypes.length}</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          type="button"
          disabled={isSubmitting || !ticketId || !contractorId}
          onClick={() => {
            void handleSubmit();
          }}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Submit Assessment
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
