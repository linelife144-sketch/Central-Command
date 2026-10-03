import { z } from 'zod';
import { isPermissionKey, type PermissionOverrides } from './permissionCatalog';

export const permissionUpdateSchema = z.object({
  overrides: z.record(z.string(), z.enum(['allow', 'deny'])).refine(value => Object.keys(value).every(isPermissionKey), 'Unknown permission key.'),
  version: z.string().uuid().nullable(),
}).strict();

export function validatePermissionOverrides(overrides: PermissionOverrides): string | null {
  for (const [key, effect] of Object.entries(overrides)) {
    if (key.endsWith('.edit') && effect === 'allow' && overrides[key.replace(/\.edit$/, '.view') as keyof PermissionOverrides] === 'deny') {
      return 'Enable View before enabling Edit.';
    }
  }
  return null;
}
