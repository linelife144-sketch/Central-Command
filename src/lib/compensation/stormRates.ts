import type { ContractorRole } from '@/types';

export const CONTRACTOR_ROLES: ContractorRole[] = [
  'STORM_MANAGER',
  'TEAM_LEAD',
  'SR_DAMAGE_ASSESSER',
  'DAMAGE_ASSESSER',
  'DRIVER',
];

export interface StormRoleRateDraft {
  payRate: string;
  billRate: string;
}

export interface StormRoleRate {
  payRate: number;
  billRate: number;
}

export type StormRoleRateDrafts = Partial<Record<ContractorRole, StormRoleRateDraft>>;
export type StormRoleRates = Record<ContractorRole, StormRoleRate>;

function parseRate(value: string | undefined): number | null {
  if (!value || !/^\d+(?:\.\d{1,2})?$/.test(value.trim())) return null;
  const rate = Number(value);
  return Number.isFinite(rate) ? rate : null;
}

export function parseStormRoleRates(drafts: StormRoleRateDrafts): StormRoleRates {
  const parsed = {} as StormRoleRates;

  for (const role of CONTRACTOR_ROLES) {
    const draft = drafts[role];
    if (!draft || !draft.payRate || !draft.billRate) {
      throw new Error('Enter both rates for every contractor role.');
    }
    const payRate = parseRate(draft.payRate);
    const billRate = parseRate(draft.billRate);
    if (payRate === null || billRate === null) {
      throw new Error('Rates must be nonnegative amounts with no more than two decimal places.');
    }
    parsed[role] = { payRate, billRate };
  }

  return parsed;
}
