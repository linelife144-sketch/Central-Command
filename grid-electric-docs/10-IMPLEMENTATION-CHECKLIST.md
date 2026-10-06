# Central Command — IMPLEMENTATION CHECKLIST

## Complete Build-Out Guide Based on Field Forms Analysis

**Version:** 2.0  
**Date:** February 4, 2026  
**Based On:** DCO & Outage Field Report Forms

---

## EXECUTIVE SUMMARY

This checklist provides a step-by-step implementation guide for building the complete Central Command platform, incorporating all data points from your actual field forms (DCO and Outage Field Report).

### Key Findings from Form Analysis

1. **Equipment Types:** 14 different equipment types (Transformer, Recloser, Regulator, Switch, etc.)
2. **Wire Sizes:** 24 standard sizes (AWG 14 through 4/0, kcmil 250-1000)
3. **Pole Specifications:** Classes 1-10, types (Wood/Steel/Concrete), heights 20-80ft
4. **Photo Requirements:** Minimum 4 per assessment with GPS + server timestamp
5. **Data Integrity:** SHA-256 hashing, server timestamps, GPS validation required

---

## PHASE 1: DATABASE SETUP (Week 1)

### 1.1 Create Core Tables

```sql
-- Run these in Supabase SQL Editor

-- 1. Wire sizes reference table
\i wire_sizes.sql

-- 2. Equipment catalog table  
\i equipment_catalog.sql

-- 3. Enhanced damage_assessments table
\i damage_assessments_enhanced.sql

-- 4. Enhanced media_assets table
\i media_assets_enhanced.sql

-- 5. GPS validation log
\i gps_validation_log.sql

-- 6. Photo duplicate detection
\i photo_duplicates.sql
```

### 1.2 Seed Reference Data

```sql
-- Wire sizes (24 entries)
INSERT INTO wire_sizes ...

-- Equipment types (14 entries)
INSERT INTO equipment_types ...

-- Activity types
INSERT INTO activity_types ...

-- Transformer purposes
INSERT INTO transformer_purposes ...

-- Change reasons
INSERT INTO change_reasons ...

-- Pole classes, types, heights
INSERT INTO pole_specifications ...
```

### 1.3 Update RLS Policies

```sql
-- Add field-level security policies
\i rls_field_level.sql
```

**Week 1 Checklist:**

- [ ] All tables created in Supabase
- [ ] Reference data populated
- [ ] RLS policies configured
- [ ] Test database connections

---

## PHASE 2: DEPENDENCIES & CONFIGURATION (Week 1-2)

### 2.1 Install All Dependencies

```bash
# Navigate to project
cd grid-electric-app

# Core dependencies (already installed)
# npm install @supabase/supabase-js zustand @tanstack/react-query

# NEW: Image processing
npm install exifreader browser-image-compression

# NEW: OCR for receipts
npm install tesseract.js

# NEW: Signature capture
npm install react-signature-canvas

# NEW: Barcode scanning
npm install html5-qrcode

# NEW: Form validation
npm install @hookform/resolvers react-hook-form

# NEW: Timezone support
npm install date-fns-tz

# NEW: Hashing
npm install crypto-js

# NEW: UUID
npm install uuid
```

### 2.2 Environment Variables

```bash
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_MAX_TIME_ENTRY_HOURS=12
NEXT_PUBLIC_GEOFENCE_RADIUS_METERS=500
NEXT_PUBLIC_MAX_PHOTO_SIZE_MB=10
NEXT_PUBLIC_MIN_PHOTOS_REQUIRED=4
```

### 2.3 Configuration Files

```typescript
// lib/config/appConfig.ts

export const APP_CONFIG = {
  // Time tracking
  MAX_TIME_ENTRY_HOURS: 12,
  WARNING_TIME_ENTRY_HOURS: 8,
  AUTO_CLOCK_OUT_ENABLED: true,
  
  // GPS
  GEOFENCE_RADIUS_METERS: 500,
  MIN_GPS_ACCURACY_METERS: 100,
  MAX_GPS_ACCURACY_METERS: 500,
  GPS_UPDATE_INTERVAL_MS: 30000, // 30 seconds
  
  // Photos
  MAX_PHOTO_SIZE_MB: 10,
  MIN_PHOTOS_REQUIRED: 4,
  PHOTO_QUALITY: 0.85,
  MAX_PHOTO_WIDTH: 1920,
  MAX_PHOTO_HEIGHT: 1080,
  
  // Validation
  REQUIRE_PHOTO_GPS: true,
  REQUIRE_SERVER_TIMESTAMP: true,
  ENABLE_DUPLICATE_DETECTION: true,
  ENABLE_GPS_SPOOFING_DETECTION: true,
  
  // Expenses
  RECEIPT_REQUIRED_THRESHOLD: 25,
  AUTO_APPROVE_THRESHOLD: 75,
  MILEAGE_RATE: 0.655, // IRS rate
};
```

**Week 1-2 Checklist:**

- [ ] All dependencies installed
- [ ] Environment variables configured
- [ ] App config created
- [ ] Build successful

---

## PHASE 3: CORE VALIDATION LIBRARY (Week 2)

### 3.1 Create Validation Functions

```typescript
// Create these files:

lib/
├── validation/
│   ├── index.ts              # Main exports
│   ├── photoValidation.ts    # EXIF extraction, GPS, hashing
│   ├── timeEntryValidation.ts # Duration, GPS spoofing
│   ├── assessmentValidation.ts # Form completeness
│   ├── geofenceValidation.ts  # Distance calculations
│   └── expenseValidation.ts   # Receipt OCR, policy
│
├── utils/
│   ├── hash.ts               # SHA-256 functions
│   ├── gps.ts                # GPS calculations
│   └── exif.ts               # EXIF extraction helpers
```

### 3.2 Key Functions to Implement

| Function | File | Purpose |
| ---------- | ------ | --------- |
| `validatePhoto()` | photoValidation.ts | EXIF, GPS, hash, size |
| `validateGeofence()` | geofenceValidation.ts | Distance from center |
| `validateTimeEntry()` | timeEntryValidation.ts | Duration, GPS spoofing |
| `calculateFileHash()` | hash.ts | SHA-256 for deduplication |
| `extractExifData()` | exif.ts | GPS, timestamp from photo |
| `validateAssessment()` | assessmentValidation.ts | Required fields |

**Week 2 Checklist:**

- [ ] All validation functions implemented
- [ ] Unit tests passing
- [ ] GPS calculations accurate
- [ ] EXIF extraction working

---

## PHASE 4: PHOTO CAPTURE SYSTEM (Week 3)

### 4.1 Photo Capture Component

```typescript
// components/features/assessments/PhotoCapture.tsx

interface PhotoCaptureProps {
  ticketId: string;
  requiredTypes: PhotoType[];
  onPhotosCaptured: (photos: CapturedPhoto[]) => void;
}

// Features:
// - Camera access with fallback to file picker
// - Real-time EXIF extraction
// - GPS validation
// - Image compression
// - Preview with metadata overlay
// - Type tagging (Overview, Equipment, Damage, Safety)
```

### 4.2 Photo Upload Queue

```typescript
// lib/sync/photoUploadQueue.ts

interface PhotoUploadQueue {
  // Queue photos for background upload
  add(photo: CapturedPhoto): Promise<void>;
  
  // Process queue (called when online)
  process(): Promise<void>;
  
  // Get pending count
  getPendingCount(): Promise<number>;
}
```

### 4.3 Photo Validation Flow

```sql
User Takes Photo
    ↓
Extract EXIF Data (GPS, timestamp, device)
    ↓
Validate GPS Present? → No → Error: "Enable location services"
    ↓ Yes
Validate File Size? → No → Compress Image
    ↓ Yes
Calculate SHA-256 Hash
    ↓
Check for Duplicates? → Yes → Flag for review
    ↓ No
Validate Geofence? → No → Flag: "Outside work area"
    ↓ Yes
Add to Upload Queue
    ↓
Show Preview with Metadata
```

