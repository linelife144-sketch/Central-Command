-- Central Command - Core Tables

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  role user_role NOT NULL DEFAULT 'CONTRACTOR',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_email_verified BOOLEAN DEFAULT false,
  last_login_at TIMESTAMPTZ,
  
  -- MFA
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_secret_encrypted TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id)
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_active ON profiles(is_active);

-- Subcontractors table
CREATE TABLE subcontractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Business Information
  business_name VARCHAR(255) NOT NULL,
  business_type VARCHAR(50),
  tax_id VARCHAR(50),
  tax_id_encrypted TEXT,
  
  -- Address
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(2),
  zip_code VARCHAR(10),
  
  -- Contact
  business_phone VARCHAR(20),
  business_email VARCHAR(255),
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  
  -- Status
  onboarding_status VARCHAR(50) DEFAULT 'PENDING',
  onboarding_completed_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  
  -- Eligibility
  is_eligible_for_assignment BOOLEAN DEFAULT false,
  eligibility_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  is_deleted BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE subcontractors ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_subcontractors_profile ON subcontractors(profile_id);
CREATE INDEX idx_subcontractors_status ON subcontractors(onboarding_status);
CREATE INDEX idx_subcontractors_eligible ON subcontractors(is_eligible_for_assignment);

-- Subcontractor Rates
CREATE TABLE subcontractor_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcontractor_id UUID NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,
  
  -- Rate Definition
  work_type work_type NOT NULL,
  hourly_rate DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Effective Period
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  
  -- Constraints
  CONSTRAINT unique_active_rate UNIQUE (subcontractor_id, work_type, effective_from)
);

-- Enable RLS
ALTER TABLE subcontractor_rates ENABLE ROW LEVEL SECURITY;

-- Subcontractor Banking
CREATE TABLE subcontractor_banking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcontractor_id UUID NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,
  
  -- Bank Details (Encrypted)
  account_holder_name VARCHAR(255) NOT NULL,
  bank_name VARCHAR(255),
  account_type VARCHAR(20),
  
  -- Encrypted Fields
  account_number_encrypted TEXT NOT NULL,
  routing_number_encrypted TEXT NOT NULL,
  
  -- Masked for display
  account_number_masked VARCHAR(20),
  
  -- Verification
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  
  -- Status
  is_primary BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id)
);

-- Enable RLS
ALTER TABLE subcontractor_banking ENABLE ROW LEVEL SECURITY;
