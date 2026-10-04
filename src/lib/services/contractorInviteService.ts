import 'server-only';
import { AccessError } from '@/lib/auth/serverPermissions';

/** Retired entry point. Keep stale callers from sending invitations. */
export async function inviteContractor(_actorId: string, _input: unknown): Promise<never> {
  void _actorId; void _input;
  throw new AccessError('Invitations are no longer available. Use Add contractor.', 410);
}