**Week 3 Checklist:**

- [ ] Photo capture component working
- [ ] EXIF extraction accurate
- [ ] GPS validation working
- [ ] Upload queue functional
- [ ] Offline storage working

---

## PHASE 5: ASSESSMENT FORM (Week 4-5)

### 5.1 Multi-Step Form Structure

```typescript
// forms/assessmentFormSchema.ts

const assessmentSteps = [
  {
    id: 'safety',
    title: 'Safety Observations',
    fields: ['safe_distance', 'ppe_worn', 'hazards'],
    validation: safetySchema,
  },
  {
    id: 'pole',
    title: 'Pole Damage',
    fields: ['pole_broken', 'pole_class', 'pole_type', 'pole_height'],
    validation: poleSchema,
    condition: (data) => data.equipment_type === 'POLE',
  },
  {
    id: 'wire',
    title: 'Wire Damage',
    fields: ['wire_down', 'wire_size', 'wire_type', 'spans'],
    validation: wireSchema,
  },
  {
    id: 'transformer',
    title: 'Transformer Damage',
    fields: ['split', 'leakage', 'kva', 'pole_number'],
    validation: transformerSchema,
    condition: (data) => data.equipment_type === 'TRANSFORMER',
  },
  {
    id: 'equipment',
    title: 'Equipment Inventory',
    fields: ['equipment_items'],
    validation: equipmentSchema,
  },
  {
    id: 'photos',
    title: 'Photos',
    fields: ['photos'],
    validation: photosSchema, // Min 4 photos
  },
  {
    id: 'recommendations',
    title: 'Recommendations',
    fields: ['actions', 'repair_replace', 'estimate'],
    validation: recommendationsSchema,
  },
  {
    id: 'signature',
    title: 'Signature',
    fields: ['signature'],
    validation: signatureSchema,
  },
];
```

### 5.2 Wire Size Dropdown

```typescript
// components/forms/WireSizeSelect.tsx

// Dropdown grouped by AWG and kcmil
// Shows: Size | Typical Use
// Validates against wire_sizes table

<WireSizeSelect
  name="primary_wire_size"
  label="Primary Wire Size"
  required={formValues.primary_wire_down}
/>
```

### 5.3 Equipment Catalog Integration

```typescript
// components/forms/EquipmentSelect.tsx

// Searchable dropdown with:
// - Equipment number
// - Type
// - Location (DLOC)
// - Barcode/QR scan option

<EquipmentSelect
  utilityClient={ticket.utility_client}
  onSelect={(equipment) => {
    form.setValue('equipment_number', equipment.equipment_number);
    form.setValue('equipment_type', equipment.equipment_type);
  }}
/>
```

**Week 4-5 Checklist:**

- [ ] All 8 form steps implemented
- [ ] Wire size dropdown populated
- [ ] Equipment catalog searchable
- [ ] Photo capture integrated
- [ ] Digital signature working
- [ ] Form validation complete

---

## PHASE 6: TIME TRACKING WITH GPS (Week 5-6)

### 6.1 Clock In/Out Flow

```typescript
// hooks/useTimeClock.ts

interface UseTimeClockReturn {
  isClockedIn: boolean;
  activeEntry: TimeEntry | null;
  clockIn: (options: ClockInOptions) => Promise<void>;
  clockOut: (options: ClockOutOptions) => Promise<void>;
  elapsedTime: number;
}

// Clock In:
// 1. Get GPS location (accuracy < 100m)
// 2. Take photo (required)
// 3. Validate geofence (if on assigned ticket)
// 4. Create time entry
// 5. Start background GPS tracking

// Clock Out:
// 1. Get GPS location
// 2. Take photo (required)
// 3. Calculate duration
// 4. Validate (max 12 hours)
// 5. Update time entry
```

### 6.2 GPS Tracking Service

```typescript
// lib/services/gpsTracking.ts

interface GPSTrackingService {
  startTracking(ticketId: string): void;
  stopTracking(): void;
  getCurrentLocation(): Promise<GeoLocation>;
  getTrackingHistory(): GeoLocation[];
}

// Track every 30 seconds during IN_ROUTE
// Track every 5 minutes during ON_SITE
// Store in local IndexedDB
// Sync when online
```

**Week 5-6 Checklist:**

- [ ] Clock in/out working
- [ ] GPS validation accurate
- [ ] Photo required at clock in/out
- [ ] Background tracking working
- [ ] Time calculations correct

---

## PHASE 7: ADMIN REVIEW WORKFLOW (Week 6-7)

### 7.1 Review Interface

```typescript
// components/admin/AssessmentReview.tsx

interface AssessmentReviewProps {
  ticketId: string;
  assessment: DamageAssessment;
  onApprove: () => void;
  onRequestRework: (notes: string) => void;
  onReject: (reason: string) => void;
}

// Display:
// - All contractor data (read-only)
// - Photos with GPS on map
// - Time entries with GPS verification
// - Validation flags/warnings
// - Action buttons
```

### 7.2 Data Integrity Checks

```typescript
// lib/validation/reviewValidation.ts

interface ReviewCheckResult {
  passed: boolean;
  warnings: string[];
  errors: string[];
}

// Checks performed:
// 1. Photo count >= 4
// 2. All photos have GPS
// 3. Photo GPS within geofence
// 4. Time entry duration reasonable
// 5. No duplicate photos
// 6. Assessment data hash valid
// 7. All required fields present
```

**Week 6-7 Checklist:**

- [ ] Review interface complete
- [ ] All data visible to admin
- [ ] Integrity checks working
- [ ] Approve/reject/feedback flow working

---

## PHASE 8: OFFLINE SYNC (Week 7-8)

### 8.1 Sync Queue Implementation

```typescript
// lib/sync/syncManager.ts

interface SyncManager {
  // Add operation to queue
  queue(operation: SyncOperation): Promise<void>;
  
  // Process all pending operations
  sync(): Promise<SyncResult[]>;
  
  // Get pending count
  getPendingCount(): Promise<number>;
}

// Sync order:
// 1. Time entries (highest priority)
// 2. Assessments
// 3. Photos (background)
// 4. Expenses
```

### 8.2 Conflict Resolution

```typescript
// lib/sync/conflictResolver.ts

// When server data differs from local:
// 1. Check timestamps
// 2. If server newer, use server data
// 3. If local newer, prompt user
// 4. Log conflict for audit
```

**Week 7-8 Checklist:**

- [ ] Sync queue working
- [ ] Background sync functional
- [ ] Conflict resolution UI
- [ ] Offline indicator visible

---

## PHASE 9: TESTING & QA (Week 9-10)

### 9.1 Test Scenarios

| Scenario | Expected Result |
|----------|-----------------|
| Contractor clocks in outside geofence | Error: "Must be within 500m of site" |
| Photo without GPS | Error: "Enable location services" |
| Submit assessment with 3 photos | Error: "Minimum 4 photos required" |
| Time entry > 12 hours | Auto-clock out + admin flag |
| Duplicate photo uploaded | Flag for admin review |
| GPS spoofing detected | Flag for admin review |
| Offline assessment submission | Queued for sync |
| Admin approves assessment | Invoice auto-generated |

### 9.2 Load Testing

- [ ] 100 concurrent users
- [ ] 1000 photos uploaded
- [ ] 500 tickets created
- [ ] Sync queue with 100 items

**Week 9-10 Checklist:**

- [ ] All test scenarios pass
- [ ] Load testing complete
- [ ] Security audit passed
- [ ] Performance budget met

---

## PHASE 10: DEPLOYMENT (Week 11-12)

