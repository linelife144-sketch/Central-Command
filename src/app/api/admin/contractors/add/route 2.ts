import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AccessError, assertSameOrigin, requirePermission } from '@/lib/auth/serverPermissions';
import { addContractor } from '@/lib/services/contractorAddService';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { user } = await requirePermission('admin.contractors.edit');
    await requirePermission('admin.payroll.edit');
    const result = await addContractor(user.id, await request.json());
    return NextResponse.json(result, { status: 201, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof ZodError ? error.issues[0]?.message ?? 'Check contractor details and pay settings.' : error instanceof Error ? error.message : 'Unable to add contractor.' }, { status: error instanceof AccessError ? error.status : error instanceof ZodError || error instanceof SyntaxError ? 400 : 500 });
  }
}
