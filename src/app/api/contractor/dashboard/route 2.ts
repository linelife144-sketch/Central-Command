import { NextResponse } from 'next/server';
import { requireOnboardingContractor } from '@/lib/auth/serverContractor';
import { AccessError } from '@/lib/auth/serverPermissions';
import { createClient } from '@/lib/supabase/server';
import { loadContractorDashboard } from '@/lib/services/contractorDashboardService';

export async function GET() {
  try {
    const { contractor, profile } = await requireOnboardingContractor();
    if (!contractor.onboarding_completed_at) throw new AccessError('Finish onboarding to open your dashboard.', 403);
    const client = await createClient();
    const data = await loadContractorDashboard(client, contractor.id, profile.first_name || contractor.first_name || '');
    return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof AccessError ? error.message : 'Unable to load your dashboard. Please try again.' },
      { status: error instanceof AccessError ? error.status : 500, headers: { 'Cache-Control': 'private, no-store' } });
  }
}