### 10.1 Pre-Launch Checklist

- [ ] Production database migrated
- [ ] Environment variables set
- [ ] SSL certificate configured
- [ ] Domain configured
- [ ] Monitoring active (Sentry)
- [ ] Backups configured
- [ ] Documentation complete

### 10.2 Launch

- [ ] Soft launch with test crew
- [ ] Feedback collected
- [ ] Issues resolved
- [ ] Full launch

---

## SUMMARY: CRITICAL IMPLEMENTATION ITEMS

### Must-Have for MVP

1. **Photo System**
   - [ ] EXIF GPS extraction
   - [ ] Server timestamp (not device)
   - [ ] SHA-256 hashing
   - [ ] Minimum 4 photos
   - [ ] Geofence validation

2. **Time Tracking**
   - [ ] GPS-verified clock in/out
   - [ ] Photo required
   - [ ] 12-hour max duration
   - [ ] Background tracking

3. **Assessment Form**
   - [ ] Wire size dropdown (24 options)
   - [ ] Equipment catalog
   - [ ] Multi-step form
   - [ ] Digital signature
   - [ ] Data hash on submit

4. **Data Integrity**
   - [ ] Server timestamps
   - [ ] GPS validation
   - [ ] Duplicate detection
   - [ ] Frozen data after submit
   - [ ] Audit logging

5. **Offline Support**
   - [ ] IndexedDB storage
   - [ ] Sync queue
   - [ ] Background upload
   - [ ] Conflict resolution

---

## Live workflow verification — 2026-10-01 (Codex)

- [x] Created QA-20261001 storm, two fictional contractor Auth fixtures, and two tickets; verified real persistence, roster membership, and one assignment per contractor.
- [x] Replaced sample contractor data and corrected profile activity, eligibility, assignee names, addresses, and assigned-ticket identity resolution.
- [x] Verified contractor login and isolation from another contractor's ticket.
- [x] Corrected false status-save success and hardcoded assessment-empty messages; connected assigned-ticket assessment navigation.
- [x] Removed 1099 tracking and app invoicing per user direction. Invoicing is handled externally; historical database records are preserved.
- [x] TypeScript check and 29 targeted tests passed across eight suites.
- [x] Implement contractor status progression through authenticated click-driven Start and checklist actions with server-guarded crew/assessor scope; see “Phase 4 — Click-driven contractor field status” below. Live cross-role verification on an eligible dispatched ticket remains open.
- [ ] Restore assessment reads after approval of the scoped SELECT grant with existing RLS.
- [ ] Finish staff contractor provisioning: one-person invitation implementation and live migration are complete as recorded below; actual email delivery and recipient activation remain pending.
- GPS/location testing is deferred by the user for a later build.

This checklist records the testing progress. Source changes are local; no deployment or Git operation performed.

---

**END OF IMPLEMENTATION CHECKLIST**

## Phase 4 UI/UX refresh — 2026-10-03 (Codex /root)

This entry records the authorized polish work in the existing implementation checklist.

- [x] Retain Grid Electric blue/navy as the primary palette and gold as the accent; add refined gradients, elevation, and reduced-motion-aware transitions. — Codex /root
- [x] Host Manrope body and Barlow Condensed display fonts locally, with the original font licenses. — Codex /root
- [x] Refresh the desktop sidebar, breadcrumbs, account menu, mobile drawer, and bottom navigation; add keyboard navigation search with Cmd/Ctrl+K. — Codex /root
- [x] Redesign dashboard hierarchy, metrics, status strip, quick actions, and recent tickets while preserving the existing data services. — Codex /root
- [x] Refresh storm event cards, contractor metrics/filters, review workspaces, reports, account pages, and contractor work surfaces. — Codex /root
- [x] Improve mobile filter wrapping, compact time review controls, responsive summary grids, touch targets, keyboard-accessible records, and sign-in validation/password visibility. — Codex /root
- [x] Validate TypeScript, scoped ESLint, and all 331 application tests; build production successfully in an isolated temporary copy. Exclude preserved iCloud dependency backups from Vitest discovery. — Codex /root
- [x] Verify the real sign-in surface and isolated sample-record previews of protected staff/contractor components at desktop, tablet, and phone widths. Previews are visual QA, not evidence of an authenticated live workflow. — Codex /root
- [x] Verify authenticated staff dashboard, storm events, and ticket queue; navigation search reached the live storm route and mobile contractor-name search returned the correct assigned ticket. — Codex /root
- [ ] Complete remaining authenticated visual acceptance across review and contractor workflows. No database schema, policy, or production data changes were made.

Visual QA images: `output/playwright/`.

### Same Wi-Fi preview — 2026-10-03 (Codex /root)

- [x] Correct the allowed development origin to the user-confirmed `192.168.1.72`; reproduce disabled login fields before the correction, then verify JavaScript asset HTTP 200, enabled email/password inputs, email typing, and password visibility on the actual LAN login page after reload. No credentials submitted. — Codex /root

- [x] Read the current Wi-Fi address (`192.168.4.32`), allow that exact development origin, and run Next.js on `0.0.0.0:3000` for the requested local multi-device preview. — Codex /root
- [x] Verify HTTP 200 on the LAN and localhost sign-in URLs, plus a browser render of the LAN sign-in form. — Codex /root
- [ ] Confirm connection from the second computer; the host-side URL is `http://192.168.4.32:3000`. The development server and host Mac must remain running.

### Second Super Admin — 2026-10-03 (Codex /root)

- [x] Create the requested `jcampbell@gridelectriccorp.com` Auth account in Central Command, activate her SUPER_ADMIN profile, and synchronize trusted app metadata. Preserve David's existing account. — Codex /root
- [x] Replace the one-Super-Admin index with a private, bounded two-Super-Admin trigger; verify that a third account is rejected and no test row is created. — Codex /root
- [x] Generate a one-time invite activation link without sending email or placing tokens in project files. Require Jeanie to set her own password. — Codex /root
- [ ] Verify Jeanie's first sign-in after she activates the account and sets her password on her own computer.

### Password setup readability — 2026-10-03 (Codex /root)

- [x] Remove the legacy dark-panel class from password setup; use the refreshed auth typography, navy headings/labels, dark instructions, readable error colors, and blue primary action. — Codex /root
- [x] Add field descriptions, validation alert semantics, and new-password autocomplete; retain password requirements and submission behavior. — Codex /root
- [x] Verify desktop and phone rendering in an isolated preview without changing account credentials; TypeScript, scoped ESLint, and 26 relevant tests pass. — Codex /root

### Individual staff permissions and contractor invitations — 2026-10-03 (Codex /root)

This tracker records the user's authorized Phase 4 feature work. Implementation details and activation gates are in `docs/adr/0006-individual-admin-permissions.md`.

