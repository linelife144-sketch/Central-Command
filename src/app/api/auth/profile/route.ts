import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type ProfileRow = Record<string, unknown> & {
  id?: string;
  role?: string;
  is_active?: boolean;
  must_reset_password?: boolean;
};

function normalizeProfile(profile: ProfileRow): ProfileRow {
  return {
    ...profile,
    must_reset_password: typeof profile.must_reset_password === 'boolean'
      ? profile.must_reset_password
      : false,
  };
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
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  return user;
}

export async function GET(request: Request) {
  const user = await resolveAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profilesTable = admin.from('profiles') as any;
    const { data, error } = await profilesTable
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({
      profile: normalizeProfile(data as ProfileRow),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown profile fetch error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await resolveAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: {
    last_login_at?: string;
    must_reset_password?: boolean;
  };

  try {
    payload = (await request.json()) as {
      last_login_at?: string;
      must_reset_password?: boolean;
    };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profilesTable = admin.from('profiles') as any;
    const { data: existingProfile, error: existingError } = await profilesTable
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    if (!existingProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const updatePayload: Record<string, unknown> = {};
    if (typeof payload.last_login_at === 'string' && payload.last_login_at.length > 0) {
      updatePayload.last_login_at = payload.last_login_at;
    }

    if (
      typeof payload.must_reset_password === 'boolean'
      && Object.prototype.hasOwnProperty.call(existingProfile, 'must_reset_password')
    ) {
      updatePayload.must_reset_password = payload.must_reset_password;
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ ok: true, applied: false });
    }

    const { error: updateError } = await profilesTable
      .update(updatePayload)
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, applied: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown profile update error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
