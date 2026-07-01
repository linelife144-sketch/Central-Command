import { describe, expect, it, vi } from 'vitest';

import {
  composeReviewNotes,
  createAssessmentReviewService,
  type AssessmentReviewListItem,
  type ReviewedAssessment,
} from './assessmentReviewService';

function buildAssessmentItem(overrides: Partial<AssessmentReviewListItem> = {}): AssessmentReviewListItem {
  return {
    id: 'assessment-1',
    ticket_id: 'ticket-1',
    ticket_number: 'GES-1001',
    contractor_id: 'sub-1',
    contractor_name: 'Sam Rivera',
    damage_cause: 'WEATHER',
    priority: 'A',
    safety_flags: ['downed_conductors'],
    equipment_count: 2,
    assessed_at: '2026-02-12T10:00:00.000Z',
    review_state: 'PENDING',
    sync_status: 'SYNCED',
    created_at: '2026-02-12T10:00:00.000Z',
    updated_at: '2026-02-12T10:00:00.000Z',
    ...overrides,
  };
}

function buildReviewedAssessment(overrides: Partial<ReviewedAssessment> = {}): ReviewedAssessment {
  return {
    assessmentId: 'assessment-1',
    reviewedBy: 'admin-1',
    reviewedAt: '2026-02-12T11:00:00.000Z',
    reviewNotes: '[APPROVED] Looks good.',
    decision: 'APPROVED',
    ...overrides,
  };
}

describe('createAssessmentReviewService', () => {
  it('prefixes approved notes for storage compatibility', () => {
    expect(composeReviewNotes('APPROVED', 'Looks good.')).toBe('[APPROVED] Looks good.');
    expect(composeReviewNotes('APPROVED')).toBe('[APPROVED]');
  });

  it('prefixes needs rework notes for storage compatibility', () => {
    expect(composeReviewNotes('NEEDS_REWORK', 'Fix photo labels.')).toBe('[NEEDS_REWORK] Fix photo labels.');
    expect(composeReviewNotes('NEEDS_REWORK')).toBe('[NEEDS_REWORK]');
  });

  it('lists remote assessments when online', async () => {
    const listRemoteAssessments = vi.fn().mockResolvedValue([buildAssessmentItem()]);
    const service = createAssessmentReviewService({
      isOnline: () => true,
      listRemoteAssessments,
      listLocalAssessments: vi.fn(),
      reviewRemoteAssessment: vi.fn(),
    });

    const items = await service.listAssessments({ reviewed: 'PENDING' });

    expect(listRemoteAssessments).toHaveBeenCalledWith({ reviewed: 'PENDING' });
    expect(items).toHaveLength(1);
  });

  it('falls back to local list when remote listing fails', async () => {
    const listRemoteAssessments = vi.fn().mockRejectedValue(new Error('remote failure'));
    const listLocalAssessments = vi
      .fn()
      .mockResolvedValue([buildAssessmentItem({ id: 'assessment-local' })]);

    const service = createAssessmentReviewService({
      isOnline: () => true,
      listRemoteAssessments,
      listLocalAssessments,
      reviewRemoteAssessment: vi.fn(),
    });

    const items = await service.listAssessments();

    expect(listRemoteAssessments).toHaveBeenCalledTimes(1);
    expect(listLocalAssessments).toHaveBeenCalledTimes(1);
    expect(items[0]?.id).toBe('assessment-local');
  });

  it('requires online connectivity for review decisions', async () => {
    const service = createAssessmentReviewService({
      isOnline: () => false,
      listRemoteAssessments: vi.fn(),
      listLocalAssessments: vi.fn(),
      reviewRemoteAssessment: vi.fn(),
    });

    await expect(
      service.reviewAssessment({
        assessmentId: 'assessment-1',
        reviewerId: 'admin-1',
        decision: 'APPROVED',
      }),
    ).rejects.toThrow('internet connection');
  });

  it('requires review notes for NEEDS_REWORK decisions', async () => {
    const service = createAssessmentReviewService({
      isOnline: () => true,
      listRemoteAssessments: vi.fn(),
      listLocalAssessments: vi.fn(),
      reviewRemoteAssessment: vi.fn(),
    });

    await expect(
      service.reviewAssessment({
        assessmentId: 'assessment-1',
        reviewerId: 'admin-1',
        decision: 'NEEDS_REWORK',
      }),
    ).rejects.toThrow('Review notes are required');
  });

  it('submits review decision when validation passes', async () => {
    const reviewRemoteAssessment = vi.fn().mockResolvedValue(buildReviewedAssessment());

    const service = createAssessmentReviewService({
      isOnline: () => true,
      listRemoteAssessments: vi.fn(),
      listLocalAssessments: vi.fn(),
      reviewRemoteAssessment,
    });

    const result = await service.reviewAssessment({
      assessmentId: 'assessment-1',
      reviewerId: 'admin-1',
      decision: 'APPROVED',
      reviewNotes: 'Looks good.',
    });

    expect(reviewRemoteAssessment).toHaveBeenCalledWith({
      assessmentId: 'assessment-1',
      reviewerId: 'admin-1',
      decision: 'APPROVED',
      reviewNotes: 'Looks good.',
    });
    expect(result.decision).toBe('APPROVED');
  });
});
