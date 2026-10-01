import type { User } from '@/types';

export function isSuperAdminTestingEnabled(
  environment: string | undefined = process.env.NODE_ENV,
  setting: string | undefined = process.env.NEXT_PUBLIC_ENABLE_SUPER_ADMIN_TESTING,
): boolean {
  return environment === 'development' && setting === 'true';
}

export const SUPER_ADMIN_TEST_PROFILE: User = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'admin@gridelectric.com',
  first_name: 'David',
  last_name: 'McCarty',
  role: 'SUPER_ADMIN',
  is_active: true,
  is_email_verified: true,
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
};
