import { NextResponse } from 'next/server';

import { canPerformManagementAction } from '@/lib/auth/authorization';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { validateTicketOcrIntakeFile } from '@/lib/tickets/ocr/fileIntake';
import type { UserRole } from '@/types';

export const runtime = 'nodejs';

function readString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function extractOcrText(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const data = record.data && typeof record.data === 'object'
    ? (record.data as Record<string, unknown>)
    : null;
  const result = record.result && typeof record.result === 'object'
    ? (record.result as Record<string, unknown>)
    : null;

  return (
    readString(record.ocrText)
    ?? readString(record.text)
    ?? readString(record.extracted_text)
    ?? readString(record.content)
    ?? readString(data?.ocrText)
    ?? readString(data?.text)
    ?? readString(result?.ocrText)
    ?? readString(result?.text)
  );
}

function extractError(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;
  return readString(record.error) ?? readString(record.message) ?? null;
}

async function resolveAuthenticatedUser(request: Request) {
  const authorizationHeader = request.headers.get('authorization');
  if (authorizationHeader?.startsWith('Bearer ')) {
    const token = authorizationHeader.slice('Bearer '.length).trim();
    if (token.length > 0) {
      const admin = createAdminClient();
      const { data, error } = await admin.auth.getUser(token);
      if (error || !data.user) {
        return null;
      }
      return data.user;
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

async function resolveUserRole(userId: string): Promise<UserRole | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const profile = data as { role?: unknown } | null;
  return readString(profile?.role) as UserRole | null;
}

export async function POST(request: Request) {
  const user = await resolveAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = await resolveUserRole(user.id);
  if (!canPerformManagementAction(role, 'ticket_entry_write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const localOcrEndpoint = process.env.LOCAL_OCR_MODEL_URL;
  if (!localOcrEndpoint) {
    return NextResponse.json(
      { error: 'LOCAL_OCR_MODEL_URL is not configured on the server.' },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart form data.' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'File is required.' }, { status: 400 });
  }

  const validationError = validateTicketOcrIntakeFile(file);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const templateKey = readString(formData.get('templateKey'));

  const upstreamBody = new FormData();
  upstreamBody.set('file', file, file.name);
  if (templateKey) {
    upstreamBody.set('templateKey', templateKey);
  }

  const headers = new Headers();
  if (process.env.LOCAL_OCR_MODEL_API_KEY) {
    headers.set('Authorization', `Bearer ${process.env.LOCAL_OCR_MODEL_API_KEY}`);
  }

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(localOcrEndpoint, {
      method: 'POST',
      headers,
      body: upstreamBody,
      cache: 'no-store',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to call local OCR model.';
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const contentType = upstreamResponse.headers.get('content-type') ?? '';
  let payload: unknown;
  if (contentType.includes('application/json')) {
    payload = await upstreamResponse.json().catch(() => null);
  } else {
    const textPayload = await upstreamResponse.text().catch(() => '');
    payload = { text: textPayload };
  }

  if (!upstreamResponse.ok) {
    const upstreamError = extractError(payload) ?? `OCR model request failed with status ${upstreamResponse.status}.`;
    return NextResponse.json({ error: upstreamError }, { status: 502 });
  }

  const ocrText = extractOcrText(payload);
  if (!ocrText) {
    return NextResponse.json({ error: 'OCR model returned no text.' }, { status: 422 });
  }

  return NextResponse.json({
    ocrText,
    sourceFile: {
      name: file.name,
      type: file.type,
      size: file.size,
    },
  });
}
