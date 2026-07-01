import type { EquipmentCondition, PriorityLevel, RepairDecision, SafetyObservations } from '@/types';

export interface EquipmentAssessmentDraft {
  id: string;
  equipmentTypeId: string;
  equipmentType: string;
  wireSizeCode: string;
  equipmentTag: string;
  equipmentDescription: string;
  condition: EquipmentCondition;
  damageDescription: string;
  requiresReplacement: boolean;
}

export interface DamageClassificationDraft {
  damageCause: string;
  weatherConditions: string;
  estimatedRepairHours: string;
  priority: PriorityLevel;
  immediateActions: string;
  repairVsReplace: RepairDecision;
  estimatedRepairCost: string;
}

export function createAssessmentDraftId(): string {
  if (typeof globalThis !== 'undefined' && typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createEmptyEquipmentAssessment(): EquipmentAssessmentDraft {
  return {
    id: createAssessmentDraftId(),
    equipmentTypeId: '',
    equipmentType: '',
    wireSizeCode: '',
    equipmentTag: '',
    equipmentDescription: '',
    condition: 'DAMAGED',
    damageDescription: '',
    requiresReplacement: false,
  };
}

export function createDefaultDamageClassification(): DamageClassificationDraft {
  return {
    damageCause: '',
    weatherConditions: '',
    estimatedRepairHours: '',
    priority: 'B',
    immediateActions: '',
    repairVsReplace: 'REPAIR',
    estimatedRepairCost: '',
  };
}

export function createDefaultSafetyObservations(): SafetyObservations {
  return {
    downed_conductors: false,
    damaged_insulators: false,
    vegetation_contact: false,
    structural_damage: false,
    fire_hazard: false,
    public_accessible: false,
    safe_distance_maintained: true,
  };
}