- [x] Build People & access directory and per-person View/Edit controls for 12 modules and 21 permission keys, using the blue/navy/gold theme. — Codex /root
- [x] Apply permission-aware navigation, protected direct routes, screen mounting, and staff mutation controls; retain contractor portal behavior. — Codex /root
- [x] Prepare atomic audited database permission saves, restrictive RLS, revision conflict detection, and self/executive/last-administrator protections in the applied permissions migration. — Codex /root
- [x] Build one-person contractor invitation, duplicate/resend handling, trusted role binding, linked business-record finalization, password setup, status, and audit handling. — Codex /root
- [x] Support token-hash and standard invitation callbacks, preserve the public callback route, and clear permission snapshots when session identity changes. — Codex /root
- [x] Verify the initial local baseline: 355 application tests, TypeScript, scoped ESLint, isolated production build, and 17 isolated PGlite database checks. Verify sample-account previews at desktop/phone widths. — Codex /root
- [x] Capture the initial live policy/function baseline for review and rollback preparation before activation; refresh it to 127 policies before applying. — Codex /root
- [x] Before activation, verify the existing real David McCarty staff session still loads its dashboard and the new People & access page reports the migration-pending guard; verify typing in the LAN login email field without submitting credentials. — Codex /root
- [x] Apply the explicitly approved permissions/invitation migration `20261004010249` to live project `xcvacmreerrypygpritq`; follow up with the required server-role grants (`20261004010952`) and cached policy identity (`20261004011222`). — Codex /root
- [x] Generate the tracked migrations with Supabase CLI, match filenames to observed live history, regenerate database types, and remove temporary permission/invitation casts. — Codex /root
- [x] Verify real David browser save/reload/reset for Jeanie using equivalent role defaults, 23 live rollback database checks, 19 isolated checks, current advisors, and all 72 unchanged original non-staff policies. Both Super Admins retain full access; test fixtures roll back. Evidence: `docs/testing/admin-permissions-activation.json`. — Codex /root
- [x] Verify real QA contractor LAN sign-in, configured rate, assigned-ticket isolation, and denied direct People & access URL after migration; sign out the QA session. Refresh the AST graph to 2,555 nodes / 7,152 edges / 166 communities. — Codex /root
- [ ] Verify an actual module restriction across two independent real staff browser sessions; database denial is proven but second staff browser acceptance remains open. — Codex /root
- [ ] Verify SMTP/redirect configuration and actual invitation delivery, separate-computer activation, password setup, linked identity, duplicate rejection, and resend with an approved recipient. — Codex /root

### Implementation-plan state review — 2026-10-03 (Codex /root)

- [x] Review `implementation_plan.md`, current Git status/diffs/history, and Graphify queries against the existing 2,394-node graph. Review only; no application code or live database changes. — Codex /root
- [x] Verify current local baseline: 431 tests pass across 85 files; TypeScript passes with build metadata written outside the live runtime. — Codex /root
- [x] Complete Phase 3 Step 14 locally: preserve costing snapshots, display wages/reimbursement/payout, add admin billing/margin, refresh totals, and preserve offline storm/costing fields. — Codex /root
- [x] Reconcile Payroll navigation and local authorization: actual Sidebar/search includes Payroll, independent View/Edit keys are in the catalog, and controls respect edit access. Live module policies were applied with approval in migration `20261004010249`. — Codex /root
- [ ] Finish Step 15 device acceptance using trusted HTTPS. The approved payroll repair, live database checks, and Phase 3 migration-file reconciliation are complete; Step 16 uses authorized dummy pilot rates. See the Phase 3 completion entry below. — Codex /root

### Project guidance cleanup — 2026-10-03 (Codex /root)

- [x] Remove the obsolete build-guide prerequisite and references from project instructions, README, scratchpad, testing reports, and progress notes. Use the implementation plan and this checklist for task scope and progress. — Codex /root

### Phase 3 payroll completion — 2026-10-03 (Codex /root)

- [x] Complete Step 14 implementation and verify 441 tests / 85 files, TypeScript, scoped ESLint, isolated webpack production build (41 routes), 18 access-control checks, and 14 payroll-integrity checks. Database checks are isolated PGlite evidence. — Codex /root
- [x] Verify existing live payroll migrations and configure/read back six dummy utility-billing fallback rates authorized by the user; keep 30 existing dummy wage rates. — Codex /root
- [x] Verify real David staff Payroll page, refresh, time-review navigation, phone/tablet containment, and keyboard mobile Payroll navigation. Verify contractor wage/reimbursement displays using labeled sample shifts. — Codex /root
- [x] Inspect live security/performance advisors and preserve current costing/claim function definitions for the focused repair. — Codex /root
- [x] Obtain explicit user approval and deploy `preserve_payroll_snapshots_and_guard_vehicle_claims` (`20261004002801`). Verify both live function bodies and all-update trigger attachments; retain original definitions. Correct the earlier isolated fixture's column-limited-trigger mismatch and pass 16 integrity checks. — Codex /root
- [x] Pass 20 live database/RLS rollback checks, including rate-change immutability and linked payout ($180 wages + $20 reimbursement). Restore temporary QA role/rate edits and verify zero retained shifts/claims. — Codex /root
- [x] Verify real QA contractor Wi-Fi sign-in, configured rate, totals refresh, identity after reload, and staff Payroll route denial. GPS failure correctly blocks clock-in. — Codex /root
- [ ] Complete actual device shift/photo/claim/review workflow and displayed linked totals using a trusted HTTPS address. Current HTTP LAN browser testing cannot supply the required GPS reading. — Codex /root
- [x] Restore all five applied Phase 3 payroll migrations via CLI-created files, use confirmed live versions, and compare recovered SQL against recorded live history. — Codex /root
- [x] Apply the separately approved per-user permission/invitation migration and follow-up grants/performance fixes; verify 23 live database checks and real staff save/reload. — Codex /root

### Four QA workers and weekly overtime — 2026-10-03 (Codex /root)

- [x] Completion audit: re-read live state; four active approved profiles have real Auth sign-ins and one QA ticket each. Six clock records reconcile, but weekly migration remains absent and all six reviews remain pending. Same explicit-approval blocker persists for three consecutive goal turns; full acceptance remains incomplete. — Codex /root

- [x] Verify persisted submitted totals on all four worker screens after reload; label the wage total as Wages to distinguish it from customer billing. — Codex /root

- [x] Create four live Supabase Auth/profile/approved contractor accounts: QA Casey Storm Manager, QA Jordan Team Lead, QA Taylor Senior Assessor, and QA Riley Driver. Use separate worker access and payroll roles; retain existing QA Damage Assessors to cover the fifth class. — Codex /root
- [x] Create QA-PAY-20261003 storm, confirmed roster membership, and one linked assigned QA ticket per new worker; retain generated passwords in the ignored local `.env.qa-payroll-credentials.json`. — Codex /root
- [x] Verify each new account signs in through the real browser and survives reload. Verify read-only assigned wage, ticket selection, work-type dropdown, and break dropdown. — Codex /root
- [x] Run one browser clock-in/out per new worker with emulated GPS (10m accuracy) and exactly 16 hours on September 21, 2026. Read back real linked records: 960 billable minutes each; wages $1,840 / $1,680 / $1,520 / $1,040; customer billing $2,800 each. Reconcile 64h / $6,080 wages / $11,200 billing / $5,120 margin before reimbursement. — Codex /root
- [x] Implement local 24-hour shift validation, assigned-ticket linkage, persisted GPS accuracy, and validation errors that cannot masquerade as offline success. — Codex /root
- [x] Prepare CLI-created migration `20261004025622_weekly_overtime_and_clock_validation.sql`: Monday-Sunday America/Chicago week, 1.5x after 40 worked hours, separate regular/overtime snapshots, frozen clock-in rates, chronological/nonoverlapping shifts, break/GPS/ticket validation, staff-bound review, and restrictive worker isolation. — Codex /root
- [x] Add identity-scoped, chronological offline time upload processing with server snapshot preservation and queue reconciliation. Pass 446 tests across 86 files, TypeScript, scoped ESLint, and isolated webpack build. Pass 15 isolated database suites, including 30 role/work-type combinations, weekly threshold/reset, week split, DST, snapshot protection, and permissive-policy isolation. — Codex /root
- [x] Verify two real QA Driver offline clock-in/out shifts upload exactly once on reconnection: 60 minutes / $65 wages / $175 billing, then 15-minute break / 45 paid minutes / $48.75 wages / $131.25 billing. Confirm all six QA shifts total 66 elapsed hours, 65.75 paid hours, $6,193.75 wages, $11,506.25 billing, $5,312.50 margin before reimbursement. — Codex /root
- [x] Fix and verify offline financial display and identity: unsynced wage totals remain unknown, queued pending minutes remain visible, previously loaded own-worker snapshots remain cached, sync refreshes submitted totals, and the verified worker identity survives offline focus plus the 30-second background refresh. Keep sign-out/account-change isolation tested. Pass 452 tests across 86 files, TypeScript, scoped ESLint, and isolated production build. — Codex /root
- [ ] Apply weekly migration after explicit approval. Automatic approval review rejected live deployment because it changes costing, triggers, and access control for all workers. No live weekly schema or policy changes have been applied. — Codex /root
- [ ] Verify staff review and Payroll dashboard through the existing staff Chrome session after explicit authorization. Automatic approval review rejected generating a sign-in link and accessing that session without specific authorization; no new staff credential was created. — Codex /root
- [ ] Finish live weekly overtime and offline allocation under the proposed migration, reimbursement submission/review, and physical device GPS/photo acceptance. Six browser shifts establish below-threshold clock/wage/billing and current-backend offline behavior only. Evidence: `docs/testing/payroll-test-workers.json`, `docs/testing/payroll-worker-acceptance.json`, and `output/playwright/payroll-*.png`. — Codex /root
- [ ] Finish live weekly overtime and offline allocation under the proposed migration, reimbursement submission/review, and physical device GPS/photo acceptance. Six browser shifts establish below-threshold clock/wage/billing and current-backend offline behavior only. Evidence: `docs/testing/payroll-test-workers.json`, `docs/testing/payroll-worker-acceptance.json`, and `output/playwright/payroll-*.png`. — Codex /root

