import type { UtilityClient } from './types';

const MAP: Record<string, UtilityClient> = {
  ENTERGY: 'ENTERGY',
  'DUKE ENERGY': 'DUKE',
  DUKE: 'DUKE',
  CENTERPOINT: 'CENTERPOINT',
  ONCOR: 'ONCOR',
  ENCORE: 'ONCOR',
  'FLORIDA POWER & LIGHT': 'FPL',
  FPL: 'FPL',
  TECO: 'TECO',
};

export function normalizeUtilityClient(value: string | null | undefined): UtilityClient {
  const key = String(value ?? '').trim().toUpperCase();
  return MAP[key] ?? 'ENTERGY';
}
