'use client';

import type { WorkType } from '../../../types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { WORK_TYPE_OPTIONS } from './workTypeOptions';

export interface WorkTypeSelectorProps {
  value: WorkType;
  onValueChange: (value: WorkType) => void;
  disabled?: boolean;
}

export function WorkTypeSelector({ value, onValueChange, disabled = false }: WorkTypeSelectorProps) {
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(nextValue) => onValueChange(nextValue as WorkType)}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select work type" />
      </SelectTrigger>
      <SelectContent>
        {WORK_TYPE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
