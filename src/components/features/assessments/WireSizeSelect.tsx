'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  assessmentCatalogService,
  type WireSizeOption,
} from '@/lib/services/assessmentCatalogService';

interface WireSizeSelectProps {
  value?: string;
  onSelect: (wireSize: WireSizeOption | null) => void;
  disabled?: boolean;
  label?: string;
  required?: boolean;
}

function toWireSizeLabel(option: WireSizeOption): string {
  if (option.typicalUse) {
    return `${option.sizeCode} - ${option.typicalUse}`;
  }

  return option.sizeCode;
}

export function WireSizeSelect({
  value,
  onSelect,
  disabled = false,
  label = 'Wire Size',
  required = false,
}: WireSizeSelectProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [options, setOptions] = useState<WireSizeOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadOptions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const loadedOptions = await assessmentCatalogService.listWireSizes();
        if (!active) {
          return;
        }

        setOptions(loadedOptions);
      } catch {
        if (!active) {
          return;
        }

        setOptions([]);
        setError('Unable to load wire size catalog.');
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
      const searchable = [option.sizeCode, option.sizeName, option.category, option.typicalUse]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(normalizedSearch);
    });
  }, [options, searchTerm]);

  const groupedOptions = useMemo(() => {
    const groups: Record<string, WireSizeOption[]> = {
      AWG: [],
      kcmil: [],
      OTHER: [],
    };

    for (const option of filteredOptions) {
      groups[option.category].push(option);
    }

    return groups;
  }, [filteredOptions]);

  const selectedOption = useMemo(
    () => options.find((option) => option.sizeCode === value),
    [options, value],
  );

  const controlDisabled = disabled || isLoading;

  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required ? ' *' : ''}
      </Label>

      <Input
        placeholder="Search wire size"
        value={searchTerm}
        disabled={controlDisabled}
        onChange={(event) => setSearchTerm(event.target.value)}
      />

      <Select
        value={selectedOption?.sizeCode ?? 'none'}
        disabled={controlDisabled}
        onValueChange={(nextValue) => {
          if (nextValue === 'none') {
            onSelect(null);
            return;
          }

          onSelect(options.find((option) => option.sizeCode === nextValue) ?? null);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder={isLoading ? 'Loading wire sizes...' : 'Select wire size'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Select wire size</SelectItem>
          {groupedOptions.AWG.length > 0 ? (
            <SelectGroup>
              <SelectLabel>AWG</SelectLabel>
              {groupedOptions.AWG.map((option) => (
                <SelectItem key={option.id} value={option.sizeCode}>
                  {toWireSizeLabel(option)}
                </SelectItem>
              ))}
            </SelectGroup>
          ) : null}

          {groupedOptions.kcmil.length > 0 ? (
            <SelectGroup>
              <SelectLabel>kcmil</SelectLabel>
              {groupedOptions.kcmil.map((option) => (
                <SelectItem key={option.id} value={option.sizeCode}>
                  {toWireSizeLabel(option)}
                </SelectItem>
              ))}
            </SelectGroup>
          ) : null}

          {groupedOptions.OTHER.length > 0 ? (
            <SelectGroup>
              <SelectLabel>Other</SelectLabel>
              {groupedOptions.OTHER.map((option) => (
                <SelectItem key={option.id} value={option.sizeCode}>
                  {toWireSizeLabel(option)}
                </SelectItem>
              ))}
            </SelectGroup>
          ) : null}
        </SelectContent>
      </Select>

      {isLoading ? (
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading wire sizes from catalog
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
