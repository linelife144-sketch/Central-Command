// Seed the database with reference data
// Uses service_role key for RLS bypass
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load env from .env file
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seed() {
  console.log('🌱 Seeding database...\n');

  // --- Wire Sizes ---
  const wireSizes = [
    'AWG14','AWG12','AWG10','AWG8','AWG6','AWG4','AWG3','AWG2','AWG1',
    'AWG1/0','AWG2/0','AWG3/0','AWG4/0',
    'kcmil250','kcmil300','kcmil350','kcmil400','kcmil500',
    'kcmil600','kcmil700','kcmil750','kcmil800','kcmil900','kcmil1000'
  ];
  const { error: wsErr } = await supabase
    .from('wire_sizes')
    .upsert(wireSizes.map(s => ({ size_code: s })), { onConflict: 'size_code' });
  console.log(wsErr ? `❌ wire_sizes: ${wsErr.message}` : `✅ wire_sizes: ${wireSizes.length} rows`);

  // --- Equipment Types ---
  const equipmentTypes = [
    { category: 'TRANSFORMER', equipment_name: 'Pole-Mounted Distribution Transformer', equipment_code: 'XFRM-PM', voltage_rating: '15-50 kV', safe_approach_distance: 10.0, damage_indicators: ['Oil leaks','Bushing damage','Tank deformation','Cooling fin damage'] },
    { category: 'CONDUCTOR', equipment_name: 'Overhead Primary Conductor', equipment_code: 'COND-OH-P', voltage_rating: '15-35 kV', safe_approach_distance: 10.0, damage_indicators: ['Broken strands','Sagging','Burn marks','Tree contact'] },
    { category: 'INSULATOR', equipment_name: 'Pin-Type Insulator', equipment_code: 'INS-PIN', voltage_rating: '15-35 kV', safe_approach_distance: 10.0, damage_indicators: ['Cracks','Flashover marks','Missing skirts','Contamination'] },
    { category: 'INSULATOR', equipment_name: 'Suspension Insulator String', equipment_code: 'INS-SUS', voltage_rating: '69-765 kV', safe_approach_distance: 10.0, damage_indicators: ['Broken discs','Corona damage','Contamination','Mechanical damage'] },
    { category: 'PROTECTION', equipment_name: 'Fuse Cutout', equipment_code: 'PROT-FUSE', voltage_rating: '15-35 kV', safe_approach_distance: 10.0, damage_indicators: ['Blown fuse','Housing damage','Contact corrosion'] },
    { category: 'PROTECTION', equipment_name: 'Lightning Arrester', equipment_code: 'PROT-ARRESTER', voltage_rating: '15-765 kV', safe_approach_distance: 10.0, damage_indicators: ['Housing cracks','Discharge marks','Ground connection damage'] },
    { category: 'REGULATOR', equipment_name: 'Voltage Regulator', equipment_code: 'REG-VOLT', voltage_rating: '15-35 kV', safe_approach_distance: 10.0, damage_indicators: ['Oil leaks','Bushing damage','Control cabinet damage','Tap changer issues'] },
    { category: 'CAPACITOR', equipment_name: 'Shunt Capacitor Bank', equipment_code: 'CAP-SHUNT', voltage_rating: '15-35 kV', safe_approach_distance: 10.0, damage_indicators: ['Can rupture','Fuse operation','Control damage','Connection issues'] }
  ];
  const { error: etErr } = await supabase
    .from('equipment_types')
    .upsert(equipmentTypes, { onConflict: 'equipment_code' });
  console.log(etErr ? `❌ equipment_types: ${etErr.message}` : `✅ equipment_types: ${equipmentTypes.length} rows`);

  // --- Hazard Categories ---
  const hazards = [
    { hazard_name: 'Downed Conductor - Assumed Energized', hazard_code: 'HAZ-DOWN-001', description: 'Any downed or damaged conductor must be assumed energized until proven de-energized and grounded', safe_distance_feet: 35.0, ppe_required: ['Class E Hard Hat','Class 3 Safety Vest','Insulated Gloves'], immediate_actions: ['Secure the area','Notify dispatch immediately','Keep public at least 35 feet away'] },
    { hazard_name: 'Damaged Insulator', hazard_code: 'HAZ-INS-001', description: 'Cracked, broken, or contaminated insulators may flashover', safe_distance_feet: 10.0, ppe_required: ['Class E Hard Hat','Class 2 Safety Vest'], immediate_actions: ['Do not approach closer than 10 feet','Assess from safe distance','Document with telephoto lens'] },
    { hazard_name: 'Vegetation Contact', hazard_code: 'HAZ-VEG-001', description: 'Trees or branches in contact with energized conductors', safe_distance_feet: 35.0, ppe_required: ['Class E Hard Hat','Class 3 Safety Vest'], immediate_actions: ['Assume conductor is energized','Do not attempt to remove vegetation','Request vegetation management crew'] },
    { hazard_name: 'Structural Damage - Pole', hazard_code: 'HAZ-STR-001', description: 'Damaged, leaning, or compromised utility poles', safe_distance_feet: 1.5, ppe_required: ['Class E Hard Hat','Class 2 Safety Vest'], immediate_actions: ['Stay clear of pole base','Assess stability from distance','Request structural evaluation'] },
    { hazard_name: 'Fire Hazard', hazard_code: 'HAZ-FIRE-001', description: 'Equipment or conductors showing signs of overheating or fire', safe_distance_feet: 35.0, ppe_required: ['Class E Hard Hat','Class 3 Safety Vest','Fire-resistant clothing'], immediate_actions: ['Evacuate area if fire present','Notify fire department','Do not approach until fire is out'] }
  ];
  const { error: hzErr } = await supabase
    .from('hazard_categories')
    .upsert(hazards, { onConflict: 'hazard_code' });
  console.log(hzErr ? `❌ hazard_categories: ${hzErr.message}` : `✅ hazard_categories: ${hazards.length} rows`);

  // --- Expense Policies ---
  const policies = [
    { category: 'MILEAGE', policy_name: 'Standard Mileage Reimbursement', receipt_required_threshold: 0.00, auto_approve_threshold: 999999.99, mileage_rate: 0.655, mileage_rate_effective_date: '2026-01-01' },
    { category: 'FUEL', policy_name: 'Fuel Purchase Reimbursement', receipt_required_threshold: 0.01, auto_approve_threshold: 75.00, mileage_rate: null, mileage_rate_effective_date: null },
    { category: 'LODGING', policy_name: 'Lodging Reimbursement', receipt_required_threshold: 0.01, auto_approve_threshold: 150.00, mileage_rate: null, mileage_rate_effective_date: null },
    { category: 'MEALS', policy_name: 'Meals and Per Diem', receipt_required_threshold: 25.00, auto_approve_threshold: 75.00, mileage_rate: null, mileage_rate_effective_date: null },
    { category: 'TOLLS', policy_name: 'Toll Reimbursement', receipt_required_threshold: 10.00, auto_approve_threshold: 999999.99, mileage_rate: null, mileage_rate_effective_date: null },
    { category: 'PARKING', policy_name: 'Parking Reimbursement', receipt_required_threshold: 10.00, auto_approve_threshold: 50.00, mileage_rate: null, mileage_rate_effective_date: null },
    { category: 'MATERIALS', policy_name: 'Materials and Supplies', receipt_required_threshold: 0.01, auto_approve_threshold: 100.00, mileage_rate: null, mileage_rate_effective_date: null },
    { category: 'EQUIPMENT_RENTAL', policy_name: 'Equipment Rental', receipt_required_threshold: 0.01, auto_approve_threshold: 0.00, mileage_rate: null, mileage_rate_effective_date: null }
  ];
  const { error: epErr } = await supabase
    .from('expense_policies')
    .upsert(policies, { onConflict: 'category' });
  console.log(epErr ? `❌ expense_policies: ${epErr.message}` : `✅ expense_policies: ${policies.length} rows`);

  console.log('\n✅ Seed complete!');
}

seed().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
