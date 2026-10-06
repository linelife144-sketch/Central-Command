import React, { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { EntergyFormSheet, EntergyReadback } from './EntergyFormSheet';
import { emptyEntergyPayload, type EntergyFormKind } from '@/lib/schemas/entergyForms';
afterEach(cleanup);
function Editor({kind='damage'}:{kind?:EntergyFormKind}) { const [p,setP]=useState(()=>emptyEntergyPayload(kind));return <EntergyFormSheet kind={kind} payload={p} onChange={setP}/>; }
describe('Entergy field-sheet interactions',()=>{
  it('keeps multiple equipment/activity checkboxes independent',()=>{
    render(<Editor/>);const equipment=screen.getByRole('group',{name:/Equipment type/});
    fireEvent.click(within(equipment).getByRole('checkbox',{name:'Transformer'}));fireEvent.click(within(equipment).getByRole('checkbox',{name:'Pole'}));
    expect((within(equipment).getByRole('checkbox',{name:'Transformer'}) as HTMLInputElement).checked).toBe(true);
    expect((within(equipment).getByRole('checkbox',{name:'Pole'}) as HTMLInputElement).checked).toBe(true);
  });
  it('starts truck access unanswered and records an explicit No',()=>{
    render(<Editor kind="cleanup"/>);const no=screen.getByRole('radio',{name:'No'}) as HTMLInputElement;expect(no.checked).toBe(false);fireEvent.click(no);expect(no.checked).toBe(true);expect((screen.getByRole('radio',{name:'Yes'}) as HTMLInputElement).checked).toBe(false);
  });
  it('supports additional equipment/customer rows and does not remove entered data',()=>{
    render(<Editor/>);fireEvent.click(screen.getByRole('button',{name:'Add equipment row'}));
    const row=screen.getByRole('group',{name:'Equipment 07 · Choose operation'});fireEvent.change(within(row).getByLabelText('Company equipment number'),{target:{value:'0000942'}});
    expect((screen.getAllByRole('button',{name:'Remove last empty row'})[0] as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button',{name:'Add customer row'}));expect(screen.getByRole('group',{name:'Customer 04'})).toBeTruthy();
  });
  it('keeps field phase codes and phase A/B/C on every equipment row',()=>{
    render(<Editor/>);const row=screen.getByRole('group',{name:'Equipment 01 · Install'});
    expect(within(row).getByRole('combobox',{name:'Field phase'}).children).toHaveLength(7);
    expect(within(row).getByRole('checkbox',{name:'A'})).toBeTruthy();expect(within(row).getByRole('checkbox',{name:'C'})).toBeTruthy();
  });
  it('renders damage entry and associated evidence in the reported section',()=>{
    const p=emptyEntergyPayload('damage');p.damageReports.pole='Split pole';const renderPhotos=vi.fn(()=> <p>Section photo control</p>);
    render(<EntergyFormSheet kind="damage" payload={p} onChange={()=>{}} renderDamagePhotos={renderPhotos}/>);
    expect(renderPhotos).toHaveBeenCalledWith('pole');expect(screen.getByLabelText('Describe the damage *')).toBeTruthy();
  });
  it('omits the lighting map drawing and legend while retaining lighting details',()=>{
    render(<Editor/>);expect(screen.queryByRole('img',{name:'Lighting site map drawing area'})).toBeNull();expect(screen.queryByLabelText('Lighting map description / legend')).toBeNull();expect(screen.getByLabelText('Street light · Wattage')).toBeTruthy();
  });
  it('reads all selected codes, identifiers and customer rows back without coercion',()=>{
    const p=emptyEntergyPayload('damage');p.answers.equipmentTypes=['Transformer','Pole'];p.equipmentRows[0].companyEquipmentNumber='0000942';p.equipmentRows[0].fieldPhase='F';p.customerRows[0].identifier='000088';p.customerRows[0].identifierTypes=['Meter #'];
    render(<EntergyReadback kind="damage" payload={p}/>);expect(screen.getByText('Transformer · Pole')).toBeTruthy();expect(screen.getByText('0000942')).toBeTruthy();expect(screen.getByText('000088')).toBeTruthy();expect(screen.getByText('Meter #')).toBeTruthy();
  });
});
