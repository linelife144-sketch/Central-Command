import { describe, expect, it } from 'vitest';
import { emptyEntergyPayload, entergyErrors, entergyForms, validateEntergyPayload, validateEntergyPhotos } from './entergyForms';

export function validCleanUp() {
  const p=emptyEntergyPayload('cleanup');
  Object.assign(p.answers,{environmentalCleanup:'None',trashCleanup:'Wood poles: 2',address:'100 Utility Lane',cityTown:'Shreveport',dloc:'00001234567',truckAccess:false,notes:'Truck access blocked at gate'});
  return p;
}
export function validDamage() {
  const p=emptyEntergyPayload('damage');
  Object.assign(p.answers,{date:'2026-10-06',equipmentTypes:['Pole'],activities:['Install/Remove'],fromDloc:'00001234567',fieldAddressComments:'100 Utility Lane',signature:'QA Assessor',workOrderNumber:'00042',employeeId:'C-001'});
  return p;
}
const views=['OVERVIEW','EQUIPMENT','DAMAGE','SAFETY'].map((type,i)=>({id:`photo-${i}`,type,gpsLatitude:32.4,gpsLongitude:-93.7}));
describe('official Entergy source coverage and validation',()=>{
  it('retains all printed equipment and activity options',()=>{
    const fields=entergyForms.damage.sections[0].fields;
    expect(fields.find(f=>f.key==='equipmentTypes')?.options).toEqual(['Transformer','Recloser','Regulator','Switch','Switch Gear','Pole','AutoTransformer','Streetlight','Capacitor','Breaker','Sectionalizer','Fault Indicator','Communication Device','Private Area Light']);
    expect(fields.find(f=>f.key==='activities')?.options).toEqual(['Install','Relocate','Remove','Install/Remove','Other','Misc.']);
  });
  it('creates six equipment rows and three customer-transfer rows with every source column',()=>{
    const p=emptyEntergyPayload('damage');expect(p.equipmentRows).toHaveLength(6);expect(p.customerRows).toHaveLength(3);
    expect(p.equipmentRows.map(r=>r.operation)).toEqual(['Install','Remove','Install','Remove','Install','Remove']);
    expect(Object.keys(p.equipmentRows[0])).toEqual(['operation','type','size','companyEquipmentNumber','manufacturerSerialNumber','phases','fieldPhase','counterReading']);
    expect(Object.keys(p.customerRows[0])).toEqual(['customerNameAddress','identifierTypes','identifier','oldDlocTransformer','newDlocTransformer']);
  });
  it('retains the rare switch, communication, control and customer options',()=>{
    const fields=entergyForms.damage.sections.flatMap(s=>s.fields);
    expect(fields.find(f=>f.key==='bypassSwitchTypes')?.options).toEqual(['Disconnect','Fuse','Solid Blade','GOAB','Fuse Around','Other']);
    expect(fields.find(f=>f.key==='fieldPhase')?.options).toEqual(['F','M','R','T','C','B']);
    expect(fields.find(f=>f.key==='identifierTypes')?.options).toEqual(['Account #','Meter #','Net Metering #']);
    expect(fields.find(f=>f.key==='controlReasons')?.options).toEqual(['PID','Replacement','New Installation']);
  });
  it('allows partial drafts and requires explicit truck access at submission',()=>{
    expect(entergyErrors('cleanup',emptyEntergyPayload('cleanup'),false)).toEqual({});
    expect(entergyErrors('cleanup',emptyEntergyPayload('cleanup')).truckAccess).toBeDefined();
    expect(validateEntergyPayload('cleanup',validCleanUp()).answers.truckAccess).toBe(false);
  });
  it('retains DLOC, serial, work-order and employee identifiers as text including leading zeros',()=>{
    const p=validateEntergyPayload('damage',validDamage());expect(p.answers.fromDloc).toBe('00001234567');expect(p.answers.workOrderNumber).toBe('00042');
  });
  it('rejects unknown keys, choices, duplicates and field types',()=>{
    const p=validDamage();p.answers.equipmentTypes=['Pole','Imaginary'];expect(()=>validateEntergyPayload('damage',p)).toThrow('printed options');
    p.answers.equipmentTypes=['Pole','Pole'];expect(entergyErrors('damage',p).equipmentTypes).toBeDefined();
    p.answers.equipmentTypes=['Pole'];p.answers.extra='unsafe';expect(entergyErrors('damage',p).extra).toBeDefined();
  });
  it('requires complete used equipment and customer-transfer rows while leaving unused rows blank',()=>{
    const p=validDamage();expect(entergyErrors('damage',p)).toEqual({});
    p.equipmentRows[0].size='40/4';expect(entergyErrors('damage',p)['equipmentRows.0.type']).toBeDefined();p.equipmentRows[0].type='Pole';
    p.customerRows[0].identifier='000100';expect(entergyErrors('damage',p)['customerRows.0.customerNameAddress']).toBeDefined();
    Object.assign(p.customerRows[0],{customerNameAddress:'QA Customer',identifierTypes:['Meter #'],oldDlocTransformer:'00001',newDlocTransformer:'00002'});expect(entergyErrors('damage',p)).toEqual({});
  });
  it('validates dates and paired GPS without numeric conversion of identifiers',()=>{
    const p=validDamage();p.answers.date='2026-02-30';expect(entergyErrors('damage',p).date).toBeDefined();p.answers.date='2026-10-06';p.answers.latitude='91';expect(entergyErrors('damage',p).latitude).toBeDefined();expect(entergyErrors('damage',p).longitude).toBeDefined();
    p.answers.latitude='32.4';p.answers.longitude='-93.7';expect(entergyErrors('damage',p)).toEqual({});
  });
  it('allows new lighting work without a map and reads earlier saved map data',()=>{
    const p=validDamage();p.answers.equipmentTypes=['Streetlight'];p.answers.activities=['Install'];expect(entergyErrors('damage',p)).toEqual({});
    p.answers.lightingMapNotes='Earlier saved legend';p.lightingMap=[{points:[[0,0],[500,300]]}];expect(entergyErrors('damage',p)).toEqual({});
  });
  it('does not accept damage-only records inside a clean-up form',()=>{const p=validCleanUp();p.equipmentRows=[{}];expect(entergyErrors('cleanup',p).form).toBeDefined();});
  it('requires GPS evidence and a photo beside every explicitly reported damage section',()=>{
    const p=validDamage();p.damageReports.pole='Split pole';expect(()=>validateEntergyPhotos(views,p)).toThrow('inside every section');
    expect(()=>validateEntergyPhotos(views.map(v=>v.type==='DAMAGE'?{...v,sectionKey:'entergy:pole'}:v),p)).not.toThrow();
    expect(()=>validateEntergyPhotos(views.map(v=>({...v,gpsLatitude:undefined})),p)).toThrow('GPS');
  });
  it('rejects section evidence after that damage report is removed',()=>expect(()=>validateEntergyPhotos(views.map(v=>v.type==='DAMAGE'?{...v,sectionKey:'entergy:pole'}:v),validDamage())).toThrow('does not match'));
});
