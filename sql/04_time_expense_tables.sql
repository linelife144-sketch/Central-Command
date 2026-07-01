-- Central Command - Time & Expense Tables

-- Time Entries
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcontractor_id UUID NOT NULL REFERENCES subcontractors(id),
  ticket_id UUID REFERENCES tickets(id),
  
  -- Clock In
  clock_in_at TIMESTAMPTZ NOT NULL,
  clock_in_latitude DECIMAL(10, 8),
  clock_in_longitude DECIMAL(11, 8),
  clock_in_accuracy DECIMAL(8, 2),
  clock_in_photo_url TEXT,
  clock_in_ip INET,
  clock_in_user_agent TEXT,
  
  -- Clock Out
  clock_out_at TIMESTAMPTZ,
  clock_out_latitude DECIMAL(10, 8),
  clock_out_longitude DECIMAL(11, 8),
  clock_out_accuracy DECIMAL(8, 2),
  clock_out_photo_url TEXT,
  clock_out_ip INET,
  
  -- Work Classification
  work_type work_type NOT NULL,
  work_type_rate DECIMAL(10, 2) NOT NULL,
  
  -- Calculations
  total_minutes INTEGER GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (COALESCE(clock_out_at, clock_in_at) - clock_in_at)) / 60
  ) STORED,
  break_minutes INTEGER DEFAULT 0,
  billable_minutes INTEGER GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (COALESCE(clock_out_at, clock_in_at) - clock_in_at)) / 60 - break_minutes
  ) STORED,
  billable_amount DECIMAL(12, 2) GENERATED ALWAYS AS (
    (EXTRACT(EPOCH FROM (COALESCE(clock_out_at, clock_in_at) - clock_in_at)) / 60 - break_minutes) / 60 * work_type_rate
  ) STORED,
  
  -- Status
  status VARCHAR(20) DEFAULT 'PENDING',
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Invoice Linkage
  invoice_id UUID,
  
  -- Sync
  sync_status sync_status DEFAULT 'SYNCED',
  sync_error TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  is_deleted BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_time_subcontractor ON time_entries(subcontractor_id);
CREATE INDEX idx_time_ticket ON time_entries(ticket_id);
CREATE INDEX idx_time_status ON time_entries(status);
CREATE INDEX idx_time_clock_in ON time_entries(clock_in_at);
CREATE INDEX idx_time_invoice ON time_entries(invoice_id);

-- Expense Reports
CREATE TABLE expense_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcontractor_id UUID NOT NULL REFERENCES subcontractors(id),
  
  -- Period
  report_period_start DATE NOT NULL,
  report_period_end DATE NOT NULL,
  
  -- Summary
  total_amount DECIMAL(12, 2) DEFAULT 0,
  mileage_total DECIMAL(10, 2) DEFAULT 0,
  item_count INTEGER DEFAULT 0,
  
  -- Status
  status expense_status DEFAULT 'DRAFT',
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Invoice Linkage
  invoice_id UUID,
  
  -- Sync
  sync_status sync_status DEFAULT 'SYNCED',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  is_deleted BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE expense_reports ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_expense_report_subcontractor ON expense_reports(subcontractor_id);
CREATE INDEX idx_expense_report_status ON expense_reports(status);
CREATE INDEX idx_expense_report_period ON expense_reports(report_period_start, report_period_end);

-- Expense Items
CREATE TABLE expense_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_report_id UUID NOT NULL REFERENCES expense_reports(id) ON DELETE CASCADE,
  
  -- Classification
  category expense_category NOT NULL,
  description TEXT NOT NULL,
  
  -- Amount
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Date
  expense_date DATE NOT NULL,
  
  -- Receipt
  receipt_url TEXT,
  receipt_ocr_text TEXT,
  
  -- Mileage Specific
  mileage_start DECIMAL(10, 2),
  mileage_end DECIMAL(10, 2),
  mileage_rate DECIMAL(6, 4),
  mileage_calculated_amount DECIMAL(10, 2),
  
  -- Location
  from_location VARCHAR(255),
  to_location VARCHAR(255),
  
  -- Policy Validation
  policy_flags VARCHAR(50)[],
  requires_approval BOOLEAN DEFAULT false,
  approval_reason TEXT,
  
  -- Ticket Linkage
  ticket_id UUID REFERENCES tickets(id),
  
  -- Billable
  billable_to_client BOOLEAN DEFAULT false,
  client_markup_percent DECIMAL(5, 2) DEFAULT 0,
  client_billable_amount DECIMAL(10, 2),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id)
);

-- Enable RLS
ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_expense_item_report ON expense_items(expense_report_id);
CREATE INDEX idx_expense_item_category ON expense_items(category);
CREATE INDEX idx_expense_item_date ON expense_items(expense_date);

-- Expense Policies
CREATE TABLE expense_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Policy Definition
  category expense_category NOT NULL,
  policy_name VARCHAR(255) NOT NULL,
  
  -- Limits
  receipt_required_threshold DECIMAL(10, 2) DEFAULT 25.00,
  auto_approve_threshold DECIMAL(10, 2) DEFAULT 75.00,
  daily_limit DECIMAL(10, 2),
  
  -- Mileage
  mileage_rate DECIMAL(6, 4),
  mileage_rate_effective_date DATE,
  
  -- Per Diem
  per_diem_rate DECIMAL(10, 2),
  per_diem_location VARCHAR(100),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id)
);

-- Enable RLS
ALTER TABLE expense_policies ENABLE ROW LEVEL SECURITY;
