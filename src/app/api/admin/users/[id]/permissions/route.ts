import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AccessError, assertSameOrigin, requirePermission } from '@/lib/auth/serverPermissions';
import { permissionUpdateSchema, validatePermissionOverrides } from '@/lib/auth/permissionValidation';

type Context = { params: Promise<{ id: string }> };
function respondError(error: unknown) {
  return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update permissions.' }, { status: error instanceof AccessError ? error.status : error instanceof z.ZodError ? 400 : 500 });
}
export async function GET(_request: Request, context: Context) {
  try {
    const { client } = await requirePermission('admin.users.view');
    const id = z.string().uuid().parse((await context.params).id);
    const { data, error } = await client.rpc('get_user_permission_settings', { p_profile_id: id });
    if (error) throw new AccessError(error.message, error.code === 'P0002' ? 404 : 403);
    return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return respondError(error); }
}
export async function PATCH(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const { client } = await requirePermission('admin.users.edit');
    const id = z.string().uuid().parse((await context.params).id);
    const payload = permissionUpdateSchema.parse(await request.json());
    const invalid = validatePermissionOverrides(payload.overrides);
    if (invalid) throw new AccessError(invalid, 400);
    const { data, error } = await client.rpc('set_user_permissions', { p_profile_id: id, p_overrides: payload.overrides, p_version: payload.version ?? undefined });
    if (error) throw new AccessError(error.message, error.code === '40001' ? 409 : error.code === '22023' ? 400 : 403);
    return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return respondError(error); }
}
