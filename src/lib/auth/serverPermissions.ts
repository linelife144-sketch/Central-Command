import 'server-only';
import { isSuperAdminClassRole } from './roleGuards';
import { createClient } from '@/lib/supabase/server';
import type { PermissionKey, PermissionMap } from './permissionCatalog';

export class AccessError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export async function requirePermission(key: PermissionKey) {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new AccessError('Please sign in.', 401);
  const { data: profile } = await client.from('profiles').select('id,role,is_active,must_reset_password').eq('id', user.id).single();
  if (!profile?.is_active || profile.must_reset_password) throw new AccessError('Finish account setup before continuing.', 403);
  if (key.endsWith('.edit') && !isSuperAdminClassRole(profile.role)) throw new AccessError('Only CEO or Super Admin can change business records.', 403);
  const { data, error: permissionError } = await client.rpc('get_my_permissions');
  if (permissionError?.code === 'PGRST202' && permissionError.message.includes('get_my_permissions')) throw new AccessError('The permissions database update is awaiting approval. Changes and invitations are not enabled yet.', 503);
  if (permissionError || !(data as PermissionMap | null)?.[key]) throw new AccessError('You do not have permission for this action.', 403);
  return { client, user, profile, permissions: data as PermissionMap };
}
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) throw new AccessError('Cross-origin request rejected.', 403);
}
