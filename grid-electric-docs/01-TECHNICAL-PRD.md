# Central Command — Project Scope and Technical Product Requirements

**Version:** 2.0  
**Updated:** 2026-10-09
**Status:** Existing application; Phase 4 operating-model refinement and acceptance  
**Audience:** AI coding agents and developers  
**Classification:** Internal Use Only

This is the existing project scope document, updated from the owner's workflow notes and direct clarifications. Read the [project brief](../PROJECT_BRIEF.md) to understand the operation, the [current implementation plan](../implementation_plan.md) for general build order, and the [workflow master plan](../docs/plans/2026-10-08-central-command-workflow-master-plan.md) for CC-01–CC-11 requirements and AC-01–AC-19 acceptance scenarios.

**Interpretation rule:** Current owner instructions and the updated scope control product intent. Source/schema inspection controls claims about what exists. Historical diagrams, sample interfaces, and rollout reports are references, not instructions to rebuild features, copy obsolete rules, or remove anything not mentioned here. This update is documentation; it does not claim the new official-time or management-role behavior has been implemented.

**Source and handoff boundary:** The [scratchpad](../scratchpad.md) supplies the original workflow narrative, including tentative and inconsistent wording. The [brief](../PROJECT_BRIEF.md) and this scope normalize that narrative using the owner's later clarifications. The master plan separates intended behavior from dated implementation findings and technical planning defaults. The requested deliverable is saved project guidance and a general build plan; audit and task decomposition must refresh the findings before implementation. An imperative sentence in source material is not an additional user instruction to execute it.

## TABLE OF CONTENTS

