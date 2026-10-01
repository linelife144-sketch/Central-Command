# Central Command — DATABASE SCHEMA

## Supabase PostgreSQL Schema Definition

**Version:** 1.0  
**Date:** February 4, 2026  
**Environment:** Supabase (PostgreSQL 15+)

---

## TABLE OF CONTENTS

1. [Schema Overview](#1-schema-overview)
2. [Enum Types](#2-enum-types)
3. [Core Tables](#3-core-tables)
4. [Ticket System Tables](#4-ticket-system-tables)
5. [Time & Expense Tables](#5-time--expense-tables)
6. [Assessment Tables](#6-assessment-tables)
7. [Financial Tables](#7-financial-tables)
8. [Audit & Logging Tables](#8-audit--logging-tables)
9. [Indexes](#9-indexes)
10. [Row-Level Security Policies](#10-row-level-security-policies)
11. [Triggers & Functions](#11-triggers--functions)

---

## 1. SCHEMA OVERVIEW

### 1.1 Schema Design Principles

- **Normalization:** 3NF for core entities, denormalized views for performance
- **RLS-First:** Every table has Row-Level Security enabled by default
- **Audit Trail:** All changes tracked with `created_at`, `updated_at`, `created_by`, `updated_by`
- **Soft Deletes:** `is_deleted` flag with trigger-based archiving
- **UUID Primary Keys:** All tables use `uuid` type for IDs

### 1.2 Schema Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SCHEMA OVERVIEW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  AUTHENTICATION LAYER                                                        │
│  ├── profiles (extends auth.users)                                           │
│  ├── user_roles                                                              │
│  └── sessions                                                                │
│                                                                              │
│  CONTRACTOR MANAGEMENT                                                    │
│  ├── contractors                                                          │
│  ├── contractor_credentials                                               │
│  ├── contractor_rates                                                     │
│  └── contractor_banking                                                   │
│                                                                              │
│  TICKET SYSTEM                                                               │
│  ├── tickets                                                                 │
│  ├── ticket_status_history                                                   │
│  ├── ticket_assignments                                                      │
│  └── ticket_routes                                                           │
│                                                                              │
│  TIME & EXPENSE                                                              │
│  ├── time_entries                                                            │
│  ├── expense_reports                                                         │
│  ├── expense_items                                                           │
│  └── expense_policies                                                        │
│                                                                              │
│  DAMAGE ASSESSMENT                                                           │
│  ├── damage_assessments                                                      │
│  ├── equipment_assessments                                                   │
│  ├── equipment_types                                                         │
│  └── hazard_categories                                                       │
│                                                                              │
│  MEDIA & DOCUMENTS                                                           │
│  ├── media_assets                                                            │
│  └── documents                                                               │
│                                                                              │
│  FINANCIAL                                                                   │
│  ├── contractor_invoices                                                  │
│  ├── invoice_line_items                                                      │
│  ├── payments                                                                │
│  └── tax_1099_tracking                                                       │
│                                                                              │
│  AUDIT & COMPLIANCE                                                          │
│  ├── audit_logs                                                              │
│  ├── notification_logs                                                       │
│  └── sync_queue                                                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. ENUM TYPES

```sql
-- User Roles
CREATE TYPE user_role AS ENUM (
  'SUPER_ADMIN',
  'ADMIN',
  'TEAM_LEAD',
  'CONTRACTOR',
  'READ_ONLY'
);

-- Ticket Status
CREATE TYPE ticket_status AS ENUM (
  'DRAFT',
  'ASSIGNED',
  'REJECTED',
  'IN_ROUTE',
  'ON_SITE',
  'IN_PROGRESS',
  'COMPLETE',
  'PENDING_REVIEW',
  'APPROVED',
  'NEEDS_REWORK',
  'CLOSED',
  'ARCHIVED',
  'EXPIRED'
);

-- Priority Levels (NFPA 70B)
CREATE TYPE priority_level AS ENUM ('A', 'B', 'C', 'X');

-- Work Types
CREATE TYPE work_type AS ENUM (
  'STANDARD_ASSESSMENT',
  'EMERGENCY_RESPONSE',
  'TRAVEL',
  'STANDBY',
  'ADMIN',
  'TRAINING'
);

-- Expense Categories
CREATE TYPE expense_category AS ENUM (
  'MILEAGE',
  'FUEL',
  'LODGING',
  'MEALS',
  'TOLLS',
  'PARKING',
  'MATERIALS',
  'EQUIPMENT_RENTAL',
  'OTHER'
);

-- Expense Status
CREATE TYPE expense_status AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'PAID'
);

-- Invoice Status
CREATE TYPE invoice_status AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'PAID',
  'VOID'
);

-- Payment Methods
CREATE TYPE payment_method AS ENUM ('ACH', 'CHECK', 'WIRE', 'OTHER');

-- Equipment Condition
CREATE TYPE equipment_condition AS ENUM (
  'GOOD',
  'FAIR',
  'DAMAGED',
  'DESTROYED'
);

-- Media Types
CREATE TYPE media_type AS ENUM (
  'PHOTO',
  'VIDEO',
  'DOCUMENT',
  'SIGNATURE'
);

-- Sync Status
CREATE TYPE sync_status AS ENUM (
  'SYNCED',
  'PENDING',
  'FAILED',
  'CONFLICT'
);

-- Notification Types
CREATE TYPE notification_type AS ENUM (
  'TICKET_ASSIGNED',
  'TICKET_UPDATED',
  'TIME_APPROVED',
  'EXPENSE_APPROVED',
  'INVOICE_GENERATED',
  'PAYMENT_PROCESSED',
  'DOCUMENT_EXPIRING',
  'SAFETY_ALERT'
);
```

---

## 3. CORE TABLES

### 3.1 Profiles (Extends auth.users)

```sql
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
```

### 3.2 Contractors

```sql
CREATE TABLE contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Business Information
  business_name VARCHAR(255) NOT NULL,
  business_type VARCHAR(50), -- LLC, Corp, Sole Prop, etc. // TODO: Enum and possibly remove
  tax_id VARCHAR(50), -- EIN or SSN
  tax_id_encrypted TEXT, -- Encrypted version
  
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
  onboarding_status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, COMPLETE, APPROVED, SUSPENDED
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
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_contractors_profile ON contractors(profile_id);
CREATE INDEX idx_contractors_status ON contractors(onboarding_status);
CREATE INDEX idx_contractors_eligible ON contractors(is_eligible_for_assignment);
CREATE INDEX idx_contractors_tax_id ON contractors(tax_id);
```

### 3.3 Contractor Credentials

```sql
CREATE TABLE contractor_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  
  -- Credential Type
  credential_type VARCHAR(100) NOT NULL, -- INSURANCE_GL, INSURANCE_WC, INSURANCE_AUTO, LICENSE_ELECTRICAL, CERTIFICATION_OSHA, etc.
  credential_name VARCHAR(255) NOT NULL,
  
  -- Details
  issuer VARCHAR(255),
  credential_number VARCHAR(100),
  
  -- Dates
  issue_date DATE,
  expiration_date DATE NOT NULL,
  
  -- Document
  document_url TEXT,
  
  -- Verification
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMPTZ,
  verification_notes TEXT,
  
  -- Alerts
  alert_sent_30d BOOLEAN DEFAULT false,
  alert_sent_60d BOOLEAN DEFAULT false,
  alert_sent_90d BOOLEAN DEFAULT false,
  
  -- Status
  status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, EXPIRED, EXPIRING_SOON, REVOKED
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id)
);

-- Enable RLS
ALTER TABLE contractor_credentials ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_credentials_contractor ON contractor_credentials(contractor_id);
CREATE INDEX idx_credentials_type ON contractor_credentials(credential_type);
CREATE INDEX idx_credentials_expiration ON contractor_credentials(expiration_date);
CREATE INDEX idx_credentials_status ON contractor_credentials(status);
```

### 3.4 Contractor Rates

```sql
CREATE TABLE contractor_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  
  -- Rate Definition
  work_type work_type NOT NULL,
  hourly_rate DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Effective Period
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE, -- NULL means current
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  
  -- Constraints
  CONSTRAINT unique_active_rate UNIQUE (contractor_id, work_type, effective_from)
);

-- Enable RLS
ALTER TABLE contractor_rates ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_rates_contractor ON contractor_rates(contractor_id);
CREATE INDEX idx_rates_work_type ON contractor_rates(work_type);
CREATE INDEX idx_rates_effective ON contractor_rates(effective_from, effective_to);
```

### 3.5 Contractor Banking

```sql
CREATE TABLE contractor_banking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  
  -- Bank Details (Encrypted)
  account_holder_name VARCHAR(255) NOT NULL,
  bank_name VARCHAR(255),
  account_type VARCHAR(20), -- CHECKING, SAVINGS
  
  -- Encrypted Fields
  account_number_encrypted TEXT NOT NULL,
  routing_number_encrypted TEXT NOT NULL,
  
  -- Masked for display
  account_number_masked VARCHAR(20), -- ****1234
  
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
ALTER TABLE contractor_banking ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_banking_contractor ON contractor_banking(contractor_id);
CREATE INDEX idx_banking_primary ON contractor_banking(contractor_id, is_primary);
```

---

## 4. TICKET SYSTEM TABLES

### 4.1 Tickets

```sql
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number VARCHAR(50) NOT NULL UNIQUE,
  
  -- Status
  status ticket_status NOT NULL DEFAULT 'DRAFT',
  priority priority_level NOT NULL DEFAULT 'C',
  
  -- Location
  address TEXT NOT NULL,
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(2),
  zip_code VARCHAR(10),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  geofence_radius_meters INTEGER DEFAULT 500,
  
  -- Assignment
  assigned_to UUID REFERENCES contractors(id),
  assigned_by UUID REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ,
  
  -- Timing
  created_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_date DATE,
  due_date DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Client Info
  utility_client VARCHAR(255) NOT NULL,
  work_order_ref VARCHAR(100),
  client_contact_name VARCHAR(100),
  client_contact_phone VARCHAR(20),
  
  -- Work Details
  work_description TEXT,
  special_instructions TEXT,
  
  -- Damage Classification (populated after assessment)
  damage_types VARCHAR(100)[],
  severity VARCHAR(20),
  
  -- Route Optimization
  route_order INTEGER,
  route_batch_id UUID,
  estimated_travel_time INTEGER, -- minutes
  
  -- Metadata
  created_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES profiles(id)
);

-- Enable RLS
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_assigned ON tickets(assigned_to);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_client ON tickets(utility_client);
CREATE INDEX idx_tickets_scheduled ON tickets(scheduled_date);
CREATE INDEX idx_tickets_coordinates ON tickets USING GIST (
  point(longitude, latitude)
);
CREATE INDEX idx_tickets_number ON tickets(ticket_number);
```

### 4.2 Ticket Status History

```sql
CREATE TABLE ticket_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  
  -- Status Change
  from_status ticket_status,
  to_status ticket_status NOT NULL,
  
  -- Who/When
  changed_by UUID REFERENCES profiles(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Location Context
  gps_latitude DECIMAL(10, 8),
  gps_longitude DECIMAL(11, 8),
  gps_accuracy DECIMAL(8, 2),
  
  -- Device Context
  ip_address INET,
  user_agent TEXT,
  device_fingerprint VARCHAR(255),
  
  -- Reason
  change_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ticket_status_history ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_status_history_ticket ON ticket_status_history(ticket_id);
CREATE INDEX idx_status_history_changed ON ticket_status_history(changed_at);
```

### 4.3 Ticket Routes (Route Optimization)

```sql
CREATE TABLE ticket_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_name VARCHAR(255) NOT NULL,
  
  -- Assignment
  assigned_to UUID REFERENCES contractors(id),
  assigned_by UUID REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ,
  
  -- Route Details
  ticket_ids UUID[] NOT NULL,
  total_distance_miles DECIMAL(8, 2),
  estimated_duration_minutes INTEGER,
  
  -- Optimization
  optimization_type VARCHAR(20), -- SHORTEST, FASTEST, PRIORITY
  
  -- Status
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, ACTIVE, COMPLETED, CANCELLED
  
  -- Timing
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Metadata
  created_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ticket_routes ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_routes_assigned ON ticket_routes(assigned_to);
CREATE INDEX idx_routes_status ON ticket_routes(status);
```

---

## 5. TIME & EXPENSE TABLES

### 5.1 Time Entries

```sql
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id),
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
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
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
CREATE INDEX idx_time_contractor ON time_entries(contractor_id);
CREATE INDEX idx_time_ticket ON time_entries(ticket_id);
CREATE INDEX idx_time_status ON time_entries(status);
CREATE INDEX idx_time_clock_in ON time_entries(clock_in_at);
CREATE INDEX idx_time_invoice ON time_entries(invoice_id);
CREATE INDEX idx_time_sync ON time_entries(sync_status);
```

### 5.2 Expense Reports

```sql
CREATE TABLE expense_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id),
  
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
CREATE INDEX idx_expense_report_contractor ON expense_reports(contractor_id);
CREATE INDEX idx_expense_report_status ON expense_reports(status);
CREATE INDEX idx_expense_report_period ON expense_reports(report_period_start, report_period_end);
CREATE INDEX idx_expense_report_invoice ON expense_reports(invoice_id);
```

### 5.3 Expense Items

```sql
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
  mileage_rate DECIMAL(6, 4), -- IRS rate per mile
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
CREATE INDEX idx_expense_item_ticket ON expense_items(ticket_id);
```

### 5.4 Expense Policies

```sql
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
  mileage_rate DECIMAL(6, 4), -- Current IRS rate
  mileage_rate_effective_date DATE,
  
  -- Per Diem
  per_diem_rate DECIMAL(10, 2),
  per_diem_location VARCHAR(100), -- City/Region
  
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

-- Indexes
CREATE INDEX idx_expense_policy_category ON expense_policies(category);
CREATE INDEX idx_expense_policy_active ON expense_policies(is_active);
```

---

## 6. ASSESSMENT TABLES

### 6.1 Equipment Types (Catalog)

```sql
CREATE TABLE equipment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Classification
  category VARCHAR(100) NOT NULL, -- TRANSFORMER, CONDUCTOR, INSULATOR, etc.
  equipment_name VARCHAR(255) NOT NULL,
  equipment_code VARCHAR(50),
  
  -- Specifications
  voltage_rating VARCHAR(50),
  manufacturer VARCHAR(100),
  model_pattern VARCHAR(100), -- Regex pattern for model matching
  
  -- Damage Indicators
  damage_indicators JSONB, -- Array of common damage signs
  replacement_criteria JSONB, -- When to repair vs replace
  
  -- Safety
  safe_approach_distance DECIMAL(5, 2), -- feet
  ppe_requirements VARCHAR(100)[],
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE equipment_types ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_equipment_category ON equipment_types(category);
CREATE INDEX idx_equipment_active ON equipment_types(is_active);
```

### 6.2 Hazard Categories

```sql
CREATE TABLE hazard_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Classification
  hazard_name VARCHAR(255) NOT NULL,
  hazard_code VARCHAR(50) NOT NULL UNIQUE,
  
  -- Safety Protocol
  description TEXT,
  safe_distance_feet DECIMAL(5, 2),
  voltage_assumption VARCHAR(50), -- e.g., "Assume energized"
  
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

-- Indexes
CREATE INDEX idx_hazard_code ON hazard_categories(hazard_code);
CREATE INDEX idx_hazard_active ON hazard_categories(is_active);
```

### 6.3 Damage Assessments

```sql
CREATE TABLE damage_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL UNIQUE REFERENCES tickets(id),
  contractor_id UUID NOT NULL REFERENCES contractors(id),
  
  -- Safety Observations
  safety_observations JSONB DEFAULT '{}'::jsonb,
  -- {
  --   "downed_conductors": boolean,
  --   "damaged_insulators": boolean,
  --   "vegetation_contact": boolean,
  --   "structural_damage": boolean,
  --   "fire_hazard": boolean,
  --   "public_accessible": boolean,
  --   "safe_distance_maintained": boolean
  -- }
  
  -- Damage Classification
  damage_cause VARCHAR(100),
  weather_conditions VARCHAR(255),
  estimated_repair_hours INTEGER,
  priority priority_level,
  
  -- Recommendations
  immediate_actions TEXT,
  repair_vs_replace VARCHAR(50), -- REPAIR, REPLACE, ENGINEERING_REVIEW
  estimated_repair_cost DECIMAL(12, 2),
  
  -- Signatures
  assessed_by UUID REFERENCES profiles(id),
  assessed_at TIMESTAMPTZ,
  digital_signature TEXT, -- Encrypted signature data
  
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
CREATE INDEX idx_assessment_contractor ON damage_assessments(contractor_id);
CREATE INDEX idx_assessment_sync ON damage_assessments(sync_status);
```

### 6.4 Equipment Assessments

```sql
CREATE TABLE equipment_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  damage_assessment_id UUID NOT NULL REFERENCES damage_assessments(id) ON DELETE CASCADE,
  equipment_type_id UUID REFERENCES equipment_types(id),
  
  -- Equipment Details
  equipment_tag VARCHAR(100), -- Asset tag if visible
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

-- Indexes
CREATE INDEX idx_equip_assessment ON equipment_assessments(damage_assessment_id);
CREATE INDEX idx_equip_type ON equipment_assessments(equipment_type_id);
```

---

## 7. FINANCIAL TABLES

### 7.1 Contractor Invoices

```sql
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
CREATE INDEX idx_invoice_number ON contractor_invoices(invoice_number);
```

### 7.2 Invoice Line Items

```sql
CREATE TABLE invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES contractor_invoices(id) ON DELETE CASCADE,
  
  -- Line Item Type
  item_type VARCHAR(20) NOT NULL, -- TIME_ENTRY, EXPENSE_REPORT
  reference_id UUID NOT NULL, -- time_entry_id or expense_report_id
  
  -- Description
  description TEXT NOT NULL,
  
  -- Amounts
  quantity DECIMAL(10, 2),
  unit VARCHAR(20), -- HOURS, MILES, EACH
  rate DECIMAL(10, 2),
  amount DECIMAL(12, 2) NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_line_item_invoice ON invoice_line_items(invoice_id);
CREATE INDEX idx_line_item_type ON invoice_line_items(item_type);
```

### 7.3 Tax 1099 Tracking

```sql
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

-- Indexes
CREATE INDEX idx_1099_contractor ON tax_1099_tracking(contractor_id);
CREATE INDEX idx_1099_year ON tax_1099_tracking(tax_year);
CREATE INDEX idx_1099_threshold ON tax_1099_tracking(threshold_reached);
```

---

## 8. MEDIA & DOCUMENT TABLES

### 8.1 Media Assets

```sql
CREATE TABLE media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership
  uploaded_by UUID REFERENCES profiles(id),
  contractor_id UUID REFERENCES contractors(id),
  
  -- File Info
  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255),
  file_type media_type NOT NULL,
  mime_type VARCHAR(100),
  file_size_bytes INTEGER,
  
  -- Storage
  storage_bucket VARCHAR(100) NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT,
  thumbnail_url TEXT,
  
  -- EXIF Data (for photos)
  exif_data JSONB,
  captured_at TIMESTAMPTZ,
  gps_latitude DECIMAL(10, 8),
  gps_longitude DECIMAL(11, 8),
  gps_accuracy DECIMAL(8, 2),
  
  -- Verification
  checksum_sha256 VARCHAR(64),
  
  -- Context
  entity_type VARCHAR(50), -- TICKET, ASSESSMENT, EXPENSE, etc.
  entity_id UUID,
  
  -- Status
  upload_status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, COMPLETED, FAILED
  
  -- Retention
  retention_until DATE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_media_uploader ON media_assets(uploaded_by);
CREATE INDEX idx_media_entity ON media_assets(entity_type, entity_id);
CREATE INDEX idx_media_type ON media_assets(file_type);
CREATE INDEX idx_media_status ON media_assets(upload_status);
CREATE INDEX idx_media_coordinates ON media_assets USING GIST (
  point(gps_longitude, gps_latitude)
) WHERE gps_latitude IS NOT NULL;
```

---

## 9. AUDIT & LOGGING TABLES

### 9.1 Audit Logs

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Action Details
  action VARCHAR(100) NOT NULL, -- CREATE, UPDATE, DELETE, LOGIN, etc.
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID,
  
  -- User Context
  user_id UUID REFERENCES profiles(id),
  user_role user_role,
  
  -- Change Details
  old_values JSONB,
  new_values JSONB,
  change_summary TEXT,
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(255),
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Partitioning (for performance)
  created_date DATE DEFAULT CURRENT_DATE
);

-- Enable RLS (admins only)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- Partition by month for performance
-- CREATE TABLE audit_logs_y2026m01 PARTITION OF audit_logs
--   FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```

### 9.2 Notification Logs

```sql
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Recipient
  user_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Notification Details
  notification_type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  
  -- Delivery
  channel VARCHAR(20), -- PUSH, EMAIL, SMS, IN_APP
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  
  -- Status
  status VARCHAR(20) DEFAULT 'SENT', -- SENT, DELIVERED, READ, FAILED
  error_message TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_notification_user ON notification_logs(user_id);
CREATE INDEX idx_notification_type ON notification_logs(notification_type);
CREATE INDEX idx_notification_status ON notification_logs(status);
```

### 9.3 Sync Queue (Offline Support)

```sql
CREATE TABLE sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Operation
  operation VARCHAR(20) NOT NULL, -- CREATE, UPDATE, DELETE
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  
  -- Data
  payload JSONB NOT NULL,
  
  -- Ownership
  user_id UUID NOT NULL REFERENCES profiles(id),
  device_id VARCHAR(255),
  
  -- Status
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, PROCESSING, COMPLETED, FAILED, CONFLICT
  attempt_count INTEGER DEFAULT 0,
  last_error TEXT,
  
  -- Timing
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  
  -- Retry
  retry_after TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_sync_user ON sync_queue(user_id);
CREATE INDEX idx_sync_status ON sync_queue(status);
CREATE INDEX idx_sync_created ON sync_queue(created_at);
CREATE INDEX idx_sync_retry ON sync_queue(retry_after);
```

---

## 10. INDEXES

### 10.1 Performance Indexes Summary

```sql
-- Foreign Key Indexes (automatically created, but listed for reference)
-- All foreign key columns have indexes

-- Composite Indexes for Common Queries
CREATE INDEX idx_tickets_assigned_status ON tickets(assigned_to, status);
CREATE INDEX idx_time_entries_contractor_date ON time_entries(contractor_id, clock_in_at);
CREATE INDEX idx_expense_reports_contractor_period ON expense_reports(contractor_id, report_period_start);
CREATE INDEX idx_contractor_credentials_expiring ON contractor_credentials(contractor_id, expiration_date) 
  WHERE expiration_date <= CURRENT_DATE + INTERVAL '90 days';

-- Full-Text Search Indexes
CREATE INDEX idx_tickets_address_search ON tickets USING gin(to_tsvector('english', address));
CREATE INDEX idx_expense_items_description_search ON expense_items USING gin(to_tsvector('english', description));

-- Partial Indexes
CREATE INDEX idx_active_tickets ON tickets(id) WHERE is_deleted = false;
CREATE INDEX idx_pending_time_entries ON time_entries(id) WHERE status = 'PENDING';
CREATE INDEX idx_pending_sync ON sync_queue(id) WHERE status = 'PENDING';
```

---

## 11. ROW-LEVEL SECURITY POLICIES

### 11.0 Helper Function (Prevents Recursion)

```sql
-- Helper function to check if current user has admin role
-- Using SECURITY DEFINER to bypass RLS and avoid recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('SUPER_ADMIN', 'ADMIN')
  );
END;
$$;

-- Grant execute permission on the helper function
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;
```

### 11.1 Profiles RLS Policies

```sql
-- Profiles: Users can read their own profile
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT USING (id = auth.uid());

-- Profiles: Admins can read all profiles (using helper function to avoid recursion)
CREATE POLICY profiles_select_admin ON profiles
  FOR SELECT USING (is_admin());

-- Profiles: Users can update their own profile (limited fields)
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Profiles: Only Admins can insert/delete
CREATE POLICY profiles_insert_admin ON profiles
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY profiles_delete_admin ON profiles
  FOR DELETE USING (is_admin());
```

### 11.2 Contractors RLS Policies

```sql
-- Contractors: Users can read their own contractor record
CREATE POLICY contractors_select_own ON contractors
  FOR SELECT USING (profile_id = auth.uid());

-- Contractors: Admins can read all
CREATE POLICY contractors_select_admin ON contractors
  FOR SELECT USING (is_admin());

-- Contractors: Users can update their own record
CREATE POLICY contractors_update_own ON contractors
  FOR UPDATE USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Contractors: Admins can insert/update
CREATE POLICY contractors_write_admin ON contractors
  FOR ALL USING (is_admin());
```

### 11.3 Tickets RLS Policies

```sql
-- Tickets: Contractors can see assigned tickets
CREATE POLICY tickets_select_assigned ON tickets
  FOR SELECT USING (
    assigned_to IN (
      SELECT id FROM contractors WHERE profile_id = auth.uid()
    )
  );

-- Tickets: Admins can do everything
CREATE POLICY tickets_admin ON tickets
  FOR ALL USING (is_admin());
```

### 11.4 Time Entries RLS Policies

```sql
-- Time Entries: Contractors can CRUD their own
CREATE POLICY time_entries_own ON time_entries
  FOR ALL USING (
    contractor_id IN (
      SELECT id FROM contractors WHERE profile_id = auth.uid()
    )
  );

-- Time Entries: Admins can read all and update status
CREATE POLICY time_entries_admin ON time_entries
  FOR ALL USING (is_admin());
```

### 11.5 Expense Reports RLS Policies

```sql
-- Expense Reports: Contractors can CRUD their own
CREATE POLICY expense_reports_own ON expense_reports
  FOR ALL USING (
    contractor_id IN (
      SELECT id FROM contractors WHERE profile_id = auth.uid()
    )
  );

-- Expense Reports: Admins can read all and update status
CREATE POLICY expense_reports_admin ON expense_reports
  FOR ALL USING (is_admin());
```

### 11.6 Media Assets RLS Policies

```sql
-- Media: Users can read their own uploads
CREATE POLICY media_select_own ON media_assets
  FOR SELECT USING (uploaded_by = auth.uid());

-- Media: Users can read media linked to their tickets/assessments
CREATE POLICY media_select_assigned ON media_assets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tickets t
      JOIN contractors s ON t.assigned_to = s.id
      WHERE media_assets.entity_id = t.id::text
      AND media_assets.entity_type = 'ticket'
      AND s.profile_id = auth.uid()
    )
  );

-- Media: Admins can do everything
CREATE POLICY media_admin ON media_assets
  FOR ALL USING (is_admin());
```

### 11.7 Reference Tables RLS Policies

```sql
-- Reference tables are read-only for all authenticated users
CREATE POLICY equipment_types_read ON equipment_types
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY hazard_categories_read ON hazard_categories
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY wire_sizes_read ON wire_sizes
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY expense_policies_read ON expense_policies
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow admin write access to reference tables
CREATE POLICY equipment_types_admin ON equipment_types
  FOR ALL USING (is_admin());

CREATE POLICY hazard_categories_admin ON hazard_categories
  FOR ALL USING (is_admin());

CREATE POLICY wire_sizes_admin ON wire_sizes
  FOR ALL USING (is_admin());

CREATE POLICY expense_policies_admin ON expense_policies
  FOR ALL USING (is_admin());
```

---

## 12. TRIGGERS & FUNCTIONS

### 12.1 Updated At Trigger

```sql
-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contractors_updated_at
  BEFORE UPDATE ON contractors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- (Apply to all other tables with updated_at...)
```

### 12.2 Ticket Status History Trigger

```sql
-- Function to log status changes
CREATE OR REPLACE FUNCTION log_ticket_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO ticket_status_history (
      ticket_id,
      from_status,
      to_status,
      changed_by,
      changed_at
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid(),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ticket_status_change_trigger
  AFTER UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION log_ticket_status_change();
```

### 12.3 Expense Report Total Calculation

```sql
-- Function to update expense report totals
CREATE OR REPLACE FUNCTION update_expense_report_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE expense_reports
  SET 
    total_amount = (
      SELECT COALESCE(SUM(amount), 0) 
      FROM expense_items 
      WHERE expense_report_id = COALESCE(NEW.expense_report_id, OLD.expense_report_id)
    ),
    item_count = (
      SELECT COUNT(*) 
      FROM expense_items 
      WHERE expense_report_id = COALESCE(NEW.expense_report_id, OLD.expense_report_id)
    ),
    mileage_total = (
      SELECT COALESCE(SUM(mileage_end - mileage_start), 0)
      FROM expense_items 
      WHERE expense_report_id = COALESCE(NEW.expense_report_id, OLD.expense_report_id)
      AND category = 'MILEAGE'
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.expense_report_id, OLD.expense_report_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER expense_item_change_trigger
  AFTER INSERT OR UPDATE OR DELETE ON expense_items
  FOR EACH ROW EXECUTE FUNCTION update_expense_report_total();
```

### 12.4 Credential Expiration Check

```sql
-- Function to check credential expiration
CREATE OR REPLACE FUNCTION check_credential_expiration()
RETURNS TRIGGER AS $$
BEGIN
  -- Update status based on expiration
  IF NEW.expiration_date < CURRENT_DATE THEN
    NEW.status := 'EXPIRED';
  ELSIF NEW.expiration_date <= CURRENT_DATE + INTERVAL '30 days' THEN
    NEW.status := 'EXPIRING_SOON';
  ELSE
    NEW.status := 'ACTIVE';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER credential_expiration_trigger
  BEFORE INSERT OR UPDATE ON contractor_credentials
  FOR EACH ROW EXECUTE FUNCTION check_credential_expiration();
```

### 12.5 1099 Threshold Tracking

```sql
-- Function to update 1099 tracking on payment
CREATE OR REPLACE FUNCTION update_1099_tracking()
RETURNS TRIGGER AS $$
DECLARE
  v_contractor_id UUID;
  v_tax_year INTEGER;
  v_ytd_total DECIMAL(12, 2);
BEGIN
  -- Only process paid invoices
  IF NEW.status = 'PAID' AND OLD.status != 'PAID' THEN
    v_contractor_id := NEW.contractor_id;
    v_tax_year := EXTRACT(YEAR FROM NEW.paid_at);
    
    -- Calculate YTD total
    SELECT COALESCE(SUM(total_amount), 0)
    INTO v_ytd_total
    FROM contractor_invoices
    WHERE contractor_id = v_contractor_id
    AND status = 'PAID'
    AND EXTRACT(YEAR FROM paid_at) = v_tax_year;
    
    -- Insert or update 1099 tracking
    INSERT INTO tax_1099_tracking (
      contractor_id,
      tax_year,
      total_payments,
      total_invoices,
      threshold_reached,
      threshold_reached_at
    ) VALUES (
      v_contractor_id,
      v_tax_year,
      v_ytd_total,
      1,
      v_ytd_total >= 600,
      CASE WHEN v_ytd_total >= 600 THEN NOW() ELSE NULL END
    )
    ON CONFLICT (contractor_id, tax_year)
    DO UPDATE SET
      total_payments = v_ytd_total,
      total_invoices = tax_1099_tracking.total_invoices + 1,
      threshold_reached = v_ytd_total >= 600,
      threshold_reached_at = CASE 
        WHEN v_ytd_total >= 600 AND NOT tax_1099_tracking.threshold_reached 
        THEN NOW() 
        ELSE tax_1099_tracking.threshold_reached_at 
      END,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoice_paid_1099_trigger
  AFTER UPDATE ON contractor_invoices
  FOR EACH ROW EXECUTE FUNCTION update_1099_tracking();
```

---

## APPENDIX A: SEED DATA

### A.1 Equipment Types

```sql
INSERT INTO equipment_types (category, equipment_name, equipment_code, voltage_rating, safe_approach_distance, damage_indicators) VALUES
('TRANSFORMER', 'Pole-Mounted Distribution Transformer', 'XFRM-PM', '15-50 kV', 10.0, '["Oil leaks", "Bushing damage", "Tank deformation", "Cooling fin damage"]'),
('CONDUCTOR', 'Overhead Primary Conductor', 'COND-OH-P', '15-35 kV', 10.0, '["Broken strands", "Sagging", "Burn marks", "Tree contact"]'),
('INSULATOR', 'Pin-Type Insulator', 'INS-PIN', '15-35 kV', 10.0, '["Cracks", "Flashover marks", "Missing skirts", "Contamination"]'),
('INSULATOR', 'Suspension Insulator String', 'INS-SUS', '69-765 kV', 10.0, '["Broken discs", "Corona damage", "Contamination", "Mechanical damage"]'),
('PROTECTION', 'Fuse Cutout', 'PROT-FUSE', '15-35 kV', 10.0, '["Blown fuse", "Housing damage", "Contact corrosion"]'),
('PROTECTION', 'Lightning Arrester', 'PROT-ARRESTER', '15-765 kV', 10.0, '["Housing cracks", "Discharge marks", "Ground connection damage"]'),
('REGULATOR', 'Voltage Regulator', 'REG-VOLT', '15-35 kV', 10.0, '["Oil leaks", "Bushing damage", "Control cabinet damage", "Tap changer issues"]'),
('CAPACITOR', 'Shunt Capacitor Bank', 'CAP-SHUNT', '15-35 kV', 10.0, '["Can rupture", "Fuse operation", "Control damage", "Connection issues"]');
```

### A.2 Hazard Categories

```sql
INSERT INTO hazard_categories (hazard_name, hazard_code, description, safe_distance_feet, ppe_required, immediate_actions) VALUES
('Downed Conductor - Assumed Energized', 'HAZ-DOWN-001', 'Any downed or damaged conductor must be assumed energized until proven de-energized and grounded', 35.0, ARRAY['Class E Hard Hat', 'Class 3 Safety Vest', 'Insulated Gloves'], ARRAY['Secure the area', 'Notify dispatch immediately', 'Keep public at least 35 feet away']),
('Damaged Insulator', 'HAZ-INS-001', 'Cracked, broken, or contaminated insulators may flashover', 10.0, ARRAY['Class E Hard Hat', 'Class 2 Safety Vest'], ARRAY['Do not approach closer than 10 feet', 'Assess from safe distance', 'Document with telephoto lens']),
('Vegetation Contact', 'HAZ-VEG-001', 'Trees or branches in contact with energized conductors', 35.0, ARRAY['Class E Hard Hat', 'Class 3 Safety Vest'], ARRAY['Assume conductor is energized', 'Do not attempt to remove vegetation', 'Request vegetation management crew']),
('Structural Damage - Pole', 'HAZ-STR-001', 'Damaged, leaning, or compromised utility poles', 1.5, ARRAY['Class E Hard Hat', 'Class 2 Safety Vest'], ARRAY['Stay clear of pole base', 'Assess stability from distance', 'Request structural evaluation']),
('Fire Hazard', 'HAZ-FIRE-001', 'Equipment or conductors showing signs of overheating or fire', 35.0, ARRAY['Class E Hard Hat', 'Class 3 Safety Vest', 'Fire-resistant clothing'], ARRAY['Evacuate area if fire present', 'Notify fire department', 'Do not approach until fire is out']);
```

### A.3 Expense Policies

```sql
INSERT INTO expense_policies (category, policy_name, receipt_required_threshold, auto_approve_threshold, mileage_rate, mileage_rate_effective_date) VALUES
('MILEAGE', 'Standard Mileage Reimbursement', 0.00, 999999.99, 0.655, '2026-01-01'),
('FUEL', 'Fuel Purchase Reimbursement', 0.01, 75.00, NULL, NULL),
('LODGING', 'Lodging Reimbursement', 0.01, 150.00, NULL, NULL),
('MEALS', 'Meals and Per Diem', 25.00, 75.00, NULL, NULL),
('TOLLS', 'Toll Reimbursement', 10.00, 999999.99, NULL, NULL),
('PARKING', 'Parking Reimbursement', 10.00, 50.00, NULL, NULL),
('MATERIALS', 'Materials and Supplies', 0.01, 100.00, NULL, NULL),
('EQUIPMENT_RENTAL', 'Equipment Rental', 0.01, 0.00, NULL, NULL);
```

---

**END OF DATABASE SCHEMA DOCUMENT**
