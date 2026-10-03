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
- [ ] Complete contractor status progression after approval of scoped Supabase status permissions.
- [ ] Restore assessment reads after approval of the scoped SELECT grant with existing RLS.
- [ ] Finish staff contractor provisioning: invitation UI currently references missing scripts; QA fixtures do not prove that workflow.
- GPS/location testing is deferred by the user for a later build.

`MASTER_BUILD_INSTRUCTIONS.md` is absent from this checkout. This checklist records the testing progress in its place. Source changes are local; no deployment or Git operation performed.

---

**END OF IMPLEMENTATION CHECKLIST**

## Phase 4 UI/UX refresh — 2026-10-03 (Codex /root)

The guide's `MASTER_BUILD_INSTRUCTIONS.md` is absent from this checkout. This entry records the authorized polish work in the existing implementation checklist.

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

- [x] Read the current Wi-Fi address (`192.168.4.32`), allow that exact development origin, and run Next.js on `0.0.0.0:3000` for the requested local multi-device preview. — Codex /root
- [x] Verify HTTP 200 on the LAN and localhost sign-in URLs, plus a browser render of the LAN sign-in form. — Codex /root
- [ ] Confirm connection from the second computer; the host-side URL is `http://192.168.4.32:3000`. The development server and host Mac must remain running.
