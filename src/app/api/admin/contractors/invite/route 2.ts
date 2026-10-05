import { NextResponse } from 'next/server';

// Retired: older clients must never send invitation emails.
export async function POST() {
  return NextResponse.json({ error: 'Invitations are no longer available. Use Add contractor.' }, { status: 410 });
}
export async function GET() {
  return NextResponse.json({ invitations: [] }, { headers: { 'Cache-Control': 'private, no-store' } });
}
