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
  'FP&L': 'FPL',
  'FPL / FP&L': 'FPL',
  TECO: 'TECO',
};

export function normalizeUtilityClient(value: string | null | undefined): UtilityClient {
  const key = String(value ?? '').trim().toUpperCase();
  const utility = MAP[key];
  if (!utility) throw new Error('No ticket configuration exists for this utility.');
  return utility;
}
