# Central Command — TECHNICAL PRODUCT REQUIREMENTS DOCUMENT

## Internal Damage Assessment Platform for Utility Contractors

**Version:** 1.0  
**Date:** February 4, 2026  
**Status:** MVP Development Phase  
**Classification:** Internal Use Only

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [MVP Scope Definition](#2-mvp-scope-definition)
3. [Technical Architecture](#3-technical-architecture)
4. [User Personas & Roles](#4-user-personas--roles)
5. [Feature Specifications](#5-feature-specifications)
6. [Data Models & Schema](#6-data-models--schema)
7. [Security & Compliance](#7-security--compliance)
8. [Integration Requirements](#8-integration-requirements)
9. [Performance Requirements](#9-performance-requirements)
10. [Success Metrics](#10-success-metrics)

---

## 1. EXECUTIVE SUMMARY

### 1.1 Purpose

This document defines the technical requirements for the Central Command Damage Assessment Platform — a Progressive Web Application (PWA) designed to manage independent contractor crews performing utility damage assessments for government contracts.

### 1.2 Business Context

- **Prime Contractor:** Central Command
- **Workforce Model:** Independent 1099 contractors (not employees)
- **Client Base:** Power utility companies with government contracts
- **Compliance Level:** FISMA/FedRAMP moderate (government contract requirements)

### 1.3 Core Value Proposition

Enable efficient dispatch, tracking, and billing of damage assessment crews while maintaining strict compliance with government contract standards and independent contractor legal requirements.

---

## 2. MVP SCOPE DEFINITION

### 2.1 In-Scope (MVP)

#### Phase 1: Foundation (Weeks 1-4)

| Feature | Priority | Complexity |
|---------|----------|------------|
| User Authentication & Role Management | P0 | Medium |
| Contractor Onboarding Flow | P0 | Medium |
| Basic Ticket Management (CRUD) | P0 | High |
| GPS-Verified Time Tracking | P0 | High |
| Simple Expense Submission | P0 | Medium |
| Offline Form Capability | P0 | High |

#### Phase 2: Operations (Weeks 5-8)

| Feature | Priority | Complexity |
|---------|----------|------------|
| 3-Status Field Workflow (In Route/On Site/Complete) | P0 | High |
| Photo Capture with GPS/EXIF | P0 | Medium |
| Route Optimization (Basic) | P1 | Medium |
| Damage Assessment Forms | P0 | High |
| Admin Dashboard & Reporting | P1 | Medium |

#### Phase 3: Financial (Weeks 9-12)

| Feature | Priority | Complexity |
|---------|----------|------------|
| Automated Invoice Generation | P1 | High |
| 1099 Tracking & Reporting | P1 | Medium |
| Expense Policy Enforcement | P1 | Medium |
| Payment Workflow | P2 | Medium |

### 2.2 Out-of-Scope (Post-MVP)

- Real-time live tracking (dots on map)
- Advanced AI-powered route optimization
- Integration with specific utility systems (Duke, FPL)
- Advanced analytics/ML predictions
- Mobile native apps (iOS/Android stores)
- Multi-language support

### 2.3 MVP Success Criteria

- [ ] Contractor can onboard in < 10 minutes
- [ ] Ticket creation to assignment < 2 minutes
- [ ] Time tracking accuracy within 50m GPS radius
- [ ] Offline form submission with < 5 min sync delay
- [ ] Invoice generation from approved entries < 1 hour

---

## 3. TECHNICAL ARCHITECTURE

### 3.1 Stack Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   React 18  │  │  Tailwind   │  │    shadcn/ui Components │  │
│  │  TypeScript │  │    CSS 3    │  │    (40+ pre-installed)  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                      STATE & DATA LAYER                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Zustand    │  │ React Query │  │    IndexedDB (offline)  │  │
│  │   (store)   │  │  (server state)│  │    (Dexie.js)          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                      BACKEND SERVICES                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Supabase   │  │  PostgreSQL │  │    Row-Level Security   │  │
│  │   (BaaS)    │  │    (RLS)    │  │    (Auth/Permissions)   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                      EXTERNAL SERVICES                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Mapbox    │  │    AWS S3   │  │    Push Notifications   │  │
│  │ (maps/routing)│  │  (storage)  │  │    (OneSignal/FCM)      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Technology Decisions

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Framework** | Next.js 14 (App Router) | SSR for SEO, API routes, PWA support |
| **Language** | TypeScript 5.x | Type safety, better DX |
| **Styling** | Tailwind CSS 3.4 | Rapid development, consistent design |
| **UI Components** | shadcn/ui | Accessible, customizable, 40+ components |
| **State Management** | Zustand | Lightweight, TypeScript-friendly |
| **Server State** | TanStack Query | Caching, synchronization, offline support |
| **Database** | Supabase PostgreSQL | Real-time, RLS, auth, GovCloud option |
| **Offline Storage** | Dexie.js (IndexedDB) | Form queuing, background sync |
| **Maps** | Mapbox GL JS | Cost-effective, custom styling |
| **Routing** | OSRM (self-hosted) | Free, unlimited routing |
| **File Storage** | Supabase Storage | Encrypted, CDN delivery |
| **Push Notifications** | Web Push API | PWA-native, no third-party |

### 3.3 PWA Specifications

```javascript
// manifest.json
{
  "name": "Central Command - Damage Assessment",
  "short_name": "GridElectric",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0F172A",
  "theme_color": "#1E40AF",
  "orientation": "portrait-primary",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192" },
    { "src": "/icon-512.png", "sizes": "512x512" }
  ]
}
```

**Service Worker Features:**

- Static asset caching (Cache First)
- API response caching (Stale While Revalidate)
- Background sync for form submissions
- Push notification handling

---

## 4. USER PERSONAS & ROLES

### 4.1 Role Matrix

| Feature | Super Admin | Operations Manager | Field Contractor | Auditor |
|---------|-------------|-------------------|---------------------|---------|
| User Management | ✅ Full | ❌ No | ❌ No | ❌ No |
| Contractor Onboarding | ✅ Full | ✅ Full | ❌ No | ❌ No |
| Ticket Creation | ✅ Full | ✅ Full | ❌ No | ❌ No |
| Ticket Assignment | ✅ Full | ✅ Full | ❌ No | ❌ No |
| Field Work (Time/Photos) | ❌ No | ❌ No | ✅ Own Only | ❌ No |
| Expense Submission | ❌ No | ❌ No | ✅ Own Only | ❌ No |
| Approval Workflows | ✅ Full | ✅ Full | ❌ No | ✅ Read |
| Invoice Generation | ✅ Full | ✅ Full | ❌ No | ✅ Read |
| Reports & Analytics | ✅ Full | ✅ Full | ✅ Own Only | ✅ Full |
| Audit Logs | ✅ Full | ❌ No | ❌ No | ✅ Full |

### 4.2 Persona Definitions

#### Super Admin (Grid Electric Internal)

- **Goals:** System configuration, financial oversight, compliance monitoring
- **Tech Savvy:** High
- **Device:** Desktop primarily
- **Frequency:** Daily

#### Operations Manager

- **Goals:** Dispatch crews, monitor progress, approve time/expenses
- **Tech Savvy:** Medium-High
- **Device:** Desktop + Tablet
- **Frequency:** Continuous during operations

#### Field Contractor

- **Goals:** Receive assignments, track time, submit assessments, get paid
- **Tech Savvy:** Variable (training required)
- **Device:** Smartphone (primary)
- **Frequency:** During active work only

#### Auditor (Government/Client)

- **Goals:** Verify compliance, review audit trails, generate reports
- **Tech Savvy:** Medium
- **Device:** Desktop
- **Frequency:** Periodic (monthly/quarterly)

---

## 5. FEATURE SPECIFICATIONS

### 5.1 Authentication & Onboarding

#### 5.1.1 Authentication Flow

```
┌─────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Login  │───▶│  Supabase   │───▶│   RLS Check │───▶│  Dashboard  │
│  Screen │    │   Auth      │    │  Role Assign│    │  (Role-based)│
└─────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

**Requirements:**

- Email/password authentication
- Magic link option (passwordless)
- Session persistence with refresh tokens
- Multi-factor authentication (MVP: optional, Post-MVP: required for admins)
- Password requirements: 12+ chars, uppercase, lowercase, number, special char

#### 5.1.2 Contractor Onboarding Flow

| Step | Screen | Purpose | Data Collected |
|------|--------|---------|----------------|
| 1 | Welcome | Introduce platform | None |
| 2 | Personal Info | Identity verification | Name, SSN, DOB, Address |
| 3 | Business Info | 1099 entity setup | Business name, EIN, Tax classification |
| 4 | Insurance | Compliance verification | GL policy, Workers Comp, Auto, expiration dates |
| 5 | Credentials | Qualification proof | Licenses, certifications, training dates |
| 6 | Banking | Payment setup | Account/routing numbers (encrypted) |
| 7 | Rates | Compensation terms | Hourly rates by work type |
| 8 | Agreements | Legal acceptance | Independent contractor agreement, e-signature |
| 9 | Training | Safety certification | Video completion tracking |
| 10 | Profile Photo | Identity verification | Facial photo for security |

**Onboarding Validation Rules:**

- Insurance must be active (not expired)
- All required licenses must be valid
- E-signature required before account activation
- Admin approval required before ticket assignment eligibility

### 5.2 Ticket Management System

#### 5.2.1 Ticket Lifecycle State Machine

```
                    ┌─────────────┐
         ┌─────────▶│   DRAFT     │◀────────┐
         │          │  (Admin)    │         │
         │          └──────┬──────┘         │
         │                 │                 │
         │                 ▼                 │
         │          ┌─────────────┐          │
         │          │  ASSIGNED   │          │
         │          │(Contractor│         │
         │          │  notified)   │         │
         │          └──────┬──────┘         │
         │                 │                 │
         │    ┌────────────┼────────────┐   │
         │    │            │            │   │
         │    ▼            ▼            ▼   │
         │ ┌───────┐  ┌─────────┐  ┌────────┴───┐
         └─┤REJECTED│  │IN_ROUTE │  │  EXPIRED   │
           │(w/reason)│  │(GPS on) │  │(auto 24hr) │
           └────┬───┘  └────┬────┘  └────────────┘
                │           │
                │           ▼
                │    ┌─────────────┐
                │    │   ON_SITE   │
                │    │(Geofenced   │
                │    │  500m)      │
                │    └──────┬──────┘
                │           │
                │           ▼
                │    ┌─────────────┐
                │    │ IN_PROGRESS │
                │    │(Assessment  │
                │    │  active)    │
                │    └──────┬──────┘
                │           │
                │           ▼
                │    ┌─────────────┐
                │    │   COMPLETE  │
                │    │(Photos req) │
                │    └──────┬──────┘
                │           │
                │           ▼
                │    ┌─────────────┐
                │    │PENDING_REVIEW│
                │    │  (Admin)    │
                │    └──────┬──────┘
                │           │
                └───────────┤
                            ▼
              ┌─────────────────────────┐
              │      APPROVED ─────┐    │
              │      (Invoiceable)  │    │
              │                     │    │
              │  NEEDS_REWORK ◀─────┘    │
              │  (w/comments)            │
              └─────────────────────────┘
```

#### 5.2.2 Ticket Data Structure

```typescript
interface Ticket {
  id: string;                    // UUID
  ticket_number: string;         // GES-2026-000001 format
  status: TicketStatus;
  priority: 'A' | 'B' | 'C' | 'X';  // NFPA 70B priority
  
  // Location
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  geofence_radius: number;       // Default: 500m
  
  // Assignment
  assigned_to?: string;          // contractor_id
  assigned_by: string;           // admin_id
  assigned_at?: Date;
  
  // Timing
  created_at: Date;
  scheduled_date?: Date;
  due_date?: Date;
  completed_at?: Date;
  
  // Client info
  utility_client: string;
  work_order_ref?: string;       // Client's reference number
  
  // Assessment data
  damage_type?: DamageType[];
  equipment_involved?: string[];
  severity?: 'MINOR' | 'MODERATE' | 'MAJOR' | 'CRITICAL';
  
  // Status tracking
  status_history: StatusChange[];
  
  // Metadata
  created_by: string;
  updated_at: Date;
  is_deleted: boolean;
}

interface StatusChange {
  from_status: TicketStatus;
  to_status: TicketStatus;
  changed_by: string;
  changed_at: Date;
  gps_coordinates?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  ip_address?: string;
  device_info?: string;
}
```

### 5.3 GPS-Verified Time Tracking

#### 5.3.1 Time Entry Flow

```typescript
┌─────────────────────────────────────────────────────────────────┐
│                     CLOCK IN PROCESS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. User taps "Clock In"                                        │
│     ▼                                                           │
│  2. GPS Location captured (required <100m accuracy)             │
│     ▼                                                           │
│  3. Geofence validation (within 500m of ticket location)        │
│     ▼                                                           │
│  4. Photo capture required (face or work site)                  │
│     ▼                                                           │
│  5. Timestamp + GPS + Photo stored locally                      │
│     ▼                                                           │
│  6. Sync to server (or queue if offline)                        │
│     ▼                                                           │
│  7. Background geolocation starts (if IN_ROUTE)                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 5.3.2 Time Entry Data Model

```typescript
interface TimeEntry {
  id: string;
  contractor_id: string;
  ticket_id: string;
  
  // Clock In
  clock_in_at: Date;
  clock_in_location: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude?: number;
  };
  clock_in_photo_url: string;
  clock_in_ip: string;
  clock_in_device: string;
  
  // Clock Out
  clock_out_at?: Date;
  clock_out_location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  clock_out_photo_url?: string;
  clock_out_ip?: string;
  
  // Work classification
  work_type: WorkType;
  work_type_rate: number;        // Hourly rate at time of entry
  
  // Calculations
  total_minutes: number;
  break_minutes: number;
  billable_minutes: number;
  billable_amount: number;
  
  // Status
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewed_by?: string;
  reviewed_at?: Date;
  rejection_reason?: string;
  
  // Metadata
  created_at: Date;
  updated_at: Date;
  sync_status: 'SYNCED' | 'PENDING' | 'FAILED';
}

type WorkType = 
  | 'MOB'
  | 'DEMOB'
  | 'WORK'
  | 'STANDBY'
  | 'ADMIN';
```

#### 5.3.3 GPS Requirements

| Requirement | Specification |
|-------------|---------------|
| Accuracy threshold | < 100 meters |
| Geofence radius | 500 meters (configurable per ticket) |
| Update frequency (IN_ROUTE) | Every 30 seconds |
| Update frequency (ON_SITE) | Every 5 minutes (battery optimized) |
| Minimum accuracy for clock | 50 meters |
| Fallback behavior | Require manual confirmation if GPS unavailable |

### 5.4 Expense Management

#### 5.4.1 Expense Categories & Rules

| Category | Receipt Required | Auto-calculation | Policy Limits |
|----------|-----------------|------------------|---------------|
| Mileage | No (if < 50 miles) | IRS rate × miles | None |
| Fuel | Yes (always) | N/A | None |
| Lodging | Yes (always) | Per diem option | $150/night |
| Meals | Yes (if > $25) | Per diem option | $75/day |
| Tolls | No (if < $10) | N/A | None |
| Parking | Yes (if > $10) | N/A | None |
| Materials | Yes (always) | N/A | Pre-approval > $100 |
| Equipment Rental | Yes (always) | N/A | Pre-approval required |

#### 5.4.2 Expense Data Model

```typescript
interface ExpenseReport {
  id: string;
  contractor_id: string;
  report_period_start: Date;
  report_period_end: Date;
  
  // Summary
  total_amount: number;
  mileage_total: number;
  item_count: number;
  
  // Status
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PAID';
  submitted_at?: Date;
  reviewed_by?: string;
  reviewed_at?: Date;
  
  // Items
  items: ExpenseItem[];
  
  // Invoice linkage
  invoice_id?: string;
  
  created_at: Date;
  updated_at: Date;
}

interface ExpenseItem {
  id: string;
  expense_report_id: string;
  
  // Classification
  category: ExpenseCategory;
  description: string;
  
  // Amount
  amount: number;
  currency: string;              // Default: USD
  
  // Date
  expense_date: Date;
  
  // Receipt
  receipt_url?: string;
  receipt_ocr_text?: string;     // Extracted text from OCR
  
  // Mileage specific
  mileage_start?: number;
  mileage_end?: number;
  mileage_rate?: number;         // IRS rate at time
  
  // Location (for mileage)
  from_location?: string;
  to_location?: string;
  
  // Policy validation
  policy_flags: PolicyFlag[];
  requires_approval: boolean;
  
  // Ticket linkage
  ticket_id?: string;
  
  // Billable to client
  billable_to_client: boolean;
  client_markup_percent?: number;
  
  created_at: Date;
}

type PolicyFlag = 
  | 'RECEIPT_REQUIRED'
  | 'OVER_LIMIT'
  | 'PRE_APPROVAL_REQUIRED'
  | 'DUPLICATE_DETECTED'
  | 'INVALID_DATE';
```

### 5.5 Damage Assessment Forms

#### 5.5.1 Assessment Form Structure

```typescript
interface DamageAssessment {
  id: string;
  ticket_id: string;
  contractor_id: string;
  
  // Safety observations
  safety_status: {
    downed_conductors: boolean;
    damaged_insulators: boolean;
    vegetation_contact: boolean;
    structural_damage: boolean;
    fire_hazard: boolean;
    public_accessible: boolean;
    safe_distance_maintained: boolean;
  };
  
  // Equipment assessments
  equipment_assessments: EquipmentAssessment[];
  
  // Damage classification
  damage_classification: {
    cause: DamageCause;
    weather_conditions?: string;
    estimated_repair_time: number;  // Hours
    priority: 'A' | 'B' | 'C' | 'X';
  };
  
  // Photos
  photos: AssessmentPhoto[];
  
  // Recommendations
  recommendations: {
    immediate_actions: string;
    repair_vs_replace: 'REPAIR' | 'REPLACE' | 'ENGINEERING_REVIEW';
    estimated_cost?: number;
  };
  
  // Signatures
  assessed_by: string;
  assessed_at: Date;
  digital_signature: string;       // Encrypted signature data
  
  // Admin review
  reviewed_by?: string;
  reviewed_at?: Date;
  review_notes?: string;
  
  created_at: Date;
  updated_at: Date;
  sync_status: 'SYNCED' | 'PENDING' | 'FAILED';
}

interface EquipmentAssessment {
  equipment_type: string;          // Reference to equipment_types catalog
  equipment_id?: string;           // Serial/asset number if visible
  condition: 'GOOD' | 'FAIR' | 'DAMAGED' | 'DESTROYED';
  damage_description?: string;
  requires_replacement: boolean;
  photos: string[];                // Photo URLs
}

interface AssessmentPhoto {
  id: string;
  url: string;
  thumbnail_url: string;
  
  // EXIF data
  captured_at: Date;
  gps_coordinates?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  
  // Classification
  photo_type: 'OVERVIEW' | 'EQUIPMENT' | 'DAMAGE' | 'SAFETY' | 'CONTEXT';
  description?: string;
  
  // Verification
  checksum: string;                // SHA-256 for integrity
  uploaded_at: Date;
}
```

#### 5.5.2 Photo Requirements

| Requirement | Specification |
|-------------|---------------|
| Minimum photos per assessment | 4 |
| Mandatory photo types | Overview, Equipment, Damage, Safety |
| GPS tagging | Required (extracted from EXIF) |
| Minimum resolution | 1920×1080 |
| Maximum file size | 10MB per photo |
| Format | JPEG (quality: 85%) |
| Checksum verification | SHA-256 on upload |

### 5.6 Invoice Generation

#### 5.6.1 Invoice Workflow

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Time   │     │   Expense   │     │   Invoice   │     │   Payment   │
│ Entries │────▶│  Reports   │────▶│  Generated  │────▶│   Export    │
│Approved │     │  Approved   │     │  (Auto)     │     │  (ACH/Check)│
└─────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

#### 5.6.2 Invoice Data Model

```typescript
interface ContractorInvoice {
  id: string;
  invoice_number: string;          // INV-2026-000001 format
  contractor_id: string;
  
  // Period
  billing_period_start: Date;
  billing_period_end: Date;
  
  // Line items
  time_entries: string[];          // Array of time_entry_ids
  expense_reports: string[];       // Array of expense_report_ids
  
  // Amounts
  subtotal_time: number;
  subtotal_expenses: number;
  total_amount: number;
  
  // 1099 tracking
  ytd_payments: number;            // Running total for tax year
  threshold_warning: boolean;      // True if approaching $600
  
  // Status
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'PAID' | 'VOID';
  
  // Dates
  submitted_at?: Date;
  approved_at?: Date;
  paid_at?: Date;
  payment_method?: 'ACH' | 'CHECK' | 'WIRE';
  payment_reference?: string;
  
  // PDF
  pdf_url?: string;
  
  created_at: Date;
  updated_at: Date;
}
```

---

## 6. DATA MODELS & SCHEMA

### 6.1 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ENTITY RELATIONSHIP DIAGRAM                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────┐         ┌──────────────┐         ┌──────────────┐        │
│   │   profiles   │◄────────┤contractors│◄────────│credentials   │        │
│   │  (auth users)│    1:1  │  (business)  │   1:N   │ (insurance)  │        │
│   └──────┬───────┘         └──────┬───────┘         └──────────────┘        │
│          │                        │                                         │
│          │                        │                                         │
│          │                   ┌────┴────┐                                    │
│          │                   │         │                                    │
│          │              ┌────┘         └────┐                               │
│          │              │                   │                               │
│          │              ▼                   ▼                               │
│          │    ┌──────────────┐    ┌──────────────┐                          │
│          │    │  time_entries│    │expense_reports│                         │
│          │    │      N:1     │    │     N:1      │                          │
│          │    └──────┬───────┘    └──────┬───────┘                          │
│          │           │                    │                                 │
│          │           └────────┬───────────┘                                 │
│          │                    │                                             │
│          │                    ▼                                             │
│          │           ┌──────────────┐                                       │
│          │           │ contractor│                                       │
│          │           │   _invoices  │                                       │
│          │           └──────────────┘                                       │
│          │                                                                  │
│          │                        ┌──────────────┐                          │
│          └───────────────────────►│   tickets    │                          │
│                              1:N  │              │                          │
│                                   └──────┬───────┘                          │
│                                          │                                  │
│                                          │ 1:1                              │
│                                          ▼                                  │
│                                   ┌──────────────┐                          │
│                                   │damage_assessments│                      │
│                                   └──────┬───────┘                          │
│                                          │                                  │
│                                          │ 1:N                              │
│                                          ▼                                  │
│                                   ┌──────────────┐                          │
│                                   │ media_assets │                          │
│                                   │   (photos)   │                          │
│                                   └──────────────┘                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Complete Database Schema

See `02-DATABASE-SCHEMA.md` for complete SQL definitions including:

- All table definitions with constraints
- Index definitions for performance
- Row-Level Security (RLS) policies
- Database triggers and functions
- Enum type definitions

---

## 7. SECURITY & COMPLIANCE

### 7.1 Authentication Security

| Control | Implementation |
|---------|---------------|
| Password policy | 12+ chars, complexity requirements |
| Failed login lockout | 5 attempts = 15 min lockout |
| Session timeout | 8 hours idle, 24 hours max |
| MFA | Optional for MVP, required for admins post-MVP |
| Password reset | Token-based, 1 hour expiry |

### 7.2 Data Encryption

| Layer | Method |
|-------|--------|
| Data at rest | AES-256 (Supabase default) |
| Data in transit | TLS 1.3 |
| Sensitive fields | Column-level encryption (SSN, bank accounts) |
| File storage | Server-side encryption with customer-managed keys |

### 7.3 Audit Logging

All actions logged with:

- User ID
- Timestamp (UTC)
- Action type
- IP address
- Device fingerprint
- Before/after values (for changes)

### 7.4 Compliance Checklist

| Requirement | Status | Notes |
|-------------|--------|-------|
| FISMA Low | ✅ Planned | AWS GovCloud or Azure Government |
| Data residency | ✅ Planned | US-only servers |
| Encryption at rest | ✅ Planned | AES-256 |
| Encryption in transit | ✅ Planned | TLS 1.3 |
| Access controls | ✅ Planned | RBAC with RLS |
| Audit trails | ✅ Planned | Immutable logging |
| 1099 reporting | ✅ Planned | Automated threshold tracking |

---

## 8. INTEGRATION REQUIREMENTS

### 8.1 Mapbox Integration

**Features:**

- Map display with custom styling
- Geocoding (address to coordinates)
- Reverse geocoding (coordinates to address)
- Directions/Routing (OSRM fallback)
- Geofence visualization

**API Keys:**

- Public token (client-side)
- Secret token (server-side for geocoding)

### 8.2 Supabase Integration

**Services Used:**

- Authentication (email/password, magic link)
- Database (PostgreSQL with RLS)
- Real-time subscriptions (ticket status updates)
- Storage (photos, receipts, PDFs)
- Edge Functions (background processing)

### 8.3 Push Notifications

**Implementation:**

- Web Push API (PWA standard)
- OneSignal or custom Push service
- Notification types:
  - Ticket assignment
  - Approval status changes
  - Payment processed
  - Document expiration warnings

---

## 9. PERFORMANCE REQUIREMENTS

### 9.1 Response Time Targets

| Operation | Target | Maximum |
|-----------|--------|---------|
| Page load (initial) | < 2s | < 4s |
| Page load (subsequent) | < 1s | < 2s |
| API response | < 200ms | < 500ms |
| Form submission | < 500ms | < 2s |
| Photo upload | < 5s per MB | < 10s per MB |
| Map initialization | < 3s | < 5s |

### 9.2 Offline Capability

| Feature | Offline Behavior |
|---------|-----------------|
| Form entry | Full functionality, queue for sync |
| Photo capture | Store locally, upload on connection |
| Time tracking | Local timestamp, sync on connection |
| Ticket viewing | Cached data, read-only |
| Map viewing | Last viewed area cached |

### 9.3 Scalability Targets

| Metric | MVP Target | Growth Target |
|--------|-----------|---------------|
| Concurrent users | 100 | 1,000 |
| Tickets per month | 5,000 | 50,000 |
| Photos per month | 50,000 | 500,000 |
| Contractors | 200 | 2,000 |

---

## 10. SUCCESS METRICS

### 10.1 Technical Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Uptime | 99.9% | Monitoring dashboard |
| Error rate | < 0.1% | Sentry/error tracking |
| API latency (p95) | < 300ms | APM tools |
| Sync success rate | > 99% | Sync queue monitoring |

### 10.2 Business Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Onboarding completion | > 90% | Funnel analysis |
| Time tracking accuracy | > 95% | GPS validation |
| Expense approval time | < 24 hours | Workflow tracking |
| Invoice generation time | < 1 hour | Automation tracking |
| Contractor satisfaction | > 4.0/5 | Monthly surveys |

### 10.3 Compliance Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Audit trail completeness | 100% | Automated checks |
| 1099 accuracy | 100% | Tax filing review |
| Insurance verification | 100% | Expiration tracking |
| Data encryption coverage | 100% | Security scans |

---

## APPENDIX A: GLOSSARY

| Term | Definition |
|------|------------|
| **1099** | IRS form for reporting independent contractor payments |
| **PWA** | Progressive Web App - browser-based installable app |
| **RLS** | Row-Level Security - database access control |
| **Geofence** | Virtual geographic boundary for GPS validation |
| **NFPA 70B** | National Electrical Code for electrical equipment maintenance |
| **FISMA** | Federal Information Security Management Act |
| **EXIF** | Exchangeable Image File Format - metadata in photos |

---

## APPENDIX B: DOCUMENT VERSIONING

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-04 | Technical Team | Initial MVP specification |

---

- **END OF DOCUMENT**
