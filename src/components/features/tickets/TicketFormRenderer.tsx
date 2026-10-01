'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  commonTicketCreateSchema,
  type TicketTemplateDefinition,
  type TicketTemplateFieldConfig,
} from '@/lib/tickets/templates';
import { TICKET_OCR_ACCEPT_ATTRIBUTE } from '@/lib/tickets/ocr/fileIntake';
import { normalizeDateTimeLocal24 } from '@/lib/utils/dateTime';

interface StormHeaderSummary {
  id: string;
  name: string;
  utilityClient: string;
  state: string;
  eventCode: string;
}

interface TicketFormRendererProps {
  storm: StormHeaderSummary;
  template: TicketTemplateDefinition;
  onSubmitTicket: (values: Record<string, unknown>) => Promise<void>;
  onRunOcr: (rawText: string) => void;
  onRunOcrFromFile?: (file: File) => Promise<void>;
  confidenceByField?: Record<string, number>;
  extractionWarnings?: string[];
  isSubmitting?: boolean;
  isExtractingOcr?: boolean;
  initialValues?: Record<string, unknown>;
}

function getFieldDefault(field: TicketTemplateFieldConfig): unknown {
  if (field.controlType === 'toggle') return false;
  if (field.controlType === 'number') return undefined;
  return '';
}

function toFieldName(name: string): string {
  return name;
}

const stormMetaLabelClass = "font-semibold text-white";
const stormMetaValueClass = "font-normal text-white/95 [font-family:'Segoe_UI',Arial,sans-serif]";
const formLabelClass = "font-normal text-white [font-family:'Segoe_UI',Arial,sans-serif]";

function applyFieldFormatting(
  value: string,
  fieldConfig: TicketTemplateFieldConfig,
  stage: 'change' | 'blur',
): string {
  const rules = fieldConfig.formattingRules;
  if (!rules) {
    return value;
  }

  let next = value;
  if (rules.transform === 'digits_only') {
    next = next.replace(/\D+/g, '');
  } else if (rules.transform === 'uppercase') {
    next = next.toUpperCase();
  } else if (rules.transform === 'trim') {
    next = next.trim();
  }

  if (stage === 'blur') {
    next = next.trim();
  }

  if (typeof rules.maxLength === 'number' && rules.maxLength > 0) {
    next = next.slice(0, rules.maxLength);
  }

  return next;
}

