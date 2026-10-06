import { z } from 'zod';
import { compensationTermsSchema } from '@/lib/compensation/validation';

export function formatContractorPhone(input: string): string {
  const digits = input.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
export const contractorAddSchema = z.object({
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  phone: z.string().trim().optional().default('').refine(value => !value || /^(?:1)?\d{10}$/.test(value.replace(/\D/g, '')), 'Enter a ten-digit phone number.').transform(formatContractorPhone),
  compensation: compensationTermsSchema,
}).strict();
