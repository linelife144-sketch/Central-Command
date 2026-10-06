import { describe, expect, it } from 'vitest';
import { allAssessmentFields, emptyFieldAnswers, normalizeFieldAnswers, fieldErrors, validateFieldAssessment, requiresAssessmentEscalation, damagePhotoErrors, validateAssessmentPhotos } from './fieldAssessment';
function complete() {
  const answers = emptyFieldAnswers();
  for (const field of allAssessmentFields) if (!field.when) answers[field.key] = field.kind === 'boolean' ? false : field.kind === 'select' ? field.options![0] : 'None';
  return answers;
}
describe('required top-down field assessment', () => {
  it('starts with every yes/no unanswered', () => expect(Object.values(emptyFieldAnswers()).every(value => value === null)).toBe(true));
  it('accepts an explicitly inspected no-damage site', () => expect(() => validateFieldAssessment({ version: 1, answers: complete() })).not.toThrow());
  it.each(allAssessmentFields.filter(field => !field.when))('requires $label', field => {
    const answers = complete(); answers[field.key] = null; expect(fieldErrors(answers)[field.key]).toBeTruthy();
  });
  it('requires details only for positive damage answers', () => {
    const answers = complete(); answers.poleBroken = true;
    expect(Object.keys(fieldErrors(answers))).toEqual(expect.arrayContaining(['poleHeight','poleAccessible','poleDamage']));
    Object.assign(answers,{poleHeight:'40',poleAccessible:false,poleDamage:'Broken at base, access blocked'});
    expect(fieldErrors(answers)).toEqual({});
  });
  it('rejects values outside predefined conductor and span lists', () => {
    const answers = complete(); Object.assign(answers,{conductorBroken:true,conductorSize:'999',spansDown:'11',conductorDamage:'Broken'});
    expect(fieldErrors(answers)).toHaveProperty('conductorSize'); expect(fieldErrors(answers)).toHaveProperty('spansDown');
  });
  it('clears all descendants when a parent changes to No', () => {
    const answers = complete(); Object.assign(answers,{hasCrossArm:false,crossArmsDamaged:true,crossArmMaterial:'WOOD',crossArmCount:3,crossArmDamage:'Broken'});
    const normalized = normalizeFieldAnswers(answers); expect(normalized.crossArmsDamaged).toBeNull(); expect(normalized.crossArmCount).toBeNull(); expect(normalized.crossArmDamage).toBeNull();
  });
  it('requires positive integer counts', () => {
    for (const count of [0,-1,1.5,Infinity]) {const answers=complete();Object.assign(answers,{insulatorsBroken:true,insulatorCount:count,insulatorDamage:'Broken'});expect(fieldErrors(answers).insulatorCount).toBeTruthy();}
  });
  it.each(['publicDanger','oilLeak'])('escalates for %s independently', key => {
    const answers=complete(); answers[key]=true; expect(requiresAssessmentEscalation({version:1,answers})).toBe(true);
  });
  it('rejects unknown keys and versions', () => {
    expect(() => validateFieldAssessment({version:1,answers:{...complete(),unexpected:true}})).toThrow('Unknown');
    expect(() => validateFieldAssessment({version:2 as 1,answers:complete()})).toThrow('version');
  });
});

describe('damage photo section requirements',()=>{
 const photos=['OVERVIEW','EQUIPMENT','DAMAGE','SAFETY'].map((type,index)=>({id:String(index),type,gpsLatitude:30,gpsLongitude:-90}));
 it('does not require section evidence for a no-damage assessment',()=>expect(()=>validateAssessmentPhotos(complete(),photos)).not.toThrow());
 it.each(['treeDamage','poleDamage','conductorDamage','transformerDamage','serviceDamage','crossArmDamage','insulatorDamage','publicDangerDetails','oilLeakDetails'])('requires evidence beside %s',key=>{
   const field=allAssessmentFields.find(field=>field.key===key)!;const answers=complete();answers[field.when!.key]=true;if(key==='crossArmDamage')answers.hasCrossArm=true;
   expect(damagePhotoErrors(answers,photos)[key]).toBeTruthy();
   expect(damagePhotoErrors(answers,[...photos,{...photos[2],id:'section',sectionKey:key}])[key]).toBeUndefined();
 });
 it('does not accept a photo from another damaged section',()=>{const answers=complete();answers.poleBroken=true;expect(()=>validateAssessmentPhotos(answers,[...photos,{...photos[2],id:'other',sectionKey:'conductorDamage'}])).toThrow(/pole/i);});
 it('requires independent cross arm and insulator evidence',()=>{const answers=complete();Object.assign(answers,{hasCrossArm:true,crossArmsDamaged:true,insulatorsBroken:true});expect(Object.keys(damagePhotoErrors(answers,[...photos,{...photos[2],id:'arm',sectionKey:'crossArmDamage'}]))).toEqual(['insulatorDamage']);});
 it('rejects duplicate IDs and invalid GPS',()=>{expect(()=>validateAssessmentPhotos(complete(),photos.map(photo=>({...photo,id:'same'})))).toThrow('unique');expect(()=>validateAssessmentPhotos(complete(),photos.map(photo=>({...photo,gpsLatitude:NaN})))).toThrow('GPS');});
});
