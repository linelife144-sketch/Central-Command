import { describe, expect, it, vi } from 'vitest';

import {
  createAssessmentCatalogService,
  type EquipmentTypeOption,
  type WireSizeOption,
} from './assessmentCatalogService';

function buildEquipmentType(overrides: Partial<EquipmentTypeOption> = {}): EquipmentTypeOption {
  return {
    id: 'equip-1',
    category: 'TRANSFORMER',
    equipmentName: 'Pole-Mounted Transformer',
    equipmentCode: 'XFRM-PM',
    voltageRating: '15-50 kV',
    damageIndicators: ['Oil leak'],
    defaultCondition: 'DAMAGED',
    ...overrides,
  };
}

function buildWireSize(overrides: Partial<WireSizeOption> = {}): WireSizeOption {
  return {
    id: 'wire-1',
    sizeCode: 'AWG4',
    sizeName: 'AWG4',
    category: 'AWG',
    typicalUse: 'Primary conductor',
    ...overrides,
  };
}

describe('createAssessmentCatalogService', () => {
  it('lists equipment types and applies search filtering', async () => {
    const fetchEquipmentTypes = vi
      .fn()
      .mockResolvedValue([
        buildEquipmentType(),
        buildEquipmentType({
          id: 'equip-2',
          category: 'REGULATOR',
          equipmentName: 'Voltage Regulator',
          equipmentCode: 'REG-1',
        }),
      ]);

    const service = createAssessmentCatalogService({
      fetchEquipmentTypes,
      fetchWireSizes: vi.fn(),
    });

    const filtered = await service.listEquipmentTypes('regulator');

    expect(fetchEquipmentTypes).toHaveBeenCalledTimes(1);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe('equip-2');
  });

  it('lists wire sizes and applies search filtering', async () => {
    const fetchWireSizes = vi
      .fn()
      .mockResolvedValue([
        buildWireSize(),
        buildWireSize({ id: 'wire-2', sizeCode: 'kcmil500', sizeName: 'kcmil500', category: 'kcmil' }),
      ]);

    const service = createAssessmentCatalogService({
      fetchEquipmentTypes: vi.fn(),
      fetchWireSizes,
    });

    const filtered = await service.listWireSizes('kcmil');

    expect(fetchWireSizes).toHaveBeenCalledTimes(1);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.sizeCode).toBe('kcmil500');
  });
});
