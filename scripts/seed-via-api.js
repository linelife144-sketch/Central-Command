// Direct seed insertion using Supabase JS client
require('dotenv').config({path: '.env'});
const {createClient} = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seed() {
  console.log('Seeding via REST API...\n');

  // Wire Sizes
  const wireRows = [
    {size_code:'AWG14',size_name:'14 AWG',category:'AWG'},
    {size_code:'AWG12',size_name:'12 AWG',category:'AWG'},
    {size_code:'AWG10',size_name:'10 AWG',category:'AWG'},
    {size_code:'AWG8',size_name:'8 AWG',category:'AWG'},
    {size_code:'AWG6',size_name:'6 AWG',category:'AWG'},
    {size_code:'AWG4',size_name:'4 AWG',category:'AWG'},
    {size_code:'AWG3',size_name:'3 AWG',category:'AWG'},
    {size_code:'AWG2',size_name:'2 AWG',category:'AWG'},
    {size_code:'AWG1',size_name:'1 AWG',category:'AWG'},
    {size_code:'AWG1/0',size_name:'1/0 AWG',category:'AWG'},
    {size_code:'AWG2/0',size_name:'2/0 AWG',category:'AWG'},
    {size_code:'AWG3/0',size_name:'3/0 AWG',category:'AWG'},
    {size_code:'AWG4/0',size_name:'4/0 AWG',category:'AWG'},
    {size_code:'kcmil250',size_name:'250 kcmil',category:'kcmil'},
    {size_code:'kcmil300',size_name:'300 kcmil',category:'kcmil'},
    {size_code:'kcmil350',size_name:'350 kcmil',category:'kcmil'},
    {size_code:'kcmil400',size_name:'400 kcmil',category:'kcmil'},
    {size_code:'kcmil500',size_name:'500 kcmil',category:'kcmil'},
    {size_code:'kcmil600',size_name:'600 kcmil',category:'kcmil'},
    {size_code:'kcmil700',size_name:'700 kcmil',category:'kcmil'},
    {size_code:'kcmil750',size_name:'750 kcmil',category:'kcmil'},
    {size_code:'kcmil800',size_name:'800 kcmil',category:'kcmil'},
    {size_code:'kcmil900',size_name:'900 kcmil',category:'kcmil'},
    {size_code:'kcmil1000',size_name:'1000 kcmil',category:'kcmil'},
  ];
  const {error: ws} = await supabase.from('wire_sizes').upsert(wireRows, {onConflict:'size_code'});
  console.log('wire_sizes:', ws ? '❌ '+ws.message : '✅ '+wireRows.length+' rows');

  // Equipment Types
  const eqRows = [
    {category:'TRANSFORMER',equipment_name:'Pole-Mounted Distribution Transformer',equipment_code:'XFRM-PM',voltage_rating:'15-50 kV',safe_approach_distance:10.0,damage_indicators:['Oil leaks','Bushing damage','Tank deformation','Cooling fin damage']},
    {category:'CONDUCTOR',equipment_name:'Overhead Primary Conductor',equipment_code:'COND-OH-P',voltage_rating:'15-35 kV',safe_approach_distance:10.0,damage_indicators:['Broken strands','Sagging','Burn marks','Tree contact']},
    {category:'INSULATOR',equipment_name:'Pin-Type Insulator',equipment_code:'INS-PIN',voltage_rating:'15-35 kV',safe_approach_distance:10.0,damage_indicators:['Cracks','Flashover marks','Missing skirts','Contamination']},
    {category:'INSULATOR',equipment_name:'Suspension Insulator String',equipment_code:'INS-SUS',voltage_rating:'69-765 kV',safe_approach_distance:10.0,damage_indicators:['Broken discs','Corona damage','Contamination','Mechanical damage']},
    {category:'PROTECTION',equipment_name:'Fuse Cutout',equipment_code:'PROT-FUSE',voltage_rating:'15-35 kV',safe_approach_distance:10.0,damage_indicators:['Blown fuse','Housing damage','Contact corrosion']},
    {category:'PROTECTION',equipment_name:'Lightning Arrester',equipment_code:'PROT-ARRESTER',voltage_rating:'15-765 kV',safe_approach_distance:10.0,damage_indicators:['Housing cracks','Discharge marks','Ground connection damage']},
    {category:'REGULATOR',equipment_name:'Voltage Regulator',equipment_code:'REG-VOLT',voltage_rating:'15-35 kV',safe_approach_distance:10.0,damage_indicators:['Oil leaks','Bushing damage','Control cabinet damage','Tap changer issues']},
    {category:'CAPACITOR',equipment_name:'Shunt Capacitor Bank',equipment_code:'CAP-SHUNT',voltage_rating:'15-35 kV',safe_approach_distance:10.0,damage_indicators:['Can rupture','Fuse operation','Control damage','Connection issues']},
  ];
  const {error: eq} = await supabase.from('equipment_types').upsert(eqRows, {onConflict:'equipment_code'});
  console.log('equipment_types:', eq ? '❌ '+eq.message : '✅ '+eqRows.length+' rows');

  // Hazard Categories
  const hzRows = [
    {hazard_name:'Downed Conductor - Assumed Energized',hazard_code:'HAZ-DOWN-001',description:'Any downed or damaged conductor must be assumed energized until proven de-energized and grounded',safe_distance_feet:35.0,ppe_required:['Class E Hard Hat','Class 3 Safety Vest','Insulated Gloves'],immediate_actions:['Secure the area','Notify dispatch immediately','Keep public at least 35 feet away']},
    {hazard_name:'Damaged Insulator',hazard_code:'HAZ-INS-001',description:'Cracked, broken, or contaminated insulators may flashover',safe_distance_feet:10.0,ppe_required:['Class E Hard Hat','Class 2 Safety Vest'],immediate_actions:['Do not approach closer than 10 feet','Assess from safe distance','Document with telephoto lens']},
    {hazard_name:'Vegetation Contact',hazard_code:'HAZ-VEG-001',description:'Trees or branches in contact with energized conductors',safe_distance_feet:35.0,ppe_required:['Class E Hard Hat','Class 3 Safety Vest'],immediate_actions:['Assume conductor is energized','Do not attempt to remove vegetation','Request vegetation management crew']},
    {hazard_name:'Structural Damage - Pole',hazard_code:'HAZ-STR-001',description:'Damaged, leaning, or compromised utility poles',safe_distance_feet:1.5,ppe_required:['Class E Hard Hat','Class 2 Safety Vest'],immediate_actions:['Stay clear of pole base','Assess stability from distance','Request structural evaluation']},
    {hazard_name:'Fire Hazard',hazard_code:'HAZ-FIRE-001',description:'Equipment or conductors showing signs of overheating or fire',safe_distance_feet:35.0,ppe_required:['Class E Hard Hat','Class 3 Safety Vest','Fire-resistant clothing'],immediate_actions:['Evacuate area if fire present','Notify fire department','Do not approach until fire is out']},
  ];
  const {error: hz} = await supabase.from('hazard_categories').upsert(hzRows, {onConflict:'hazard_code'});
  console.log('hazard_categories:', hz ? '❌ '+hz.message : '✅ '+hzRows.length+' rows');

  // Expense Policies
  const epRows = [
    {category:'MILEAGE',policy_name:'Standard Mileage Reimbursement',receipt_required_threshold:0.00,auto_approve_threshold:999999.99,mileage_rate:0.655,mileage_rate_effective_date:'2026-01-01'},
    {category:'FUEL',policy_name:'Fuel Purchase Reimbursement',receipt_required_threshold:0.01,auto_approve_threshold:75.00,mileage_rate:null,mileage_rate_effective_date:null},
    {category:'LODGING',policy_name:'Lodging Reimbursement',receipt_required_threshold:0.01,auto_approve_threshold:150.00,mileage_rate:null,mileage_rate_effective_date:null},
    {category:'MEALS',policy_name:'Meals and Per Diem',receipt_required_threshold:25.00,auto_approve_threshold:75.00,mileage_rate:null,mileage_rate_effective_date:null},
    {category:'TOLLS',policy_name:'Toll Reimbursement',receipt_required_threshold:10.00,auto_approve_threshold:999999.99,mileage_rate:null,mileage_rate_effective_date:null},
    {category:'PARKING',policy_name:'Parking Reimbursement',receipt_required_threshold:10.00,auto_approve_threshold:50.00,mileage_rate:null,mileage_rate_effective_date:null},
    {category:'MATERIALS',policy_name:'Materials and Supplies',receipt_required_threshold:0.01,auto_approve_threshold:100.00,mileage_rate:null,mileage_rate_effective_date:null},
    {category:'EQUIPMENT_RENTAL',policy_name:'Equipment Rental',receipt_required_threshold:0.01,auto_approve_threshold:0.00,mileage_rate:null,mileage_rate_effective_date:null},
  ];
  const {error: ep} = await supabase.from('expense_policies').upsert(epRows, {onConflict:'category'});
  console.log('expense_policies:', ep ? '❌ '+ep.message : '✅ '+epRows.length+' rows');

  console.log('\nDone!');
}
seed();
