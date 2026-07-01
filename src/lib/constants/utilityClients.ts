export const UTILITY_CLIENTS = [
  'Duke Energy',
  'Florida Power & Light',
  'TECO',
  'Entergy',
] as const;

export type UtilityClient = (typeof UTILITY_CLIENTS)[number];

export function isEntergyUtilityClient(value?: string | null): boolean {
  return (value ?? '').trim().toLowerCase() === 'entergy';
}

