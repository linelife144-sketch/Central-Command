// Resolves the feeder / circuit identifier from a ticket's utility payload.
// Entergy tickets store this as `feeder` (format: N + 4 digits); every other
// configured utility template stores the equivalent value as
// `feeder_or_circuit_id`. Returns null when the payload has no value yet.
export function getFeederFromPayload(payload: Record<string, unknown> | null | undefined): string | null {
  if (!payload) return null;

  const raw = payload.feeder ?? payload.feeder_or_circuit_id;
  if (typeof raw !== 'string') return null;

  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}
