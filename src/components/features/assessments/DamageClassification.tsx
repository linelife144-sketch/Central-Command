'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { PriorityLevel, RepairDecision } from '@/types';

import type { DamageClassificationDraft } from './assessmentFormTypes';

interface DamageClassificationProps {
  value: DamageClassificationDraft;
  onChange: (nextValue: DamageClassificationDraft) => void;
  disabled?: boolean;
}

const DAMAGE_CAUSE_OPTIONS = [
  { value: 'WEATHER', label: 'Weather Event' },
  { value: 'VEHICLE_IMPACT', label: 'Vehicle Impact' },
  { value: 'EQUIPMENT_FAILURE', label: 'Equipment Failure' },
  { value: 'VEGETATION', label: 'Vegetation Contact' },
  { value: 'ANIMAL_CONTACT', label: 'Animal Contact' },
  { value: 'UNKNOWN', label: 'Unknown' },
  { value: 'OTHER', label: 'Other' },
] as const;

const PRIORITY_OPTIONS: Array<{ value: PriorityLevel; label: string }> = [
  { value: 'A', label: 'A - Critical' },
  { value: 'B', label: 'B - Urgent' },
  { value: 'C', label: 'C - Standard' },
  { value: 'X', label: 'X - Hold' },
];

const REPAIR_DECISION_OPTIONS: Array<{ value: RepairDecision; label: string }> = [
  { value: 'REPAIR', label: 'Repair' },
  { value: 'REPLACE', label: 'Replace' },
  { value: 'ENGINEERING_REVIEW', label: 'Engineering Review' },
];

function updateValue<K extends keyof DamageClassificationDraft>(
  value: DamageClassificationDraft,
  onChange: (nextValue: DamageClassificationDraft) => void,
  key: K,
  nextValue: DamageClassificationDraft[K],
): void {
  onChange({
    ...value,
    [key]: nextValue,
  });
}

export function DamageClassification({ value, onChange, disabled = false }: DamageClassificationProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Damage Classification</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="damage-cause">Damage Cause</Label>
            <Select
              value={value.damageCause || 'none'}
              disabled={disabled}
              onValueChange={(nextValue) =>
                updateValue(value, onChange, 'damageCause', nextValue === 'none' ? '' : nextValue)
              }
            >
              <SelectTrigger id="damage-cause">
                <SelectValue placeholder="Select cause" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select cause</SelectItem>
                {DAMAGE_CAUSE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="damage-priority">Priority</Label>
            <Select
              value={value.priority}
              disabled={disabled}
              onValueChange={(nextValue) =>
                updateValue(value, onChange, 'priority', nextValue as PriorityLevel)
              }
            >
              <SelectTrigger id="damage-priority">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="weather-conditions">Weather Conditions</Label>
            <Input
              id="weather-conditions"
              placeholder="Clear, rain, wind, etc."
              value={value.weatherConditions}
              disabled={disabled}
              onChange={(event) =>
                updateValue(value, onChange, 'weatherConditions', event.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimated-repair-hours">Estimated Repair Hours</Label>
            <Input
              id="estimated-repair-hours"
              type="number"
              min="0"
              step="0.5"
              placeholder="0"
              value={value.estimatedRepairHours}
              disabled={disabled}
              onChange={(event) =>
                updateValue(value, onChange, 'estimatedRepairHours', event.target.value)
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="immediate-actions">Immediate Actions</Label>
          <Textarea
            id="immediate-actions"
            placeholder="Describe immediate safety controls and operational actions."
            value={value.immediateActions}
            disabled={disabled}
            onChange={(event) => updateValue(value, onChange, 'immediateActions', event.target.value)}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="repair-vs-replace">Recommendation</Label>
            <Select
              value={value.repairVsReplace}
              disabled={disabled}
              onValueChange={(nextValue) =>
                updateValue(value, onChange, 'repairVsReplace', nextValue as RepairDecision)
              }
            >
              <SelectTrigger id="repair-vs-replace">
                <SelectValue placeholder="Select recommendation" />
              </SelectTrigger>
              <SelectContent>
                {REPAIR_DECISION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimated-repair-cost">Estimated Repair Cost (USD)</Label>
            <Input
              id="estimated-repair-cost"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={value.estimatedRepairCost}
              disabled={disabled}
              onChange={(event) =>
                updateValue(value, onChange, 'estimatedRepairCost', event.target.value)
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
