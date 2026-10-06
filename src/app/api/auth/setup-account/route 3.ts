import { NextResponse } from 'next/server';
import { AccessError, assertSameOrigin } from '@/lib/auth/serverPermissions';
import { SETUP_ACCOUNT_MESSAGE } from '@/lib/auth/contractorOnboardingValidation';
import { requestContractorAccountSetup } from '@/lib/services/contractorAccountSetupService';

export async function POST(request: Request) {
  const startedAt = Date.now();
  try {
    assertSameOrigin(request);
    const body = await request.json().catch(() => null);
    await requestContractorAccountSetup(body, request.headers.get('origin') ?? new URL(request.url).origin);
    // A minimum response duration reduces fast-path account enumeration.
    await new Promise(resolve => setTimeout(resolve, Math.max(0, 750 - (Date.now() - startedAt))));
    return NextResponse.json({ message: SETUP_ACCOUNT_MESSAGE }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Contractor account setup unavailable.');
    return NextResponse.json({ message: SETUP_ACCOUNT_MESSAGE }, { headers: { 'Cache-Control': 'private, no-store' } });
  }
}
