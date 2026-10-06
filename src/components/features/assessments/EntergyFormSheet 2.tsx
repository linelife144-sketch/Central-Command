'use client';

import { type ReactNode } from 'react';
import { ArrowUpRight, Camera, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { entergyForms, hasRowData, valueLabel, type EntergyField, type EntergyFormKind, type EntergyPayload, type EntergyValue } from '@/lib/schemas/entergyForms';

function EntergyControl({ field, value, onChange, error, id, disabled }: { field: EntergyField; value: EntergyValue | undefined; onChange: (v: EntergyValue) => void; error?: string; id: string; disabled?: boolean }) {
  const helpId = `${id}-error`;
  const attributes = { id, disabled, 'aria-required': !!field.required, 'aria-invalid': !!error, 'aria-describedby': error ? helpId : undefined };
  return <div className={field.kind === 'notes' || field.kind === 'multi' ? 'entergy-control sm:col-span-2' : 'entergy-control'}>
    {['multi', 'boolean'].includes(field.kind) ? <fieldset disabled={disabled} aria-describedby={error ? helpId : undefined}>
      <legend className="entergy-label">{field.label}{field.required && <span aria-hidden="true"> *</span>}</legend>
      <div id={id} className="entergy-options" tabIndex={-1}>{(field.kind === 'boolean' ? ['Yes', 'No'] : field.options ?? []).map(option => {
        const checked = field.kind === 'boolean' ? value === (option === 'Yes') : Array.isArray(value) && value.includes(option);
        return <label key={option} className={`entergy-option ${checked ? 'is-selected' : ''}`}><input type={field.kind === 'boolean' ? 'radio' : 'checkbox'} name={id} checked={checked} onChange={() => onChange(field.kind === 'boolean' ? option === 'Yes' : checked ? (value as string[]).filter(v => v !== option) : [...(Array.isArray(value) ? value : []), option])} /><span>{option}</span></label>;
      })}</div>
      {field.kind === 'boolean' && !field.required && typeof value === 'boolean' && <button type="button" className="mt-2 text-xs text-muted-foreground underline" onClick={() => onChange(null)}>Clear answer</button>}
    </fieldset> : <>
      <label htmlFor={id} className="entergy-label">{field.label}{field.required && <span aria-hidden="true"> *</span>}</label>
      {field.kind === 'notes' ? <Textarea {...attributes} rows={3} maxLength={4000} value={typeof value === 'string' ? value : ''} onChange={e => onChange(e.target.value)} /> : field.kind === 'select' ? <select {...attributes} className="entergy-select" value={typeof value === 'string' ? value : ''} onChange={e => onChange(e.target.value || null)}><option value="">Choose an option</option>{field.options?.map(option => <option key={option}>{option}</option>)}</select> : <Input {...attributes} type={field.kind === 'date' ? 'date' : 'text'} inputMode={['latitude', 'longitude'].includes(field.kind) ? 'decimal' : undefined} maxLength={500} value={typeof value === 'string' ? value : ''} onChange={e => onChange(e.target.value)} />}
    </>}
    {error && <p id={helpId} role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
  </div>;
}

export function EntergyFormSheet({ kind, payload, onChange, errors = {}, disabled, renderDamagePhotos }: { kind: EntergyFormKind; payload: EntergyPayload; onChange: (p: EntergyPayload) => void; errors?: Record<string,string>; disabled?: boolean; renderDamagePhotos?: (section: string) => ReactNode }) {
  const definition = entergyForms[kind];
  const changeAnswer = (key: string, value: EntergyValue) => onChange({ ...payload, answers: { ...payload.answers, [key]: value } });
  return <div className="entergy-sheet-grid">
    <nav className="entergy-section-nav" aria-label={`${definition.title} sections`}><p className="entergy-label">On this form</p>{definition.sections.map((s,i)=><a key={s.id} href={`#entergy-${s.id}`}><span>{String(i+1).padStart(2,'0')}</span>{s.title}</a>)}<a href="#entergy-evidence"><Camera size={14} />Evidence</a><a href={definition.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-4! text-grid-blue!">View source PDF<ArrowUpRight size={14} /></a></nav>
    <div className="min-w-0 space-y-5">
      {definition.sections.map((section,index) => <section key={section.id} id={`entergy-${section.id}`} className="entergy-section scroll-mt-24">
        <header className="entergy-section-header"><span className="entergy-section-number">{String(index+1).padStart(2,'0')}</span><div><h2 className="font-heading text-2xl font-semibold">{section.title}</h2><p className="mt-1 text-xs text-muted-foreground">{section.description}</p></div></header>
        <div className="p-5 sm:p-6">
          {section.repeat ? <div className="space-y-4">
            {payload[section.repeat.key].map((row,rowIndex)=><fieldset disabled={disabled} key={rowIndex} className="entergy-row"><legend className="px-2 font-heading text-lg font-semibold">{section.repeat!.key === 'equipmentRows' ? `Equipment ${String(rowIndex+1).padStart(2,'0')} · ${row.operation || 'Choose operation'}` : `Customer ${String(rowIndex+1).padStart(2,'0')}`}</legend><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{section.fields.map(field=><EntergyControl key={field.key} field={field} value={row[field.key]} id={`entergy-${section.repeat!.key}-${rowIndex}-${field.key}`} error={errors[`${section.repeat!.key}.${rowIndex}.${field.key}`]} disabled={disabled} onChange={value=>onChange({...payload,[section.repeat!.key]:payload[section.repeat!.key].map((existing,i)=>i===rowIndex?{...existing,[field.key]:value}:existing)})} />)}</div></fieldset>)}
            {errors[section.repeat.key] && <p role="alert" className="text-sm text-destructive">{errors[section.repeat.key]}</p>}
            <div className="flex flex-wrap gap-3"><Button type="button" variant="outline" size="sm" disabled={disabled || payload[section.repeat.key].length>=60} onClick={()=>onChange({...payload,[section.repeat!.key]:[...payload[section.repeat!.key],Object.fromEntries(section.fields.map(f=>[f.key,f.kind==='multi'?[]:null]))]})}><Plus size={14}/>Add {section.repeat.key==='equipmentRows'?'equipment':'customer'} row</Button><Button type="button" variant="ghost" size="sm" disabled={disabled || payload[section.repeat.key].length<=section.repeat.minimumRows || hasRowData(payload[section.repeat.key].at(-1)!,section.repeat.key==='equipmentRows')} onClick={()=>onChange({...payload,[section.repeat!.key]:payload[section.repeat!.key].slice(0,-1)})}>Remove last empty row</Button></div>
          </div> : <div className="grid gap-5 sm:grid-cols-2">{section.fields.map(field=><EntergyControl key={field.key} field={field} value={payload.answers[field.key]} id={`entergy-answer-${field.key}`} onChange={v=>changeAnswer(field.key,v)} error={errors[field.key]} disabled={disabled} />)}</div>}
          {!['scope','location','customerSite','signoff','notes','transfers'].includes(section.id) && <div className="entergy-damage-block mt-5">
            <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" disabled={disabled} checked={section.id in payload.damageReports} onChange={event=>{const reports={...payload.damageReports};if(event.target.checked)reports[section.id]='';else delete reports[section.id];onChange({...payload,damageReports:reports});}}/>Damage observed in this section</label>
            {section.id in payload.damageReports && <div className="mt-4 space-y-4"><label htmlFor={`entergy-damage-${section.id}`} className="entergy-label">Describe the damage *</label><Textarea id={`entergy-damage-${section.id}`} disabled={disabled} maxLength={2000} value={payload.damageReports[section.id]} onChange={e=>onChange({...payload,damageReports:{...payload.damageReports,[section.id]:e.target.value}})} />{errors[`damageReports.${section.id}`] && <p role="alert" className="text-xs text-destructive">{errors[`damageReports.${section.id}`]}</p>}{renderDamagePhotos?.(section.id)}</div>}
          </div>}
        </div>
      </section>)}
    </div>
  </div>;
}

export function EntergyReadback({ kind, payload, renderDamagePhotos }: { kind: EntergyFormKind; payload: EntergyPayload; renderDamagePhotos?: (section: string) => ReactNode }) {
  return <div className="space-y-5">{entergyForms[kind].sections.map(section=>{
    const rows=section.repeat?payload[section.repeat.key].filter(row=>hasRowData(row,section.repeat!.key==='equipmentRows')):null;
    return <section key={section.id}><h3 className="font-heading text-xl font-semibold text-grid-navy">{section.title}</h3>{rows ? rows.length ? rows.map((row,i)=><div key={i} className="mt-3 rounded-xl border p-3"><p className="mb-3 text-xs font-semibold">{section.repeat!.key==='equipmentRows'?'Equipment':'Customer'} {i+1}</p><dl className="grid gap-3 sm:grid-cols-2">{section.fields.map(field=><div key={field.key}><dt className="text-xs text-muted-foreground">{field.label}</dt><dd className="mt-1 break-words whitespace-pre-wrap text-sm">{valueLabel(row[field.key])}</dd></div>)}</dl></div>) : <p className="mt-2 text-sm text-muted-foreground">No rows recorded.</p> : <dl className="mt-3 grid gap-3 sm:grid-cols-2">{section.fields.map(field=><div key={field.key}><dt className="text-xs text-muted-foreground">{field.label}</dt><dd className="mt-1 break-words whitespace-pre-wrap text-sm">{valueLabel(payload.answers[field.key])}</dd></div>)}</dl>}{section.id in payload.damageReports && <div className="mt-3 rounded-lg border border-grid-lightning/40 p-3"><p className="text-xs font-semibold">Reported damage</p><p className="mt-2 whitespace-pre-wrap text-sm">{payload.damageReports[section.id]}</p>{renderDamagePhotos?.(section.id)}</div>}</section>;
  })}</div>;
}
