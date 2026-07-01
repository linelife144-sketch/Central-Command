'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  assessmentCatalogService,
  type EquipmentTypeOption,
} from '@/lib/services/assessmentCatalogService';

interface EquipmentSelectProps {
  value?: string;
  utilityClient?: string;
  onSelect: (equipment: EquipmentTypeOption | null) => void;
  disabled?: boolean;
  label?: string;
  required?: boolean;
}

function toEquipmentLabel(option: EquipmentTypeOption): string {
  const details = [option.category, option.equipmentCode].filter(Boolean).join(' • ');
  return details ? `${option.equipmentName} (${details})` : option.equipmentName;
}

export function EquipmentSelect({
  value,
  utilityClient,
  onSelect,
  disabled = false,
  label = 'Equipment Type',
  required = false,
}: EquipmentSelectProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [options, setOptions] = useState<EquipmentTypeOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadOptions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const loadedOptions = await assessmentCatalogService.listEquipmentTypes();
        if (!active) {
          return;
        }

        setOptions(loadedOptions);
      } catch {
        if (!active) {
          return;
        }

        setOptions([]);
        setError('Unable to load equipment catalog.');
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadOptions();

    return () => {
      active = false;
    };
  }, []);

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) {
      return options;
    }

    const normalizedSearch = searchTerm.trim().toLowerCase();
    return options.filter((option) => {
      const searchable = [
        option.category,
        option.equipmentName,
        option.equipmentCode,
        option.voltageRating,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(normalizedSearch);
    });
  }, [options, searchTerm]);

  const selectedOption = useMemo(
    () => options.find((option) => option.id === value),
    [options, value],
  );

  const controlDisabled = disabled || isLoading;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>{label}{required ? ' *' : ''}</Label>
        {utilityClient ? <span className="text-xs text-slate-500">{utilityClient}</span> : null}
      </div>

      <Input
        placeholder="Search equipment"
        value={searchTerm}
        disabled={controlDisabled}
        onChange={(event) => setSearchTerm(event.target.value)}
      />

      <Select
        value={selectedOption?.id ?? 'none'}
        disabled={controlDisabled}
        onValueChange={(nextValue) => {
          if (nextValue === 'none') {
            onSelect(null);
            return;
          }

          const option = options.find((item) => item.id === nextValue) ?? null;
          onSelect(option);
        }}
      >
        <SelectTrigger>
          <SelectValue
            placeholder={isLoading ? 'Loading equipment catalog...' : 'Select equipment type'}
          />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Select equipment type</SelectItem>
          {filteredOptions.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {toEquipmentLabel(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isLoading ? (
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading equipment types from catalog
        </p>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
