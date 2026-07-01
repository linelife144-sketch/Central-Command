import type { EquipmentCondition } from '@/types';

export interface EquipmentTypeOption {
  id: string;
  category: string;
  equipmentName: string;
  equipmentCode?: string;
  voltageRating?: string;
  safeApproachDistance?: number;
  damageIndicators: string[];
  defaultCondition: EquipmentCondition;
}

export interface WireSizeOption {
  id: string;
  sizeCode: string;
  sizeName: string;
  category: 'AWG' | 'kcmil' | 'OTHER';
  typicalUse?: string;
}

interface RemoteEquipmentTypeRow {
  id: string;
  category: string | null;
  equipment_name: string | null;
  equipment_code: string | null;
  voltage_rating: string | null;
  safe_approach_distance: number | null;
  damage_indicators: unknown;
  is_active?: boolean | null;
}

interface RemoteWireSizeRow {
  id: string;
  size_code: string | null;
  size_name: string | null;
  category: string | null;
  typical_use: string | null;
}

interface AssessmentCatalogDependencies {
  fetchEquipmentTypes: () => Promise<EquipmentTypeOption[]>;
  fetchWireSizes: () => Promise<WireSizeOption[]>;
}

export interface AssessmentCatalogService {
  listEquipmentTypes: (searchTerm?: string) => Promise<EquipmentTypeOption[]>;
  listWireSizes: (searchTerm?: string) => Promise<WireSizeOption[]>;
}

function toDefaultCondition(category?: string): EquipmentCondition {
  if (!category) {
    return 'DAMAGED';
  }

  const normalized = category.toUpperCase();
  if (normalized === 'PROTECTION' || normalized === 'INSULATOR') {
    return 'FAIR';
  }

  return 'DAMAGED';
}

function toDamageIndicators(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean);
}

function toWireSizeCategory(category: string | null, sizeCode: string): 'AWG' | 'kcmil' | 'OTHER' {
  const normalizedCategory = category?.trim();
  if (normalizedCategory === 'AWG' || normalizedCategory === 'kcmil') {
    return normalizedCategory;
  }

  if (sizeCode.toLowerCase().startsWith('kcmil')) {
    return 'kcmil';
  }

  if (sizeCode.toUpperCase().startsWith('AWG')) {
    return 'AWG';
  }

  return 'OTHER';
}

function normalizeEquipmentTypeRows(rows: RemoteEquipmentTypeRow[]): EquipmentTypeOption[] {
  return rows
    .filter((row) => (row.is_active ?? true) && row.equipment_name)
    .map((row) => ({
      id: row.id,
      category: row.category?.trim().toUpperCase() ?? 'OTHER',
      equipmentName: row.equipment_name?.trim() ?? 'Unknown Equipment',
      equipmentCode: row.equipment_code?.trim() ?? undefined,
      voltageRating: row.voltage_rating?.trim() ?? undefined,
      safeApproachDistance: row.safe_approach_distance ?? undefined,
      damageIndicators: toDamageIndicators(row.damage_indicators),
      defaultCondition: toDefaultCondition(row.category ?? undefined),
    }))
    .sort((left, right) => {
      const categoryComparison = left.category.localeCompare(right.category);
      if (categoryComparison !== 0) {
        return categoryComparison;
      }

      return left.equipmentName.localeCompare(right.equipmentName);
    });
}

function normalizeWireSizeRows(rows: RemoteWireSizeRow[]): WireSizeOption[] {
  return rows
    .filter((row) => Boolean(row.size_code))
    .map((row) => {
      const sizeCode = row.size_code?.trim() ?? '';
      return {
        id: row.id,
        sizeCode,
        sizeName: row.size_name?.trim() || sizeCode,
        category: toWireSizeCategory(row.category, sizeCode),
        typicalUse: row.typical_use?.trim() || undefined,
      };
    })
    .sort((left, right) => {
      const categoryComparison = left.category.localeCompare(right.category);
      if (categoryComparison !== 0) {
        return categoryComparison;
      }

      return left.sizeCode.localeCompare(right.sizeCode);
    });
}

async function fetchEquipmentTypes(): Promise<EquipmentTypeOption[]> {
  const { supabase } = await import('../supabase/client');

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('equipment_types') as any)
      .select('id, category, equipment_name, equipment_code, voltage_rating, safe_approach_distance, damage_indicators, is_active')
      .eq('is_active', true);

    if (error) {
      throw error;
    }

    return normalizeEquipmentTypeRows((data ?? []) as RemoteEquipmentTypeRow[]);
  } catch {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('equipment_types') as any)
      .select('id, category, equipment_name, equipment_code, voltage_rating, safe_approach_distance, damage_indicators');

    return normalizeEquipmentTypeRows((data ?? []) as RemoteEquipmentTypeRow[]);
  }
}

async function fetchWireSizes(): Promise<WireSizeOption[]> {
  const { supabase } = await import('../supabase/client');

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('wire_sizes') as any)
      .select('id, size_code, size_name, category, typical_use');

    if (error) {
      throw error;
    }

    return normalizeWireSizeRows((data ?? []) as RemoteWireSizeRow[]);
  } catch {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('wire_sizes') as any)
      .select('id, size_code');

    return normalizeWireSizeRows((data ?? []) as RemoteWireSizeRow[]);
  }
}

const defaultDependencies: AssessmentCatalogDependencies = {
  fetchEquipmentTypes,
  fetchWireSizes,
};

function matchesSearch(value: string, searchTerm?: string): boolean {
  if (!searchTerm?.trim()) {
    return true;
  }

  return value.toLowerCase().includes(searchTerm.trim().toLowerCase());
}

export function createAssessmentCatalogService(
  overrides: Partial<AssessmentCatalogDependencies> = {},
): AssessmentCatalogService {
  const dependencies: AssessmentCatalogDependencies = {
    ...defaultDependencies,
    ...overrides,
  };

  return {
    async listEquipmentTypes(searchTerm?: string): Promise<EquipmentTypeOption[]> {
      const options = await dependencies.fetchEquipmentTypes();

      return options.filter((option) => {
        const searchableText = [
          option.category,
          option.equipmentName,
          option.equipmentCode,
          option.voltageRating,
          option.damageIndicators.join(' '),
        ]
          .filter(Boolean)
          .join(' ');

        return matchesSearch(searchableText, searchTerm);
      });
    },

    async listWireSizes(searchTerm?: string): Promise<WireSizeOption[]> {
      const options = await dependencies.fetchWireSizes();

      return options.filter((option) => {
        const searchableText = [option.sizeCode, option.sizeName, option.category, option.typicalUse]
          .filter(Boolean)
          .join(' ');

        return matchesSearch(searchableText, searchTerm);
      });
    },
  };
}

export const assessmentCatalogService = createAssessmentCatalogService();
