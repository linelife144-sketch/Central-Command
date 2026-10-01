-- Central Command - Financial Tables

-- Contractor Invoices
CREATE TABLE contractor_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  contractor_id UUID NOT NULL REFERENCES contractors(id),
  
  -- Period
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  
  -- Amounts
  subtotal_time DECIMAL(12, 2) DEFAULT 0,
  subtotal_expenses DECIMAL(12, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) DEFAULT 0,
  
  -- 1099 Tracking
  ytd_payments DECIMAL(12, 2) DEFAULT 0,
  threshold_warning BOOLEAN DEFAULT false,
  
  -- Status
  status invoice_status DEFAULT 'DRAFT',
  
  -- Dates
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id),
  paid_at TIMESTAMPTZ,
  payment_method payment_method,
  payment_reference VARCHAR(255),
  
  -- Documents
  pdf_url TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id)
);

-- Enable RLS
ALTER TABLE contractor_invoices ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_invoice_contractor ON contractor_invoices(contractor_id);
CREATE INDEX idx_invoice_status ON contractor_invoices(status);
CREATE INDEX idx_invoice_period ON contractor_invoices(billing_period_start, billing_period_end);

-- Invoice Line Items
CREATE TABLE invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES contractor_invoices(id) ON DELETE CASCADE,
  
  -- Line Item Type
  item_type VARCHAR(20) NOT NULL,
  reference_id UUID NOT NULL,
  
  -- Description
  description TEXT NOT NULL,
  
  -- Amounts
  quantity DECIMAL(10, 2),
  unit VARCHAR(20),
  rate DECIMAL(10, 2),
  amount DECIMAL(12, 2) NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

-- Tax 1099 Tracking
CREATE TABLE tax_1099_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id),
  tax_year INTEGER NOT NULL,
  
  -- Totals
  total_payments DECIMAL(12, 2) DEFAULT 0,
  total_invoices INTEGER DEFAULT 0,
  
  -- Threshold
  threshold_reached BOOLEAN DEFAULT false,
  threshold_reached_at TIMESTAMPTZ,
  
  -- Filing Status
  form_1099_issued BOOLEAN DEFAULT false,
  form_1099_issued_at TIMESTAMPTZ,
  form_1099_recipient_copy_sent BOOLEAN DEFAULT false,
  form_1099_irs_filed BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_contractor_year UNIQUE (contractor_id, tax_year)
);

-- Enable RLS
ALTER TABLE tax_1099_tracking ENABLE ROW LEVEL SECURITY;
