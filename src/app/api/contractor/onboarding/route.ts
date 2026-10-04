import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireOnboardingContractor } from '@/lib/auth/serverContractor';
import { AccessError, assertSameOrigin } from '@/lib/auth/serverPermissions';
import { contractorOnboardingSchema } from '@/lib/auth/contractorOnboardingValidation';

function failure(error: unknown) {
  return NextResponse.json({ error: error instanceof ZodError ? error.issues[0]?.message : error instanceof AccessError ? error.message : 'Unable to save onboarding. Please try again.' }, { status: error instanceof AccessError ? error.status : error instanceof ZodError || error instanceof SyntaxError ? 400 : 500 });
}
export async function GET() {
  try {
    const { contractor, profile, driverRequired } = await requireOnboardingContractor();
    return NextResponse.json({ contractor: { ...contractor, first_name: profile.first_name || contractor.first_name || '', last_name: profile.last_name || contractor.last_name || '' }, driverRequired }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { admin, user } = await requireOnboardingContractor();
    const details = contractorOnboardingSchema.parse(await request.json());
    const { error } = await admin.rpc('complete_contractor_onboarding', { p_profile_id: user.id, p_details: details });
    if (error) throw new AccessError(error.code === '23514' ? error.message : 'Unable to complete onboarding.', error.code === '23514' ? 400 : 403);
    return NextResponse.json({ next: '/contractor/time' }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return failure(error); }
}
