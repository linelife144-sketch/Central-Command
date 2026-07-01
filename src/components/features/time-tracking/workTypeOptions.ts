import type { WorkType } from '../../../types';
import { WORK_TYPES } from '../../../lib/config/appConfig';

export interface WorkTypeOption {
  value: WorkType;
  label: string;
}

export const WORK_TYPE_OPTIONS: WorkTypeOption[] = [
  { value: WORK_TYPES.STANDARD_ASSESSMENT, label: 'Standard Assessment' },
  { value: WORK_TYPES.EMERGENCY_RESPONSE, label: 'Emergency Response' },
  { value: WORK_TYPES.TRAVEL, label: 'Travel' },
  { value: WORK_TYPES.STANDBY, label: 'Standby' },
  { value: WORK_TYPES.ADMIN, label: 'Admin' },
  { value: WORK_TYPES.TRAINING, label: 'Training' },
];