### Dashboard status strip — Completed tile — 2026-10-04 (Cline)

- [x] Add a `completed` count to `DashboardMetricsData['status_breakdown']` in `dashboardReportingService.ts`, computed from active `COMPLETE` tickets alongside `in_route` / `on_site` / `pending_review`. — Cline
- [x] Collapse the duplicated super-admin local-test breakdown into a call to `buildDashboardMetrics` so the two implementations cannot drift. — Cline
- [x] Render a fifth `Completed` tile in `DashboardMetrics.tsx`, widen the strip to `md:grid-cols-5`, add the fifth status-dot color, and generalize the mobile strip border rules from a fixed 2x2 to `nth-child(2n)` / `:last-child` so the new cell has no stray borders. — Cline
- [x] Extend `dashboardReportingService.test.ts` and `useNavigationSignals.test.ts` fixtures; pass 452 tests across 86 files and `tsc --noEmit`. — Cline

### Ticket importance replaces A/B/C/X priority — 2026-10-04 (Cline)

- [x] Apply live Supabase migration `ticket_importance_replaces_priority`: add `tickets.is_important boolean NOT NULL DEFAULT false`, backfill legacy Critical (`priority = 'A'`) to `true`, recreate index as `idx_tickets_is_important`, drop the `priority` column, and rewrite `create_storm_ticket` to consume `p_common->>'is_important'`. Assessments keep their own NFPA `priority_level`. — Cline
- [x] Replace `TicketPriorityBadge` with `TicketImportanceBadge` (red destructive ⚠ *Important* vs. neutral secondary *Standard*) and wire it into the ticket detail page, ticket list column, and ticket card. — Cline
- [x] Swap the A/B/C/X select for an *Important ticket* checkbox on both ticket creation forms, describing the rule: environmental hazard (e.g., oil leak) or the public in danger. Update the ticket list filter to All/**Important**/**Standard**, map marker accents + popups, contractor recent-ticket summary, and the dashboard Emergency dispatch deep link (`?important=true`). — Cline
- [x] Update `Ticket.is_important`, validators, template common schema, `ticketIntakeService`, `localTestStore`, Dexie local ticket type, `contractorService`, `sql/03_ticket_tables.sql`, and affected tests; `tsc --noEmit` clean and 46/46 tests pass in the ticket/map/store/dexie suites. — Cline


### Configurable contractor time and payroll — 2026-10-04 (Codex /root)

- [x] Supersede the unapplied fixed-weekly proposal with the user-approved effective contractor agreement plan; preserve historical snapshots. — Codex /root
- [x] Implement local agreement validation, flat/weekly tiers, exact break/vehicle intervals, segmented wages/allowance, invitation setup recovery, and wage-only projections/cache cleanup. — Codex /root
- [x] Pass fourteen isolated PGlite calculation/ownership/access suites; this is local database evidence only. — Codex /root
- [ ] Complete UI/unit checks, live migration validation, type generation, and authenticated linked-record acceptance. — Codex /root
- [ ] Complete physical iPad GPS/photo acceptance through trusted HTTPS. Onboarding remains a separate branch. — Codex /root

### `/tickets` list page feedback — 2026-10-04 (Cline)

