import type { WorkType } from '../../../types';
import { WORK_TYPES } from '../../../lib/config/appConfig';

export interface WorkTypeOption {
  value: WorkType;
  label: string;
}

export const WORK_TYPE_OPTIONS: WorkTypeOption[] = [
  { value: WORK_TYPES.WORKING, label: 'Working' },
  { value: WORK_TYPES.MOB, label: 'MOB' },
  { value: WORK_TYPES.DE_MOB, label: 'DE-MOB' },
  { value: WORK_TYPES.STAND_BY, label: 'Stand-by' },
];
