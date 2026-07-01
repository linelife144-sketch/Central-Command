-- Central Command - Database Enums
-- Run this first to create all enum types

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