- [x] Reorder `TicketList.tsx` desktop columns so **Assigned To** is the second column (after **Ticket #**), per field feedback that crew assignment is the first thing staff scan for. — Cline
- [x] Add `getFeederFromPayload()` in `src/lib/tickets/templates/feeder.ts`, exported from `lib/tickets/templates`, resolving a ticket's feeder/circuit number from its utility payload (`feeder` for Entergy, `feeder_or_circuit_id` for Duke/CenterPoint/Oncor/FPL/TECO). Added `ticketService.getUtilityPayloadsByTicketIds()` for a single batched `ticket_payloads` fetch (live + local-test-store paths) so the list avoids N+1 requests. Renamed the column header to **Utility / Feeder** and show `Feeder <value>` beneath the utility client when present, falling back to the work description. — Cline
- [x] Renamed the **Location** column to **Outage Location** and switched its cell to `formatAddress()` so it renders the full street/city/state/zip instead of a partial join. — Cline
- [x] Switched the **Created** column from `formatDate` to `formatDateTime` so the ticket creation time is visible, not just the date. — Cline
- [x] Removed the global Online/Offline connection pill (`cc-connection`) from `TopBar.tsx` app-wide (admin + contractor shells), including the now-unused `online` state/effect, `Wifi`/`WifiOff` imports, and the dead `.cc-connection` CSS rules in `globals.css`. The existing offline-queue `OfflineBanner` is unaffected. — Cline
- [x] Verified with `tsc --noEmit` (clean), scoped `eslint` (clean), and the full `vitest` suite (458/458 tests, 87 files). Confirmed via a local dev server that `/tickets` and `/login` compile and render without error. — Cline


### Contractor onboarding: add records instead of invitations — 2026-10-04 (Codex /root)

- [x] Replace the invitation page with `/admin/contractors/add`, redirect the old URL, remove invitation/resend controls, and disable the legacy send service and API. — Codex /root
- [x] Add contractor contact details, pending onboarding status and a linked pay agreement atomically with an audit entry, without creating an Auth account or sending email. Display unlinked records by contact name and keep them out of dispatch until linked to an active account. Approval and eligibility flags are superseded by the minimal onboarding change below. — Codex /root
- [x] Format phone numbers as `(318) 555-0123`; display currency with a dollar sign, grouping and two decimals; remove custom multiplier entry and timezone selection, retaining the configured timezone. — Codex /root
- [x] Apply live migration `20261004202255_add_contractor_records_and_remove_unused_work_types` to Central Command: remove Admin/Training from the enum and rate tables; archive removed rate configuration in the audit trail. Preserve all ten shifts and six immutable pay agreements. — Codex /root
- [x] Regenerate live database types; pass 462 tests in 92 files, TypeScript, scoped ESLint, isolated webpack production build and eight isolated PGlite suites. Pass live rollback checks for linked save, duplicate/type rejection, staff reads and worker isolation; retain zero fixtures. — Codex /root
- [x] Verify the real signed-in browser add form, phone/currency displays, four work types, retired-route redirect, duplicate rejection and desktop/phone containment. No successful create was retained from browser testing. — Codex /root
- [x] Preserve concurrent contractor-list realtime/Assigned Tickets changes and unrelated TopBar changes; refresh the AST-only source graph with generated Next.js caches excluded. — Codex /root

Evidence: `docs/testing/contractor-add-verification.json`, `docs/testing/contractor-add-local.json`, and `scripts/verification/contractor-add-live-rollback.sql`. Remaining onboarding steps and account activation are follow-up work; adding a record does not grant portal access.


### Contractor account setup and minimal onboarding — 2026-10-04 (Codex /root)

- [x] Keep privileged contractor creation database-only. Add login account setup restricted to pre-added email, mailbox verification, server-only linking, active CONTRACTOR profile, and required password setup. Return a generic eligibility-neutral response. — Codex /root
- [x] Require a short onboarding form with editable first/last name, structured starting address, and private registration tag photo only for drivers. Save completion separately from Active/Inactive status. — Codex /root
- [x] Remove legacy approval/assignment-eligibility behavior from contractor screens and storm assignment checks; retain historical database columns. Limit Active/Inactive changes to CEO/Super Admin, block inactive Auth sign-in and assignments, and preserve reactivation. — Codex /root
- [x] Following explicit live-deployment authorization, apply migrations `20261004223538_contractor_account_setup_and_minimal_onboarding` and `20261004223756_harden_contractor_roster_trigger_search_path` to `xcvacmreerrypygpritq`. Verify server-only RPC grants, private photo bucket/policy metadata, live-backed generic setup HTTP 200, and unchanged counts (7 contractors, 8 Auth users, 10 shifts, 7 agreements). — Codex /root
- [x] Fix loopback same-origin validation, preserve the verification redirect hostname, and allow the verification callback before password-reset gating. Preserve ordinary password recovery. — Codex /root
- [x] Pass 499 application tests across 99 files, 21 isolated database suites, TypeScript, scoped onboarding/auth/contractor ESLint (an unchanged StormWorkspace effect fails its existing rule), isolated production build, and AST-only Graphify refresh (2,860 nodes / 7,770 edges). No real verification email or new Auth user was generated during deployment checks. — Codex /root
- [ ] Complete user-owned live verification email/password setup, onboarding persistence/photo upload, portal navigation, and identity-based inactive/storage acceptance. The in-app browser preview did not hydrate reliably; API and isolated checks do not substitute for this acceptance. — Codex /root

Evidence: `docs/testing/contractor-onboarding-verification.json`, `docs/testing/contractor-onboarding-local.json`, and `scripts/verification/contractor-onboarding.mjs`. The remaining Supabase security advisor notice is the existing disabled leaked-password protection setting; no new database advisor notices remain.


### Contractor setup email incident — 2026-10-04 (Codex /root)

- [x] Diagnose the user's live setup attempt by matching the contractor setup timestamp to Supabase Auth logs: Auth returned 500 during `POST /admin/users`; the database rejected INSERT with `Internally added contractor required` because the trigger checked server app metadata before Auth had persisted it. The API had hidden this failure behind the generic eligibility response. — Codex /root
- [x] Apply `20261004231500_fix_contractor_account_setup_claim`: authorize Auth INSERT with a private, one-use random claim for the exact internally added email/contractor, expiring after 10 minutes; set protected app metadata after user creation and log safe error codes for future diagnosis. Direct access to the claim table remains revoked. — Codex /root
- [x] Confirm live claim RPC remains service-role-only, the claim table grants no direct service-role table access, and database counts remain 7 contractors / 8 Auth users / 10 shifts / 7 agreements. Failed attempt did not create an Auth user; no email was sent by the agent. — Codex /root
- [ ] User retry of verification email and end-to-end account/onboarding acceptance. If the email still does not arrive, inspect Auth mailer configuration; Supabase's built-in SMTP only sends to organization member addresses and is limited to two messages per hour. — Codex /root

Evidence: `docs/testing/contractor-onboarding-verification.json` and the Supabase Auth/Postgres log match at 23:03:45–46 UTC.


### Contractor verification callback and initial login — 2026-10-04 (Codex /root)

- [x] Diagnose the user's `/login#error_code=otp_expired` link. Supabase Auth logs show the OTP send returned 200 at 23:11 UTC; `/verify` returned `Email link is invalid or has expired` at 23:12 UTC. The one-use URL can no longer be reused. — Codex /root
- [x] Update setup emails to request `/auth/confirm?flow=contractor-setup`; valid confirmation routes to `/set-password`, and expired setup links show a route back to `/setup-account`. Retain flow marker while removing token fragments from browser history. — Codex /root
- [x] After contractor password setup, clear the reset gate, sign out the temporary verification session, and send the user to `/login`; first password sign-in is redirected to required `/contractor/onboarding`. — Codex /root
- [ ] In Supabase Authentication > URL Configuration, allow `http://localhost:3000/auth/confirm*` (and the deployed app's exact callback origin when applicable). Supabase uses its Site URL when a requested redirect is not allow-listed. The live connector does not expose Auth URL/template settings; no redirect allow-list setting was changed. Send a fresh verification email after the URL is allowed, then click it once. — Codex /root
- [ ] Complete real password setup and first-login onboarding acceptance. Tests were not rerun after these flow changes. — Codex /root

See `docs/testing/contractor-onboarding-verification.json` for the observed Auth log times and current acceptance boundary.


### Contractor dashboard landing page — 2026-10-04 (Codex /root)

- [x] Add `/contractor/dashboard` with a personal field brief, open assignments, completed hours and stored submitted wages over the last seven days, expense-review totals, storm work tied to assigned tickets, quick actions, and loading/error/new-account empty states. Preserve the established blue/navy/gold design. — Codex /root
- [x] Use verified active/linked/onboarded identity for the dashboard API, read data with the authenticated RLS session, scope every personal query to that contractor, paginate totals, omit client billing fields, and disable shared caching. — Codex /root
- [x] Route contractor sign-in and completed onboarding to Dashboard; add desktop Dashboard and mobile Home navigation and update the contractor brand home link. Retain required onboarding and password gates. — Codex /root
- [x] Pass TypeScript, scoped ESLint, isolated webpack production compilation, and AST-only Graphify refresh. Automated tests were not run at the user's request; no new test files were retained. — Codex /root
- [ ] Authenticated visual acceptance in the user's Norton Neo browser. The browser-control tool cannot access that session, so the compiler checks do not establish live visual or RLS acceptance. — Codex /root

### Contractor onboarding vehicle registration removal — 2026-10-04 (Antigravity)

- [x] Remove the vehicle registration tag upload section and file handling from `/contractor/onboarding` (`ContractorOnboardingForm.tsx`), keeping only Name and Starting Location. — Antigravity
- [x] Apply migration `20261004234500_remove_vehicle_registration_from_onboarding_gate.sql` to live database `xcvacmreerrypygpritq`, removing the driver vehicle registration tag photo requirement from the `complete_contractor_onboarding` RPC gate. — Antigravity
- [x] Update schema validation, server onboarding loader, and unit test suites: 101/101 test files passing (508/508 tests). — Antigravity
- [x] Update codebase knowledge graph with `graphify update .`. — Antigravity

### Phase 4 — Required top-down ticket assessment (2026-10-05, Codex /root)

- [x] Implement every requested inspection topic with explicit unanswered yes/no choices, conditional required detail, predefined values, and final notes. — Codex /root
- [x] Add responsive numbered field-sheet UI using blue primary/navy and gold accents; preserve GPS/photo capture. — Codex /root
- [x] Add IndexedDB answer drafts, ticket/staff readback, and stable-ID reconnect processing scoped to the signed-in contractor. — Codex /root
- [x] Prepare and locally verify exact server validation/assignment/review/escalation migration: 29 PGlite checks. — Codex /root
- [x] Verify typecheck, scoped lint, production webpack build, focused tests, desktop/phone component interactions, draft restore, and no horizontal overflow. — Codex /root
- [x] Apply live assessment migration `20261006120830_top_down_ticket_assessments` to Central Command Supabase after the user authorized activation; confirm structured columns, trigger installation, and retained RLS policy set. — Codex /root (2026-10-06)
- [x] Remove standalone assessment links from admin and contractor sidebars; add ticket-filtered assessment review controls to ticket detail, route the former admin review URL to `/tickets`, and route dashboard entry points through tickets. — Codex /root (2026-10-06)
- [x] Verify live RLS/trigger workflow with rollback-only records and simulated request claims; all 14 scenario groups pass with matching fixture counts. — Codex /root (2026-10-06)
- [ ] Complete real contractor sign-in/submission, staff readback, physical GPS/photo upload, and reconnect on the same ticket. — Codex /root

Evidence and approval scope: `docs/testing/field-assessments-validation.md`. Full regression run leaves four unrelated TicketAssign mock failures (stormRosterService.listOptions absent).


### Phase 4 — Ticket drafts, crew dispatch, and approval hierarchy (2026-10-06, Codex /root)

- [x] Open the assessment form directly from an on-site ticket; Save persists a draft and returns to ticket readback, with explicit Submit afterward. — Codex /root
- [x] Persist driver/assessor crew membership and ticket-owned Admin team lead assignment; validate contractor roles, active eligibility, storm roster and team scope. — Codex /root
- [x] Enforce assigned team lead review then CEO/Super Admin final approval; corrections preserve prior immutable submissions and create new revisions. — Codex /root
- [x] Install private assessment photo Storage and linked media policies; require uploaded GPS evidence for submission; preserve immutable submitted evidence. — Codex /root
- [x] Add per-user in-app notifications for dispatch, submission, correction, and final approval; preserve explicit submission intent through offline sync. — Codex /root
- [x] Record utility handoff after final approval and ticket/assessment PDF export; include both review notes and handoff details in the printable record. — Codex /root
- [x] Apply live workflow, intake-scope and fieldwork-guard migrations; regenerate Supabase types; pass 36 local DB checks, 14 live rollback groups, 57 focused tests, TypeScript, scoped ESLint, production webpack build, and Graphify refresh. — Codex /root
- [ ] User will handle the Admin team lead account at the office; current live directory has no Admin accounts. People & access edits existing staff and has no creation form. — Codex /root
- [ ] Authenticated visual/device/reconnect acceptance and hosted frontend deployment. Local preview is running at http://127.0.0.1:3000. — Codex /root

Evidence: `docs/testing/ticket-workflow-validation.md`, `ticket-workflow-local.json`, and `ticket-workflow-live.json`. Live SQL uses simulated request claims and rollback-only object metadata; it does not establish real authentication or file-upload acceptance.

- [x] Guard legacy single-contractor tickets against starting fieldwork before team lead and driver/assessor crew dispatch. — Codex /root (2026-10-06)

### Damage section photos and completed ticket Print / Save PDF — 2026-10-06 (Codex /root)

- [x] Require a GPS-validated damage photo beside every active damage/hazard description, including independent cross arm and insulator evidence. Preserve section keys and stable photo IDs through durable files, saved drafts, submission, and ticket/staff readback. — Codex /root
- [x] Add completed-ticket Print / Save PDF with one record containing ticket/location/utility fields, attached assessment revisions, section photos, final notes, both review stages, and utility handoff information. Browser print supports paper or Save as PDF; incomplete or inaccessible evidence prevents export. Exclude abandoned draft uploads. — Codex /root
- [x] Preserve the newer live crew/draft/review workflow discovered during continuation. Verify the private assessment bucket and deployed section validator; three live validator checks pass without writing rows. An extra locally generated storage migration was removed because the deployed workflow already supplies the bucket and access rules. — Codex /root
- [x] Pass 98 focused tests across 11 files, 36 isolated exact-workflow database checks, TypeScript, scoped ESLint, and production webpack compilation/static generation of 50 pages. Generate and inspect a three-page Letter PDF from labeled sample data. Refresh Graphify with AST extraction. — Codex /root
- [ ] Resolve the broader suite's eight ticket assignment/status test failures (558 tests pass); these files are outside this photo/report change. — Codex /root
- [ ] Complete real signed-in physical GPS/photo upload, offline/cross-device readback, and completed-ticket print-dialog acceptance. Sample rendering and SQL validator checks do not establish device acceptance or hosted deployment. — Codex /root

### Auth/profile and ticket fetch error handling — 2026-10-06 (Cline)

- [x] Preserve native Error messages and metadata in profile/ticket diagnostics instead of opaque `{}` output; retain fail-closed permissions. — Cline
- [x] Render ticket-fetch/network errors with a retry action; show 404 only for a confirmed zero-row ticket query. — Cline
- [x] Pass TypeScript, scoped ESLint, diff check, and 12 focused error-handling/AuthProvider/ticket-detail tests. Supabase project health, Auth, Data API CORS preflight, live profile access, and sampled browser profile requests were verified; the exact transient browser fetch failure was not reproduced. — Cline

### Ticket-detail assigned ticket queue — 2026-10-06 (Codex /root)

- [x] Replace the ticket-details assessment panel with a same-crew/team assigned-ticket list; add assignment-scoped reads that cache for offline use. Keep staff assessment/review controls in the staff-only Assessment tab and show contractors only the field actions their assignment/state permit. — Codex /root
- [x] Verify ticket-detail implementation with the full 598-test suite, TypeScript, focused ticket tests, and the 41-check local ticket-workflow database harness. — Codex /root (2026-10-06)
- [x] Sign in to the contractor account at `192.168.1.102:3000`; confirm the target ticket shows Open, the same-crew queue, no SOP panel, and a useful field-action explanation. Leave the record untouched because its comments mark it workflow-only with no field dispatch. — Codex /root (2026-10-06)

### Simplified contractor ticket work and staff review — 2026-10-06 (Codex /root)

- [x] Remove SOP/workflow instruction content from `TicketAssessments` for all roles; preserve assessment answers, evidence, correction notes, and authorized staff review controls. — Codex /root
- [x] Project contractor state to Open/Closed, remove contractor review/history tabs, and place Start/navigation/arrival/assessment actions at the bottom of the ticket. Keep same-crew/team assigned-ticket context. — Codex /root
- [x] Keep legacy pre-submission `COMPLETE` work accessible to its assessor and replace empty field-action panels with a clear next-step message. — Codex /root (2026-10-06)
- [x] Pass full tests (598/598 across 110 files), TypeScript, targeted ESLint, and 41 local ticket-workflow database checks. — Codex /root (2026-10-06)
- [x] Finish an isolated production webpack build after the last footer adjustments; webpack compilation, TypeScript, and generation of all 50 static pages pass. — Codex /root (2026-10-06)
- [ ] Repeat browser QA with valid Super Admin access for staff-side review, corrections, final approval, and utility-record screens. The supplied Super Admin login was rejected as invalid credentials; no approval or utility handoff was attempted. — Codex /root
- [ ] Verify Start, real device navigation/GPS return, draft upload/reconnect, submission, and staff review on an eligible test ticket. The signed-in contractor record was explicitly marked workflow-only with no field dispatch, so no status or evidence mutation was made. — Codex /root
- [ ] Apply the prepared progressive-draft migration `20261006140000_allow_progressive_ticket_assessment_drafts.sql` to the verified backend before accepting the updated save/submit behavior against that database. No live migration was applied in this pass. — Codex /root

### Contractor dashboard team & crew panel — 2026-10-06 (Cline)

- [x] Remove the misplaced dispatch queue and quick action from `/admin/dashboard`; add a contractor-scoped Team & Crew panel to `/contractor/dashboard` using only tickets assigned to the signed-in contractor. — Cline
- [x] Move `DashboardDispatch` to the contractor dashboard: active assigned tickets, queue filtering/search, deep-linked ticket selection, and team/crew/driver/assessor readout; preserve management-only dispatch writes and scope server-side name lookups to those assigned ticket IDs. — Cline
- [x] Route contractor ticket-list and ticket-detail team/crew links to `/contractor/dashboard?dispatchTicketId=<ticket-id>#dispatch`; support ticket selection from that query parameter. — Cline
- [x] Pass contractor dispatch/deep-link, ticket-detail, and workflow tests (12/12), full TypeScript, scoped ESLint, scoped diff check, obsolete-admin-route search, and Graphify AST update. — Cline
- [x] Preserve the existing management-only dispatch assignment authorization; the contractor dashboard queue is read-only and does not broaden database permissions. — Cline

### Admin dashboard metric label — 2026-10-06 (Cline)

- [x] Rename the admin dashboard metric title from “Active Contractor Crews” to “Active Contractors”; preserve the metric value and behavior. — Cline

### Admin contractor roster role column — 2026-10-06 (Cline)

- [x] Replace the Business column in `/admin/contractors` with each contractor's role, using the shared human-readable role labels. — Cline
- [x] Pass scoped ESLint for the roster page. The full TypeScript check did not complete within the available command window. — Cline


### Phase 4 — Official Entergy Clean-up and Damage assessment forms (2026-10-06, Codex /root)

- [x] Visually inventory both supplied scanned Entergy PDFs; implement separate forms covering every printed field/option, six equipment rows and three customer-transfer rows with additional-row support. — Codex /root
- [x] Add responsive blue/navy/gold field sheets, ticket entry points and saved/submitted readback; retain identifiers as text and display printed directions as source reference. — Codex /root
- [x] Add actor-scoped offline drafts/queues, private linked GPS photo evidence, stale-device conflict protection, immutable submission and completed-ticket report attachments. — Codex /root
- [x] Install live migrations `20261006175056_entergy_official_ticket_forms` and `20261006175923_remove_entergy_lighting_map` on Central Command (`xcvacmreerrypygpritq`); merge generated table/RPC types and confirm RLS/grants. — Codex /root
- [x] Remove lighting map drawing, legend, readback/report rendering and required-map validation at the user's request; preserve lighting wattage/type inputs and existing saved data. Verify live lighting submission without a map. — Codex /root
- [x] Pass 627 full-suite tests across 113 files, 51 focused tests, TypeScript, scoped ESLint, production webpack build (50 pages), 35 local database checks and 17 live rollback scenario groups with matching fixture row counts. — Codex /root
- [x] Verify desktop/mobile component layout and interactions; update Graphify with AST-only extraction. — Codex /root
- [ ] Complete real signed-in contractor/staff, physical GPS/camera/private upload, offline/cross-device readback and completed-ticket print-dialog acceptance; deploy hosted frontend. — Codex /root

Evidence: `docs/testing/entergy-source-coverage.md`, `docs/testing/entergy-forms-validation.md`, `docs/testing/entergy-forms-database.json`, `docs/testing/entergy-forms-live.json` and component preview screenshots. Live SQL uses simulated claims and rollback-only object metadata; it does not establish real browser authentication or file uploads.

### Phase 4 — Dedicated contractor Ticket work screen (2026-10-06, Codex /root)

- [x] Add Start beside each own open ticket in the assigned-ticket panel; route to `/tickets/[id]/work` while keeping the same ticket identity. — Codex /root
- [x] Move contractor Entergy tools into the new work screen, make each entire Clean-up/Damage card clickable, and return form saves and Back navigation there. Preserve arrival and assignment gates. — Codex /root
- [x] Include field checklist/photos, travel/arrival actions, notes, environmental/public-safety escalation, saved assessment readback, site reference, time clock, assigned-ticket queue and Send ticket for review. Preserve existing crew, GPS/photo and staff approval requirements. — Codex /root
- [x] Activate append-only `ticket_work_notes`, guarded authenticated RPC, idempotent retries, actor-scoped IndexedDB sync, critical-priority safety flags, dispatch in-app notifications, staff readback and report inclusion on live Central Command Supabase. — Codex /root
- [x] Verify one explicitly approved permanent QA note through the actual signed-in contractor account, Supabase row readback and page reload; verify both card routes and responsive 390px/1201px browser layouts. — Codex /root
- [x] Pass the full 639-test suite across 115 files, TypeScript, scoped ESLint, isolated production webpack build (50 generated pages), 15 isolated database checks and six rollback-only live SQL scenario groups. — Codex /root
- [x] Remove the same-crew Assigned tickets panel from `/tickets/[id]/work`; keep the Assigned tickets row on ticket details as the contractor's Start entrypoint. — Codex /root
- [x] Restore development type paths after the isolated build and refresh Graphify with AST-only extraction (4,700 nodes / 12,984 edges). — Codex /root

Evidence: `docs/testing/ticket-workspace-validation.md`, `docs/testing/ticket-work-notes-local.json`, `docs/testing/ticket-work-notes-live.json` and `docs/testing/ticket-workspace/`. The target ticket remains workflow-only with no field dispatch; its field status and hazard flags were preserved. Real-device GPS/camera/offline submission and staff approval acceptance remain open in the earlier workflow checklist.

### Phase 4 — Click-driven contractor field status (2026-10-06, Codex /root)

- [x] Replace GPS status transitions with the authenticated `record_ticket_field_action` RPC: Start records Assigned → En Route; assigned assessor checklist opening records En Route → On Site. The server validates the active contractor, matching dispatched crew, permitted actor and current status under a ticket row lock. GPS fields remain null for these actions; the legacy GPS RPC is revoked from anon and authenticated callers. — Codex /root
- [x] Add the shared Start action to the Assigned tickets row and work-page entry; show Continue work once underway; keep Open navigation separate. Remove arrival polling/geofence checks from these actions. Restore a navigation-only Start link for the existing legacy REJECTED QA ticket so the contractor's row still opens Ticket work without changing that record. — Codex /root
- [x] Record On Site before the assigned assessor's checklist renders, including direct route entry; make reload/reopen idempotent. Preserve ordered, actor-scoped offline actions and replay before assessment uploads; failed/reassigned actions remain visible without overwriting newer server state. — Codex /root
- [x] Add contractor stage badges/filters and realtime/local refresh paths; retain detailed staff review labels. Remove the duplicate Start footer panel and redundant Location & Contact card from ticket details per user feedback. — Codex /root
- [x] Apply live migration `20261006204808_click_driven_ticket_field_progress` to Central Command (`xcvacmreerrypygpritq`); align the local migration filename with the live migration ledger; merge generated RPC type; verify live execute grants; run Supabase security/performance advisors. — Codex /root
- [x] Pass 49 isolated PGlite ticket workflow checks, all 653 tests across 117 files, TypeScript, scoped ESLint, production webpack build with all 50 pages, and Graphify AST refresh. Signed-in contractor browser DOM shows exactly one Start link in the Assigned tickets row and confirms the duplicate panels are absent. — Codex /root
- [ ] Validate the transition readback across real contractor and staff sessions using the same dispatched Assigned ticket, including location-denied/device/offline acceptance. Current live data has zero dispatched Assigned tickets; target 2026100102 is legacy REJECTED without team lead, crew, or driver and remains unchanged. — Codex /root

Evidence: `docs/testing/ticket-workflow-local.json` and `docs/testing/click-driven-ticket-progress-validation.md`. Supabase advisors currently report the existing Auth leaked-password-protection warning and general existing index/RLS findings; no finding names the new field-action RPC. Advisor remediation should be triaged separately from this workflow.
