import { describe, expect, it, vi } from 'vitest';

import {
  createAssessmentSubmissionService,
  type CreateAssessmentInput,
} from './assessmentSubmissionService';
import type { DamageAssessment, SafetyObservations } from '../../types';

const SAFETY_OBSERVATIONS: SafetyObservations = {
  downed_conductors: true,
  damaged_insulators: true,
  vegetation_contact: false,
  structural_damage: true,
  fire_hazard: false,
  public_accessible: false,
  safe_distance_maintained: true,
};

function buildCreateInput(overrides: Partial<CreateAssessmentInput> = {}): CreateAssessmentInput {
  return {
    ticketId: 'ticket-1',
    contractorId: 'sub-1',
    safetyObservations: SAFETY_OBSERVATIONS,
    damageClassification: {
      damageCause: 'WEATHER',
      priority: 'A',
      repairVsReplace: 'REPAIR',
      estimatedRepairHours: 3,
    },
    equipmentItems: [
      {
        equipmentType: 'TRANSFORMER',
        condition: 'DAMAGED',
        damageDescription: 'Housing crack and fluid leak.',
        requiresReplacement: true,
      },
    ],
    ...overrides,
  };
}

function buildAssessment(overrides: Partial<DamageAssessment> = {}): DamageAssessment {
  return {
    id: 'assessment-1',
    ticket_id: 'ticket-1',
    contractor_id: 'sub-1',
    safety_observations: SAFETY_OBSERVATIONS,
    sync_status: 'SYNCED',
    created_at: '2026-02-12T10:00:00.000Z',
    updated_at: '2026-02-12T10:00:00.000Z',
    ...overrides,
  };
}

describe('createAssessmentSubmissionService', () => {
  it('creates remote assessment when online and remote succeeds', async () => {
    const createRemoteAssessment = vi.fn().mockResolvedValue(buildAssessment());
    const createLocalAssessment = vi.fn();

    const service = createAssessmentSubmissionService({
      isOnline: () => true,
      createRemoteAssessment,
      createLocalAssessment,
    });

    const result = await service.createAssessment(buildCreateInput());

    expect(createRemoteAssessment).toHaveBeenCalledTimes(1);
    expect(createLocalAssessment).not.toHaveBeenCalled();
    expect(result.sync_status).toBe('SYNCED');
  });

  it('falls back to local queue when remote creation fails', async () => {
    const createRemoteAssessment = vi.fn().mockRejectedValue(new Error('remote insert failed'));
    const createLocalAssessment = vi
      .fn()
      .mockResolvedValue(buildAssessment({ id: 'assessment-local', sync_status: 'PENDING' }));

    const service = createAssessmentSubmissionService({
      isOnline: () => true,
      createRemoteAssessment,
      createLocalAssessment,
    });

    const result = await service.createAssessment(buildCreateInput());

    expect(createRemoteAssessment).toHaveBeenCalledTimes(1);
    expect(createLocalAssessment).toHaveBeenCalledTimes(1);
    expect(createLocalAssessment.mock.calls[0]?.[1]).toContain('remote insert failed');
    expect(result.id).toBe('assessment-local');
    expect(result.sync_status).toBe('PENDING');
  });

  it('creates local assessment directly when offline', async () => {
    const createRemoteAssessment = vi.fn();
    const createLocalAssessment = vi
      .fn()
      .mockResolvedValue(buildAssessment({ id: 'assessment-offline', sync_status: 'PENDING' }));

    const service = createAssessmentSubmissionService({
      isOnline: () => false,
      createRemoteAssessment,
      createLocalAssessment,
    });

    const result = await service.createAssessment(buildCreateInput());

    expect(createRemoteAssessment).not.toHaveBeenCalled();
    expect(createLocalAssessment).toHaveBeenCalledTimes(1);
    expect(result.id).toBe('assessment-offline');
  });

  it('validates required fields before submission', async () => {
    const service = createAssessmentSubmissionService({
      isOnline: () => true,
      createRemoteAssessment: vi.fn(),
      createLocalAssessment: vi.fn(),
    });

    await expect(
      service.createAssessment(buildCreateInput({ ticketId: '' })),
    ).rejects.toThrow('Ticket is required');

    await expect(
      service.createAssessment(buildCreateInput({ equipmentItems: [] })),
    ).rejects.toThrow('At least one equipment assessment is required');
  });
});
