'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { SafetyObservations } from '@/types';

interface SafetyChecklistProps {
  value: SafetyObservations;
  onChange: (nextValue: SafetyObservations) => void;
  disabled?: boolean;
}

interface SafetyFieldConfig {
  key: keyof SafetyObservations;
  label: string;
  description: string;
}

const SAFETY_FIELDS: SafetyFieldConfig[] = [
  {
    key: 'safe_distance_maintained',
    label: 'Safe distance maintained',
    description: 'Confirm the minimum stand-off distance was maintained throughout assessment.',
  },
  {
    key: 'downed_conductors',
    label: 'Downed conductors observed',
    description: 'Any downed or partially downed conductor in the work area.',
  },
  {
    key: 'damaged_insulators',
    label: 'Damaged insulators observed',
    description: 'Cracked, broken, or burned insulator evidence present.',
  },
  {
    key: 'vegetation_contact',
    label: 'Vegetation contact present',
    description: 'Trees or branches in contact with utility equipment or conductors.',
  },
  {
    key: 'structural_damage',
    label: 'Structural damage observed',
    description: 'Pole, crossarm, or mount instability requiring attention.',
  },
  {
    key: 'fire_hazard',
    label: 'Fire hazard identified',
    description: 'Heat, smoke, arcing, or burn risk currently present.',
  },
  {
    key: 'public_accessible',
    label: 'Public can access hazard area',
    description: 'Hazards can be reached by public traffic or nearby residents.',
  },
];

function updateField(
  value: SafetyObservations,
  onChange: (nextValue: SafetyObservations) => void,
  key: keyof SafetyObservations,
  checked: boolean,
): void {
  onChange({
    ...value,
    [key]: checked,
  });
}

export function SafetyChecklist({ value, onChange, disabled = false }: SafetyChecklistProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Safety Checklist</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {SAFETY_FIELDS.map((field) => {
            const inputId = `safety-${field.key}`;

            return (
              <div key={field.key} className="rounded-md border bg-slate-50 p-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id={inputId}
                    checked={value[field.key]}
                    disabled={disabled}
                    onCheckedChange={(checked) => updateField(value, onChange, field.key, checked === true)}
                  />
                  <div className="space-y-1">
                    <Label htmlFor={inputId} className="text-sm font-medium">
                      {field.label}
                    </Label>
                    <p className="text-xs text-slate-500">{field.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
