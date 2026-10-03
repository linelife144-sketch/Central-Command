import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AccessError, assertSameOrigin, requirePermission } from '@/lib/auth/serverPermissions';
import { inviteContractor } from '@/lib/services/contractorInviteService';

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
