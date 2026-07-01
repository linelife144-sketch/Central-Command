'use client';

import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import type { EquipmentCondition } from '@/types';

import { createEmptyEquipmentAssessment, type EquipmentAssessmentDraft } from './assessmentFormTypes';
import { EquipmentSelect } from './EquipmentSelect';
import { WireSizeSelect } from './WireSizeSelect';

interface EquipmentAssessmentProps {
  value: EquipmentAssessmentDraft[];
  onChange: (nextValue: EquipmentAssessmentDraft[]) => void;
  disabled?: boolean;
}

const CONDITION_OPTIONS: Array<{ value: EquipmentCondition; label: string }> = [
  { value: 'GOOD', label: 'Good' },
  { value: 'FAIR', label: 'Fair' },
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'DESTROYED', label: 'Destroyed' },
];

function updateEquipmentItem(
  value: EquipmentAssessmentDraft[],
  onChange: (nextValue: EquipmentAssessmentDraft[]) => void,
  equipmentId: string,
  updates: Partial<EquipmentAssessmentDraft>,
): void {
  onChange(
    value.map((item) => (item.id === equipmentId ? { ...item, ...updates } : item)),
  );
}

function removeEquipmentItem(
  value: EquipmentAssessmentDraft[],
  onChange: (nextValue: EquipmentAssessmentDraft[]) => void,
  equipmentId: string,
): void {
  onChange(value.filter((item) => item.id !== equipmentId));
}

function addEquipmentItem(
  value: EquipmentAssessmentDraft[],
  onChange: (nextValue: EquipmentAssessmentDraft[]) => void,
): void {
  onChange([...value, createEmptyEquipmentAssessment()]);
}

export function EquipmentAssessment({ value, onChange, disabled = false }: EquipmentAssessmentProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Equipment Assessment</CardTitle>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => addEquipmentItem(value, onChange)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Equipment
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {value.length === 0 ? (
          <div className="rounded-md border border-dashed bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            No equipment items added yet.
          </div>
        ) : null}

        {value.map((item, index) => (
          <div key={item.id} className="space-y-4 rounded-md border p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Equipment {index + 1}</p>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                disabled={disabled}
                onClick={() => removeEquipmentItem(value, onChange, item.id)}
                aria-label={`Remove equipment ${index + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <EquipmentSelect
                value={item.equipmentTypeId}
                disabled={disabled}
                required
                onSelect={(equipment) =>
                  updateEquipmentItem(value, onChange, item.id, {
                    equipmentTypeId: equipment?.id ?? '',
                    equipmentType: equipment?.equipmentName ?? '',
                    condition: equipment?.defaultCondition ?? item.condition,
                  })
                }
              />

              <div className="space-y-2">
                <Label htmlFor={`equipment-tag-${item.id}`}>Asset Tag / Serial (optional)</Label>
                <Input
                  id={`equipment-tag-${item.id}`}
                  value={item.equipmentTag}
                  disabled={disabled}
                  onChange={(event) =>
                    updateEquipmentItem(value, onChange, item.id, {
                      equipmentTag: event.target.value,
                    })
                  }
                />
              </div>
            </div>

            <WireSizeSelect
              value={item.wireSizeCode}
              disabled={disabled}
              label="Primary Wire Size (optional)"
              onSelect={(wireSize) =>
                updateEquipmentItem(value, onChange, item.id, {
                  wireSizeCode: wireSize?.sizeCode ?? '',
                })
              }
            />

            <div className="space-y-2">
              <Label htmlFor={`equipment-condition-${item.id}`}>Condition</Label>
              <Select
                value={item.condition}
                disabled={disabled}
                onValueChange={(nextValue) =>
                  updateEquipmentItem(value, onChange, item.id, {
                    condition: nextValue as EquipmentCondition,
                  })
                }
              >
                <SelectTrigger id={`equipment-condition-${item.id}`}>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  {CONDITION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`equipment-description-${item.id}`}>Equipment Description</Label>
              <Textarea
                id={`equipment-description-${item.id}`}
                placeholder="Describe equipment type, mounting, and visible identifiers."
                value={item.equipmentDescription}
                disabled={disabled}
                onChange={(event) =>
                  updateEquipmentItem(value, onChange, item.id, {
                    equipmentDescription: event.target.value,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`damage-description-${item.id}`}>Damage Description</Label>
              <Textarea
                id={`damage-description-${item.id}`}
                placeholder="Describe observed damage and severity."
                value={item.damageDescription}
                disabled={disabled}
                onChange={(event) =>
                  updateEquipmentItem(value, onChange, item.id, {
                    damageDescription: event.target.value,
                  })
                }
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id={`requires-replacement-${item.id}`}
                checked={item.requiresReplacement}
                disabled={disabled}
                onCheckedChange={(checked) =>
                  updateEquipmentItem(value, onChange, item.id, {
                    requiresReplacement: checked === true,
                  })
                }
              />
              <Label htmlFor={`requires-replacement-${item.id}`}>Requires replacement</Label>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
