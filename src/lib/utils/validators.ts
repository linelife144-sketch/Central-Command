// Central Command - Validation Utilities

import { z } from 'zod';
import { APP_CONFIG } from '../config/appConfig';

// Phone validation
export const phoneSchema = z.string()
  .min(10, 'Phone number must be at least 10 digits')
  .max(20, 'Phone number is too long')
  .regex(/^[\d\s\-\+\(\)\.]+$/, 'Invalid phone number format');

// Email validation
export const emailSchema = z.string()
  .email('Invalid email address')
  .min(5, 'Email is too short')
  .max(255, 'Email is too long');

// Password validation (12+ chars, uppercase, lowercase, number, special)
export const passwordSchema = z.string()
  .min(12, 'Password must be at least 12 characters')
  .max(128, 'Password is too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/\d/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character');

// ZIP code validation
export const zipSchema = z.string()
  .regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format');

// EIN validation (XX-XXXXXXX)
export const einSchema = z.string()
  .regex(/^\d{2}-?\d{7}$/, 'Invalid EIN format (XX-XXXXXXX)');

// SSN validation (XXX-XX-XXXX)
export const ssnSchema = z.string()
  .regex(/^\d{3}-?\d{2}-?\d{4}$/, 'Invalid SSN format (XXX-XX-XXXX)');

// GPS coordinate validation
export const latitudeSchema = z.number()
  .min(-90, 'Latitude must be between -90 and 90')
  .max(90, 'Latitude must be between -90 and 90');

export const longitudeSchema = z.number()
  .min(-180, 'Longitude must be between -180 and 180')
  .max(180, 'Longitude must be between -180 and 180');

// Ticket form schema
export const ticketSchema = z.object({
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().length(2, 'State must be 2 characters'),
  zip_code: zipSchema,
  utility_client: z.string().min(2, 'Utility client is required'),
  is_important: z.boolean(),
  work_description: z.string().optional(),
  scheduled_date: z.string().optional(),
  due_date: z.string().optional(),
});

// Time entry validation
export const timeEntrySchema = z.object({
  work_type: z.enum(['Working', 'MOB', 'DE-MOB', 'Stand-by']),
  break_minutes: z.number().int().min(0).max(120).multipleOf(5).default(0),
});

// Expense item validation
export const expenseItemSchema = z.object({
  category: z.enum(['MILEAGE', 'FUEL', 'LODGING', 'MEALS', 'TOLLS', 'PARKING', 'MATERIALS', 'EQUIPMENT_RENTAL', 'OTHER']),
  description: z.string().min(3, 'Description is required'),
  amount: z.number().positive('Amount must be positive'),
  expense_date: z.string(),
});

// Assessment validation
export const assessmentSchema = z.object({
  safety_observations: z.object({
    downed_conductors: z.boolean(),
    damaged_insulators: z.boolean(),
    vegetation_contact: z.boolean(),
    structural_damage: z.boolean(),
    fire_hazard: z.boolean(),
    public_accessible: z.boolean(),
    safe_distance_maintained: z.boolean(),
  }),
  damage_cause: z.string().optional(),
  weather_conditions: z.string().optional(),
  estimated_repair_hours: z.number().positive().optional(),
  priority: z.enum(['A', 'B', 'C', 'X']).optional(),
  immediate_actions: z.string().optional(),
  repair_vs_replace: z.enum(['REPAIR', 'REPLACE', 'ENGINEERING_REVIEW']).optional(),
  estimated_repair_cost: z.number().positive().optional(),
});

// Photo validation
export const photoSchema = z.object({
  file: z.instanceof(File),
  type: z.enum(['OVERVIEW', 'EQUIPMENT', 'DAMAGE', 'SAFETY', 'CONTEXT']),
});

// GPS validation
export interface GPSValidationResult {
  valid: boolean;
  error?: string;
  accuracy?: number;
}

export function validateGPS(
  latitude: number | null,
  longitude: number | null,
  accuracy: number | null,
  minAccuracy: number = 100
): GPSValidationResult {
  if (latitude === null || longitude === null || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return { valid: false, error: 'GPS coordinates are required' };
  }
  
  if (accuracy === null || !Number.isFinite(accuracy) || accuracy < 0 || accuracy > minAccuracy) {
    return {
      valid: false,
      error: `GPS accuracy too low (${accuracy?.toFixed(0) ?? 'unknown'}m). Must be within ${minAccuracy}m.`,
      accuracy: accuracy ?? undefined,
    };
  }
  
  return { valid: true, accuracy };
}

// Geofence validation
export function validateGeofence(
  userLat: number,
  userLng: number,
  targetLat: number,
  targetLng: number,
  radiusMeters: number = 500
): { within: boolean; distance: number } {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (userLat * Math.PI) / 180;
  const φ2 = (targetLat * Math.PI) / 180;
  const Δφ = ((targetLat - userLat) * Math.PI) / 180;
  const Δλ = ((targetLng - userLng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c;

  return {
    within: distance <= radiusMeters,
    distance: Math.round(distance),
  };
}

// File validation
export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validatePhotoFile(
  file: File,
  maxSizeMB: number = 10,
  allowedTypes: string[] = ['image/jpeg', 'image/png']
): FileValidationResult {
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}`,
    };
  }
  
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max: ${maxSizeMB}MB`,
    };
  }
  
  return { valid: true };
}

// Time entry duration validation
export function validateTimeEntryDuration(
  clockIn: Date,
  clockOut: Date,
  maxHours: number = APP_CONFIG.MAX_TIME_ENTRY_HOURS
): { valid: boolean; error?: string; durationMinutes: number } {
  const durationMs = clockOut.getTime() - clockIn.getTime();
  if (!Number.isFinite(durationMs)) {
    return { valid: false, error: 'Clock timestamps must be valid dates', durationMinutes: 0 };
  }
  const durationMinutes = Math.floor(durationMs / (1000 * 60));
  
  if (durationMinutes < 0) {
    return {
      valid: false,
      error: 'Clock out time must be after clock in time',
      durationMinutes: 0,
    };
  }
  
  if (durationMs > maxHours * 3600000) {
    return {
      valid: false,
      error: `Time entry exceeds maximum ${maxHours} hours`,
      durationMinutes,
    };
  }
  
  return { valid: true, durationMinutes };
}
