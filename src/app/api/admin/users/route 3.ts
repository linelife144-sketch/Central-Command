import { NextResponse } from 'next/server';
import { AccessError, requirePermission } from '@/lib/auth/serverPermissions';

export async function GET() {
  try {
    const { client, user } = await requirePermission('admin.users.view');
    const { data, error } = await client.from('profiles').select('id,email,first_name,last_name,role,is_active,created_at').order('last_name');
    if (error) throw new Error(error.message);
    return NextResponse.json({ users: data, actorId: user.id }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load users.' }, { status: error instanceof AccessError ? error.status : 500 });
  }
}
