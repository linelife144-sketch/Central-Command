import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AccessError, assertSameOrigin, requirePermission } from '@/lib/auth/serverPermissions';
import { inviteContractor } from '@/lib/services/contractorInviteService';

export async function GET() {
  try {
    const { client } = await requirePermission('admin.contractors.view');
    const { data, error } = await client.from('contractor_invitations' as never).select('profile_id,email,sent_at,last_result,send_count').order('sent_at', { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    return NextResponse.json({ invitations: data }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load invitations.' }, { status: error instanceof AccessError ? error.status : 500 });
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { user } = await requirePermission('admin.users.edit');
    const result = await inviteContractor(user.id, await request.json());
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof ZodError ? 'Enter one contractor with a valid name and email.' : error instanceof Error ? error.message : 'Unable to send invite.' }, { status: error instanceof AccessError ? error.status : error instanceof ZodError || error instanceof SyntaxError ? 400 : 500 });
  }
}