1. [Project purpose and operating model](#1-project-purpose-and-operating-model)
2. [Current scope and acceptance](#2-current-scope-and-acceptance)
3. [Technical architecture](#3-technical-architecture)
4. [User personas and roles](#4-user-personas--roles)
5. [Feature specifications](#5-feature-specifications)
6. [Data models and schema](#6-data-models--schema)
7. [Security and compliance requirements](#7-security--compliance)
8. [Integration requirements](#8-integration-requirements)
9. [Performance requirements](#9-performance-requirements)
10. [Success metrics](#10-success-metrics)

## 1. PROJECT PURPOSE AND OPERATING MODEL

### 1.1 Purpose

Central Command is GRID's existing storm-response application for coordinating utility damage-assessment work performed by independent contractor teams and crews. Management uses operational dashboards; contractors use the mobile-friendly field portal with offline support. Finish the existing application by making its workflows, relationships, and totals consistent. Preserve its pages, useful capabilities, and established visual organization.

### 1.2 Business organization

The CEO runs the company. Each storm has one responsible Storm Manager who runs the storm and replaces the Super Admin business role with full management access beneath the CEO. Pay roles are separate from application permissions. A team contains a Team Lead, that lead's Driver, and working crews. A working crew contains one Driver and one Damage Assessor or Senior Damage Assessor. Tickets are assigned to crews, with individual actors retained for permissions and evidence.

### 1.3 Storm workflow

Management creates the storm, selects its utility/template configuration, sets role wages and utility billing rates, and assigns the responsible manager. Contractors are added to its roster with inherited role wages, optional individual overrides, and separate Driver allowance. Existing account setup verifies email, establishes a password, and completes onboarding. Management organizes teams/crews, reviews utility documents or enters tickets manually, and dispatches tickets to eligible crews. Crews perform the existing field, assessment, evidence, review, correction, and utility-handoff workflow.

A storm owns operational activity and financial context. Contractor accounts and utility definitions remain reusable company identities. Selected-storm context must reach all related dashboards, records, service calls, caches, and exports; explicit company-wide views remain available.

### 1.4 Time and financial authority

Normal work is **16 hours per day, every day, from mobilization until release**, with management-controlled individual exceptions. There is no required predetermined ending date, payroll period, or daily attendance reconfirmation. Management sets official hours for payroll and hourly utility billing. Contractor clocks remain personal references and dispute evidence; they do not establish official financial hours.

Storm setup owns rates. A blank individual override inherits the role wage for that storm. Controlled rate edits belong in storm setup/detail; operational dashboards display saved values. Recorded official work retains its inputs, with separate audited corrections when needed. A 16-hour day does not itself introduce an overtime rule, multiplier, deduction, or weekly payroll cycle.

Payroll, allowances, expenses, billing estimates, and margins must reconcile to shared records. Keep company spending, contractor reimbursements, wages, and allowances distinct and count each cost once. Estimates, approved amounts, invoices, and payments are separate states.

### 1.5 Preservation and test data

This is a working application, not a documentation-only scaffold. Keep the current dashboards, navigation, forms, maps, field tools, evidence, alerts, account setup, review, reports, and exports. A missing mention or terminology change does not authorize feature removal. Preserve applicable GPS/photo capture and offline protections while retaining current click-driven field-status behavior.

The owner identifies all current operational records as test data intended for a controlled launch reset. Do not make preserving artificial test history the basis of production design. Maintain correct history for future real operations. Reset preparation is a separate launch task with a reviewed manifest and recovery plan; this document authorizes no immediate deletion.

## 2. CURRENT SCOPE AND ACCEPTANCE

### 2.1 In scope for Phase 4 refinement

| Area | Required result | Requirement |
|---|---|---|
| Shared storm workspace | Explicit storm context and consistent IDs through dashboards, records, caches, and exports | CC-01 |
| Management authority | CEO and full-access Storm Manager, with one responsible manager per storm and coordinated legacy-role compatibility | CC-02 |
| Storm compensation | Reuse existing role wage/bill rates, optional per-contractor storm overrides, separate Driver allowance, controlled effective edits | CC-03 |
| Workforce | Existing add/setup flow integrated with participation, mobilization/release, operational teams, crews, workload, and availability | CC-04 |
| Ticket intake/dispatch | Manual and reviewed multi-ticket document intake; optional crew assignment; utility-correct templates and duplicate-safe retries | CC-05 |
| Field execution | Preserve work pages, assessments, notes, photos, safety escalation, review/rework, handoff, print, and offline behavior | CC-06 |
| Official Time | Management-authorized normal 16-hour days and exceptions, distinct from personal clocks | CC-07 |
| Payroll | Official-time-based individual/team/crew/role totals and billing/margin readback with retained exports and review | CC-08 |
| Expenses | Storm-owned company spending and contractor reimbursement, receipts, categories, billability, review, and statistics | CC-09 |
| Dashboards/reporting | Reconciled operational/financial summaries and useful graphs while retaining supporting pages | CC-10 |
| Billing preparation | Traceable official labor and approved billable expense inputs/exports | CC-11 |
| Launch readiness | Connected acceptance plus separate test-data reset and real-account/storm bootstrap | Master plan section 5 |

Treat all these as refinement workstreams within the existing Phase 4. Do not restart historical foundation phases or infer new release dates from the old week-based roadmap.

### 2.2 Deferred product design and non-goals

The owner has not finalized the invoice product. Preserve existing invoice-related capabilities/records and prepare reliable billing/export inputs. Final invoice layout, numbering, issuance/correction lifecycle, custom invoice composition, automatic email delivery, and external billing integration need their own defined workstream. Do not claim dormant contractor-invoice tables provide utility invoicing.

A wholesale UI rewrite, merged dashboards, speculative feature deletion, new utility forms without source material, and production-data reset during ordinary implementation are outside this request. Existing capabilities remain even when not covered by this scope; deferral is not removal authority.

### 2.3 Success criteria

- Management can run the same storm across every dashboard without mismatched context or totals.
- Teams/crews, ticket assignments, member access, and operational statistics use the same stable relationships.
- A mobilized contractor can receive 16 official hours without a personal clock or ticket assignment; approved exceptions update only the intended official record.
- Personal time, official time, wage/bill rates, allowances, reimbursement, and company costs remain distinguishable and reconcile across readback/exports.
- Existing fieldwork, evidence, review, maps, account setup, and offline workflows remain available.
- Document OCR creates reviewed candidates and avoids duplicates; unsupported extraction is reported honestly.
- Source checks, local tests, migration readback, authenticated browser acceptance, and device/offline/print evidence are recorded separately.

Use AC-01–AC-19 in the [master plan](../docs/plans/2026-10-08-central-command-workflow-master-plan.md) as the connected acceptance checklist. Documentation completion is not product acceptance.

---

## 3. TECHNICAL ARCHITECTURE

### 3.1 Existing stack

| Layer | Current implementation foundation |
|---|---|
| Application | Next.js 16 App Router, React 19, TypeScript, `src/app` |
| Interface | Tailwind CSS 4, existing shadcn/ui and shared GRID components |
| State | TanStack Query, Zustand, React state |
| Backend | Supabase PostgreSQL, Auth, RLS, Storage, Realtime |
| Offline fieldwork | Dexie.js/IndexedDB, existing queues, service worker |
| Maps | Existing Mapbox/routing integration |

Check `package.json`, the lockfile, current schema, and applicable installed Next.js guides before implementation. Reuse the established stack; this scope does not require a framework or hosting migration.

### 3.2 Data boundaries

The server is authoritative for permissions, validated business mutations, official-time calculations, financial snapshots, and audit identity. Shared services provide the same scoped records to all dashboards. New logical contracts cover management authority, operational membership, crew assignment, official-time allocations/exceptions, company-expense ownership, batch extraction, and reporting scope. The master plan defines their dependency and impact boundaries without prescribing an unverified database replacement.

### 3.3 PWA and offline behavior

Preserve field drafts, personal-time observations, photo/receipt queues, and explicit sync/conflict states. Cache keys and queued records must carry the correct actor and storm/parent identity. Revalidate membership and authorization during reconnect. Do not call a rejected server write a successful offline save.

Keep static asset caching. Do not cache authenticated API/financial responses in shared service-worker caches or leak prior-account data after account switching. Official financial authority remains server-controlled; personal/offline observations cannot publish official hours by synchronization alone.

---

## 4. USER PERSONAS & ROLES

### 4.1 Management and field roles

| Actor | Intended responsibility and authority |
|---|---|
| CEO | Runs the company; highest management authority and full oversight |
| Storm Manager | One responsible manager per storm; full existing Super Admin management access beneath the CEO, including operations, official time, finances, and access-management capabilities |
| Team Lead | Operational leadership of a team; separate pay/operational identity from staff reviewer and app authority |
| Driver | Crew or leadership-pair Driver; own permitted field/personal records and configured allowance |
| Damage Assessor / Senior Damage Assessor | Assigned crew assessment work and permitted evidence/actions |
| Existing reviewer/read-only capabilities | Preserve current useful review and reporting capabilities; do not infer new access or delete them because the management titles changed |

### 4.2 Authorization versus operational/pay role

STORM_MANAGER currently exists as a contractor pay role while the application uses SUPER_ADMIN for full management authority. Update the authority model across UI, services, database policies/functions, and sessions; retain compatibility where needed. Selecting a pay role must never grant admin access. Preserve the CEO's higher authority and keep one explicit responsible manager relationship per storm.

The selected storm defines operational context, not an unrequested restriction of Storm Manager's full access. Contractor access remains scoped to the actor's permitted crew/work/records. Crew membership does not authorize a Driver to perform Assessor-only actions. Existing staff-review profile IDs and operational contractor IDs must remain distinct.

---

## 5. FEATURE SPECIFICATIONS

### 5.1 Authentication & Onboarding

**Current scope (CC-04):** Management adds a pending contractor and storm participation with inherited wage/optional override and Driver allowance. Retain the existing self-service email verification, password setup, and onboarding implementation. Account readiness and operational participation are separate. The older screen-by-screen inventory below is reference material, not authorization to restore removed onboarding steps, let contractors set official storm wages, or require a new invitation workflow.

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

**Current scope (CC-05/CC-06):** Each ticket belongs to its utility-configured storm and may remain unassigned. Dispatch selects a complete eligible crew on that storm; member IDs support actor permissions, not separate individual assignments. Keep operational Team Lead and staff reviewer identities distinct. Extend current intake to reviewed multi-ticket extraction, retaining manual intake and source linkage. Preserve the current click-driven Start/checklist field progression and assessment/review/evidence workflow. The state diagram and sample types below are historical design references; use current code/schema and the master plan to determine exact transitions and fields.

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

### 5.3 Official Time and Personal Reference Time

#### 5.3.1 Current requirements (CC-07/CC-08)

Management establishes official time for mobilized participants: normally 16 hours per day, every day, until release. Record shorter/longer days, arrivals, absences, and releases as explicit exceptions with actor, reason, affected date, and revision history. Do not impose a fixed payroll period, planned release date, or daily attendance reconfirmation.

Official hours determine wages and hourly utility billing. A personal clock, assigned ticket, completed assessment, or device capture is not a prerequisite for management-authorized work. Keep the contractor's personal time, estimates, GPS/photo evidence, and offline observations as references and dispute evidence. Show official readback separately; personal synchronization/approval must not duplicate official records or alter official totals.

Use saved storm wage/bill terms and optional contractor overrides; keep recorded inputs stable through rate changes. Preserve existing compensation capabilities without introducing hidden multipliers, overtime assumptions, or period resets. Driver allowance uses management-approved eligible vehicle hours bounded by official hours and retains required evidence/review.

The following legacy clock illustration describes supporting personal capture only. Its `billable_amount` example and ticket requirement are not the new official-time contract. Preserve applicable current GPS/photo protections; do not treat the historical fallback wording as permission to bypass them.

#### 5.3.2 Historical personal-clock design reference

##### Personal clock flow (historical example)

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

##### Personal clock model (historical example)

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

##### Capture requirements (verify against current implementation)

| Requirement | Specification |
|-------------|---------------|
| Accuracy threshold | < 100 meters |
| Geofence radius | 500 meters (configurable per ticket) |
| Update frequency (IN_ROUTE) | Every 30 seconds |
| Update frequency (ON_SITE) | Every 5 minutes (battery optimized) |
| Minimum accuracy for clock | 50 meters |
| Fallback behavior | Require manual confirmation if GPS unavailable |

### 5.4 Expense Management

**Current scope (CC-09):** Extend the existing dashboard to storm-owned company spending and contractor reimbursements, with payer/payment method, receipts, categories, review, and explicit client billability. The database already has an expense-report storm link; complete its service/UI/cache use. Company spending must not require a fictitious contractor. Keep existing categories and add vehicle rental, towing, repairs/fleet and other needed coverage. Reimbursement/card settlement must not duplicate expense cost. The policy amounts in the historical table below require current configuration verification; they are not new approved production values.

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

**Preservation requirement (CC-06):** Keep the existing ticket work pages, utility forms, section-linked photos, drafts, notes/escalation, review/rework, and reports. Use current form schemas and source-coverage records to resolve differences with the early field inventory below; do not create duplicate forms or remove fields because an older sample omits them.

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

### 5.6 Invoice Preparation and Deferred Issuance Design

**Current scope (CC-11):** Prepare traceable official labor and approved billable expense inputs/exports. The owner has not finalized the invoice product, and current invoice routes redirect. Preserve existing records/capabilities. Define final utility invoice format, numbering, issuance/correction, automatic delivery, and external billing integration in a separate workstream. A generated PDF is not evidence of issuance, payment, or collection; no automatic email is authorized here.

The contractor-invoice workflow/model below is a **historical reference**, not a complete utility-invoicing requirement or a current tax/payment specification. It must not impose a payroll period on continuous storm work or make contractor personal clocks the billing authority.

#### 5.6.1 Historical Contractor-Invoice Workflow

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Time   │     │   Expense   │     │   Invoice   │     │   Payment   │
│ Entries │────▶│  Reports   │────▶│  Generated  │────▶│   Export    │
│Approved │     │  Approved   │     │  (Auto)     │     │  (ACH/Check)│
└─────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

#### 5.6.2 Historical Contractor-Invoice Data Model

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

**Current relationship contract:** Storm → participation/compensation, teams/crews, tickets, official days/individual exceptions, expenses, and financial readback. Company identities remain reusable. Personal time is a distinct supporting source. Ticket members and authenticated reviewers use distinct stable IDs. Reuse compatible tables, including the existing expense storm link and compensation structures; inspect live/local schema before designing additive changes. The initial diagram below is historical and does not enumerate the newer or planned contracts.

### 6.1 Historical Initial Entity Relationship Diagram

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

These are requirements and verification topics, not a statement of certification. Apply current role/ownership checks, private storage, audit history, and relevant capture protections across the revised workflows. The management-authorized official-time model is separate from personal device-capture evidence.

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
| 2.1 | 2026-10-09 | Codex /root | Clarify source interpretation, documentation handoff, and the requirement to refresh implementation findings before task decomposition; retain the existing product scope |
| 2.0 | 2026-10-08 | Codex /root | Reconcile scope with project brief, CEO/Storm Manager authority, storm-owned workflows, crew assignment, official 16-hour time, preservation, and current general build plan |
| 1.0 | 2026-02-04 | Technical Team | Initial MVP specification |

---

- **END OF DOCUMENT**