export function TicketFormRenderer({
  storm,
  template,
  onSubmitTicket,
  onRunOcr,
  onRunOcrFromFile,
  confidenceByField,
  extractionWarnings,
  isSubmitting = false,
  isExtractingOcr = false,
  initialValues,
}: TicketFormRendererProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const combinedSchema = useMemo(() => (template.schema as z.ZodObject).extend(commonTicketCreateSchema.shape), [template]);

  const defaultValues = useMemo(() => {
    const templateDefaults = Object.fromEntries(
      template.fieldConfig.map((field) => [field.fieldKey, getFieldDefault(field)]),
    );

    return {
      status: 'DRAFT',
      priority: 'C',
      source_type: 'MANUAL',
      source_file_id: undefined,
      raw_ocr_text: '',
      ...templateDefaults,
      ...(template.defaultValues as Record<string, unknown>),
      ...(initialValues ?? {}),
    };
  }, [initialValues, template]);

  const form = useForm<Record<string, unknown>>({
    // @ts-expect-error — zod v4 + hookform resolver v5 type mismatch
    resolver: zodResolver(combinedSchema as z.ZodTypeAny),
    defaultValues,
  });

  const lastDefaults = useRef(JSON.stringify(defaultValues));
  useEffect(() => {
    const signature = JSON.stringify(defaultValues);
    if (lastDefaults.current === signature) return;
    lastDefaults.current = signature;
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const sections = useMemo(() => {
    const map = new Map<string, TicketTemplateFieldConfig[]>();
    for (const field of template.fieldConfig) {
      const current = map.get(field.section) ?? [];
      current.push(field);
      map.set(field.section, current);
    }
    return Array.from(map.entries());
  }, [template.fieldConfig]);

  return (
    <div className="space-y-6 storm-contrast-form">
      <div className="storm-surface rounded-xl border p-4 text-sm">
        <div className="grid gap-2 md:grid-cols-2">
          <p>
            <span className={stormMetaLabelClass}>Storm:</span>{' '}
            <span className={stormMetaValueClass}>{storm.name}</span>
          </p>
          <p>
            <span className={stormMetaLabelClass}>Utility:</span>{' '}
            <span className={stormMetaValueClass}>{storm.utilityClient}</span>
          </p>
          <p>
            <span className={stormMetaLabelClass}>State:</span>{' '}
            <span className={stormMetaValueClass}>{storm.state}</span>
          </p>
          <p>
            <span className={stormMetaLabelClass}>Event code:</span>{' '}
            <span className={`font-mono text-xs ${stormMetaValueClass}`}>{storm.eventCode}</span>
          </p>
        </div>
      </div>

      <Form {...form}>
        <form
          className="space-y-6 storm-contrast-form"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmitTicket(values);
          })}
        >
          <FormField control={form.control} name="priority" render={({ field }) => (
            <FormItem><FormLabel>Priority</FormLabel><Select value={String(field.value)} onValueChange={field.onChange}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>{['A', 'B', 'C', 'X'].map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
            </Select><FormMessage /></FormItem>
          )} />
          <div className="storm-surface rounded-xl border border-[rgba(255,192,56,0.75)] p-4">
            <p className="mb-3 text-sm font-bold text-white">OCR Intake</p>
            <div className="mb-4 space-y-2">
              <FormLabel className="font-normal">Upload Source File</FormLabel>
              <Input
                type="file"
                accept={TICKET_OCR_ACCEPT_ATTRIBUTE}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setSelectedFile(file);
                }}
              />
              <p className="text-xs text-blue-100/90">
                Accepted: PDF, PNG, JPG, JPEG, HEIC, HEIF (max 25MB).
              </p>
              {selectedFile ? (
                <p className="text-xs text-blue-100">
                  Selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                </p>
              ) : null}
            </div>
            <FormField
              control={form.control}
              name="raw_ocr_text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={formLabelClass}>OCR Text</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Paste OCR output here, then click Extract" {...field} value={String(field.value ?? '')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="storm"
                disabled={!selectedFile || !onRunOcrFromFile || isExtractingOcr || isSubmitting}
                onClick={async () => {
                  if (!selectedFile || !onRunOcrFromFile) {
                    return;
                  }

                  await onRunOcrFromFile(selectedFile);
                }}
              >
                {isExtractingOcr ? 'Extracting...' : 'Extract From File'}
              </Button>
              <Button
                type="button"
                variant="storm"
                disabled={isExtractingOcr || isSubmitting}
                onClick={() => onRunOcr(String(form.getValues('raw_ocr_text') ?? ''))}
              >
                Extract Fields
              </Button>
            </div>
            {extractionWarnings?.length ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-amber-200">
                {extractionWarnings.map((warning) => (<li key={warning}>{warning}</li>))}
              </ul>
            ) : null}
          </div>

          {sections.map(([section, fields]) => (
            <div key={section} className="storm-surface rounded-xl border border-[rgba(255,192,56,0.75)] p-4">
              <h3 className="mb-3 text-sm font-bold text-white">{section}</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {fields.map((fieldConfig) => {
                  const isLowConfidence = (confidenceByField?.[fieldConfig.fieldKey] ?? 1) < 0.8;
                  return (
                    <FormField
                      key={fieldConfig.fieldKey}
                      control={form.control}
                      name={toFieldName(fieldConfig.fieldKey)}
                      render={({ field }) => {
                        const currentValue = field.value;
                        const controlType = fieldConfig.controlType;

                        return (
                          <FormItem>
                            <FormLabel className={formLabelClass}>
                              {fieldConfig.label}
                              {fieldConfig.required ? ' *' : ''}
                            </FormLabel>
                            {controlType === 'select' ? (
                              <Select value={String(currentValue ?? '')} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger className="storm-contrast-field">
                                    <SelectValue placeholder={`Select ${fieldConfig.label}`} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {(fieldConfig.enumValues ?? []).map((item) => (
                                    <SelectItem key={item} value={item}>
                                      {fieldConfig.enumLabels?.[item] ?? item}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : controlType === 'toggle' ? (
                              <FormControl>
                                <div className="flex items-center gap-2 rounded-md border border-[rgba(255,192,56,0.75)] p-2">
                                  <Checkbox checked={Boolean(currentValue)} onCheckedChange={(checked) => field.onChange(checked === true)} />
                                  <span className="text-sm">{fieldConfig.helpText ?? fieldConfig.label}</span>
                                </div>
                              </FormControl>
                            ) : controlType === 'textarea' ? (
                              <FormControl>
                                <Textarea {...field} value={String(currentValue ?? '')} />
                              </FormControl>
                            ) : controlType === 'number' ? (
                              <FormControl>
                                <Input
                                  type="number"
                                  value={typeof currentValue === 'number' ? currentValue : String(currentValue ?? '')}
                                  onChange={(event) => field.onChange(event.target.value === '' ? undefined : Number(event.target.value))}
                                />
                              </FormControl>
                            ) : controlType === 'datetime' ? (
                              <FormControl>
                                <Input
                                  type="datetime-local"
                                  lang="en-GB"
                                  {...field}
                                  value={normalizeDateTimeLocal24(currentValue)}
                                  step={60}
                                  onChange={(event) => field.onChange(normalizeDateTimeLocal24(event.target.value))}
                                />
                              </FormControl>
                            ) : (
                              <FormControl>
                                <Input
                                  {...field}
                                  inputMode={fieldConfig.formattingRules?.transform === 'digits_only' ? 'numeric' : undefined}
                                  maxLength={fieldConfig.formattingRules?.maxLength}
                                  value={String(currentValue ?? '')}
                                  onBlur={(event) => {
                                    const normalized = applyFieldFormatting(event.target.value, fieldConfig, 'blur');
                                    if (normalized !== event.target.value) {
                                      field.onChange(normalized);
                                    }
                                    field.onBlur();
                                  }}
                                  onChange={(event) => {
                                    field.onChange(applyFieldFormatting(event.target.value, fieldConfig, 'change'));
                                  }}
                                />
                              </FormControl>
                            )}
                            {isLowConfidence ? <p className="text-xs text-amber-200">Low OCR confidence. Verify this value.</p> : null}
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          <div className="flex justify-end">
            <Button type="submit" variant="storm" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Create Ticket'}</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
