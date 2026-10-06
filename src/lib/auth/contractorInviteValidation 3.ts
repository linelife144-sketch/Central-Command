import { z } from 'zod';
import { compensationTermsSchema } from '../compensation/validation';

export const contractorInviteSchema = z.object({
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  phone: z.string().trim().max(30).optional(),
  compensation: compensationTermsSchema.optional(),
  resend: z.boolean().optional().default(false),
}).strict().superRefine((value, ctx) => {
  if (!value.resend && !value.compensation) ctx.addIssue({ code: 'custom', path: ['compensation'], message: 'Configure compensation before inviting a contractor.' });
});

export function inviteRedirectUrl() {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (!base) throw new Error('Set NEXT_PUBLIC_APP_URL to the address contractors can open.');
  const url = new URL('/auth/confirm', base);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid application URL.');
  return url.toString();
}
