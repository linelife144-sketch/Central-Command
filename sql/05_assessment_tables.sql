-- Central Command - Assessment Tables

-- Equipment Types (Catalog)
CREATE TABLE equipment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Classification
  category VARCHAR(100) NOT NULL,
  equipment_name VARCHAR(255) NOT NULL,
  equipment_code VARCHAR(50),
  
  -- Specifications
  voltage_rating VARCHAR(50),
  manufacturer VARCHAR(100),
  model_pattern VARCHAR(100),
  
  -- Damage Indicators
  damage_indicators JSONB,
  replacement_criteria JSONB,
  
  -- Safety
  safe_approach_distance DECIMAL(5, 2),
  ppe_requirements VARCHAR(100)[],
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE equipment_types ENABLE ROW LEVEL SECURITY;

-- Hazard Categories
CREATE TABLE hazard_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Classification
  hazard_name VARCHAR(255) NOT NULL,
  hazard_code VARCHAR(50) NOT NULL UNIQUE,
  
  -- Safety Protocol
  description TEXT,
  safe_distance_feet DECIMAL(5, 2),
  voltage_assumption VARCHAR(50),
  
  -- PPE Requirements
  ppe_required VARCHAR(100)[],
  
  -- Response Protocol
  immediate_actions TEXT[],
  notification_required BOOLEAN DEFAULT false,
  notification_targets VARCHAR(100)[],
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE hazard_categories ENABLE ROW LEVEL SECURITY;

-- Damage Assessments
CREATE TABLE damage_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL UNIQUE REFERENCES tickets(id),
  subcontractor_id UUID NOT NULL REFERENCES subcontractors(id),
  
  -- Safety Observations
  safety_observations JSONB DEFAULT '{}'::jsonb,
  
  -- Damage Classification
  damage_cause VARCHAR(100),
  weather_conditions VARCHAR(255),
  estimated_repair_hours INTEGER,
  priority priority_level,
  
  -- Recommendations
  immediate_actions TEXT,
  repair_vs_replace VARCHAR(50),
  estimated_repair_cost DECIMAL(12, 2),
  
  -- Signatures
  assessed_by UUID REFERENCES profiles(id),
  assessed_at TIMESTAMPTZ,
  digital_signature TEXT,
  
  -- Admin Review
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- Sync
  sync_status sync_status DEFAULT 'SYNCED',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id)
);

-- Enable RLS
ALTER TABLE damage_assessments ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_assessment_ticket ON damage_assessments(ticket_id);
CREATE INDEX idx_assessment_subcontractor ON damage_assessments(subcontractor_id);

-- Equipment Assessments
CREATE TABLE equipment_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  damage_assessment_id UUID NOT NULL REFERENCES damage_assessments(id) ON DELETE CASCADE,
  equipment_type_id UUID REFERENCES equipment_types(id),
  
  -- Equipment Details
  equipment_tag VARCHAR(100),
  equipment_description VARCHAR(255),
  
  -- Condition
  condition equipment_condition NOT NULL,
  damage_description TEXT,
  requires_replacement BOOLEAN DEFAULT false,
  
  -- Photos
  photo_urls TEXT[],
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE equipment_assessments ENABLE ROW LEVEL SECURITY;

-- Wire Sizes Reference Table
CREATE TABLE wire_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  size_code VARCHAR(20) NOT NULL UNIQUE,
  size_name VARCHAR(50) NOT NULL,
  category VARCHAR(20) NOT NULL, -- 'AWG' or 'kcmil'
  typical_use TEXT,
  ampacity INTEGER,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE wire_sizes ENABLE ROW LEVEL SECURITY;
