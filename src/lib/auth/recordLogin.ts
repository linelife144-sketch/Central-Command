const PROFILE_ENDPOINT = '/api/auth/profile';

/**
 * Best-effort update of the signed-in user's `last_login_at` timestamp.
 * A failure here must never block or fail the sign-in flow itself.
 */
export async function recordLastLogin(accessToken: string | undefined | null): Promise<boolean> {
  if (!accessToken) {
    return false;
  }

  try {
    const response = await fetch(PROFILE_ENDPOINT, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ last_login_at: new Date().toISOString() }),
    });

    return response.ok;
  } catch {
    return false;
  }
}
