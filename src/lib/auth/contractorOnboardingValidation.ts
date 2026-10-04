import { z } from 'zod';

export const setupAccountSchema = z.object({ email: z.string().trim().toLowerCase().email().max(254) }).strict();
export const accountPasswordSchema = z.object({
  password: z.string().min(12).max(128).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/),
}).strict();
export const contractorOnboardingSchema = z.object({
  first_name: z.string().trim().min(1, 'First name is required').max(80),
  last_name: z.string().trim().min(1, 'Last name is required').max(80),
  address_line1: z.string().trim().min(1, 'Street address is required').max(255),
  address_line2: z.string().trim().max(255).default(''),
  city: z.string().trim().min(1, 'City is required').max(100),
  state: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, 'Use the two-letter state abbreviation'),
  zip_code: z.string().trim().regex(/^[0-9]{5}(-[0-9]{4})?$/, 'Enter a valid ZIP code'),
  vehicle_registration_photo_path: z.string().max(200).nullable().default(null),
}).strict();
export type ContractorOnboardingDetails = z.infer<typeof contractorOnboardingSchema>;
export const REGISTRATION_BUCKET = 'contractor-registration-tags';
export const SETUP_ACCOUNT_MESSAGE = 'If this email belongs to an added contractor who needs account setup, you will receive an email to verify your account. Already set up? Sign in or reset your password.';
