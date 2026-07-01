-- Central Command - Seed Data

-- Wire Sizes (24 standard sizes)
INSERT INTO wire_sizes (size_code, size_name, category) VALUES
('AWG14', '14 AWG', 'AWG'),
('AWG12', '12 AWG', 'AWG'),
('AWG10', '10 AWG', 'AWG'),
('AWG8', '8 AWG', 'AWG'),
('AWG6', '6 AWG', 'AWG'),
('AWG4', '4 AWG', 'AWG'),
('AWG3', '3 AWG', 'AWG'),
('AWG2', '2 AWG', 'AWG'),
('AWG1', '1 AWG', 'AWG'),
('AWG1/0', '1/0 AWG', 'AWG'),
('AWG2/0', '2/0 AWG', 'AWG'),
('AWG3/0', '3/0 AWG', 'AWG'),
('AWG4/0', '4/0 AWG', 'AWG'),
('kcmil250', '250 kcmil', 'kcmil'),
('kcmil300', '300 kcmil', 'kcmil'),
('kcmil350', '350 kcmil', 'kcmil'),
('kcmil400', '400 kcmil', 'kcmil'),
('kcmil500', '500 kcmil', 'kcmil'),
('kcmil600', '600 kcmil', 'kcmil'),
('kcmil700', '700 kcmil', 'kcmil'),
('kcmil750', '750 kcmil', 'kcmil'),
('kcmil800', '800 kcmil', 'kcmil'),
('kcmil900', '900 kcmil', 'kcmil'),
('kcmil1000', '1000 kcmil', 'kcmil');

-- Equipment Types
INSERT INTO equipment_types (category, equipment_name, equipment_code, voltage_rating, safe_approach_distance, damage_indicators) VALUES
('TRANSFORMER', 'Pole-Mounted Distribution Transformer', 'XFRM-PM', '15-50 kV', 10.0, '["Oil leaks", "Bushing damage", "Tank deformation", "Cooling fin damage"]'),
('CONDUCTOR', 'Overhead Primary Conductor', 'COND-OH-P', '15-35 kV', 10.0, '["Broken strands", "Sagging", "Burn marks", "Tree contact"]'),
('INSULATOR', 'Pin-Type Insulator', 'INS-PIN', '15-35 kV', 10.0, '["Cracks", "Flashover marks", "Missing skirts", "Contamination"]'),
('INSULATOR', 'Suspension Insulator String', 'INS-SUS', '69-765 kV', 10.0, '["Broken discs", "Corona damage", "Contamination", "Mechanical damage"]'),
('PROTECTION', 'Fuse Cutout', 'PROT-FUSE', '15-35 kV', 10.0, '["Blown fuse", "Housing damage", "Contact corrosion"]'),
('PROTECTION', 'Lightning Arrester', 'PROT-ARRESTER', '15-765 kV', 10.0, '["Housing cracks", "Discharge marks", "Ground connection damage"]'),
('REGULATOR', 'Voltage Regulator', 'REG-VOLT', '15-35 kV', 10.0, '["Oil leaks", "Bushing damage", "Control cabinet damage", "Tap changer issues"]'),
('CAPACITOR', 'Shunt Capacitor Bank', 'CAP-SHUNT', '15-35 kV', 10.0, '["Can rupture", "Fuse operation", "Control damage", "Connection issues"]');

-- Hazard Categories
INSERT INTO hazard_categories (hazard_name, hazard_code, description, safe_distance_feet, ppe_required, immediate_actions) VALUES
('Downed Conductor - Assumed Energized', 'HAZ-DOWN-001', 'Any downed or damaged conductor must be assumed energized until proven de-energized and grounded', 35.0, ARRAY['Class E Hard Hat', 'Class 3 Safety Vest', 'Insulated Gloves'], ARRAY['Secure the area', 'Notify dispatch immediately', 'Keep public at least 35 feet away']),
('Damaged Insulator', 'HAZ-INS-001', 'Cracked, broken, or contaminated insulators may flashover', 10.0, ARRAY['Class E Hard Hat', 'Class 2 Safety Vest'], ARRAY['Do not approach closer than 10 feet', 'Assess from safe distance', 'Document with telephoto lens']),
('Vegetation Contact', 'HAZ-VEG-001', 'Trees or branches in contact with energized conductors', 35.0, ARRAY['Class E Hard Hat', 'Class 3 Safety Vest'], ARRAY['Assume conductor is energized', 'Do not attempt to remove vegetation', 'Request vegetation management crew']),
('Structural Damage - Pole', 'HAZ-STR-001', 'Damaged, leaning, or compromised utility poles', 1.5, ARRAY['Class E Hard Hat', 'Class 2 Safety Vest'], ARRAY['Stay clear of pole base', 'Assess stability from distance', 'Request structural evaluation']),
('Fire Hazard', 'HAZ-FIRE-001', 'Equipment or conductors showing signs of overheating or fire', 35.0, ARRAY['Class E Hard Hat', 'Class 3 Safety Vest', 'Fire-resistant clothing'], ARRAY['Evacuate area if fire present', 'Notify fire department', 'Do not approach until fire is out']);

-- Expense Policies
INSERT INTO expense_policies (category, policy_name, receipt_required_threshold, auto_approve_threshold, mileage_rate, mileage_rate_effective_date) VALUES
('MILEAGE', 'Standard Mileage Reimbursement', 0.00, 999999.99, 0.655, '2026-01-01'),
('FUEL', 'Fuel Purchase Reimbursement', 0.01, 75.00, NULL, NULL),
('LODGING', 'Lodging Reimbursement', 0.01, 150.00, NULL, NULL),
('MEALS', 'Meals and Per Diem', 25.00, 75.00, NULL, NULL),
('TOLLS', 'Toll Reimbursement', 10.00, 999999.99, NULL, NULL),
('PARKING', 'Parking Reimbursement', 10.00, 50.00, NULL, NULL),
('MATERIALS', 'Materials and Supplies', 0.01, 100.00, NULL, NULL),
('EQUIPMENT_RENTAL', 'Equipment Rental', 0.01, 0.00, NULL, NULL);
