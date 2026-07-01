import { z } from 'zod';

export const assessmentDecisionSchema = z
  .object({
    decision: z.enum(['APPROVED', 'NEEDS_REWORK']),
    reviewNotes: z.string().max(1000).optional().default(''),
  })
  .superRefine((value, ctx) => {
    if (value.decision === 'NEEDS_REWORK' && !value.reviewNotes.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reviewNotes'],
        message: 'Rework notes are required.',
      });
    }
  });

export type AssessmentDecisionFormValues = z.infer<typeof assessmentDecisionSchema>;
