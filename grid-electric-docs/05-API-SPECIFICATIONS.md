# Central Command — API SPECIFICATIONS

## Backend API Documentation

**Version:** 1.0  
**Date:** February 4, 2026  
**Base URL:** `https://api.gridelectric.com/v1`  
**Authentication:** Bearer Token (JWT)

---

## TABLE OF CONTENTS

1. [Authentication](#1-authentication)
2. [Users & Profiles](#2-users--profiles)
3. [Subcontractors](#3-subcontractors)
4. [Tickets](#4-tickets)
5. [Time Tracking](#5-time-tracking)
6. [Expenses](#6-expenses)
7. [Damage Assessments](#7-damage-assessments)
8. [Invoices](#8-invoices)
9. [Media & Files](#9-media--files)
10. [Real-time Subscriptions](#10-real-time-subscriptions)
11. [Error Handling](#11-error-handling)

---

## 1. AUTHENTICATION

### 1.1 Authentication Overview

Grid Electric uses Supabase Auth with JWT tokens. All API requests must include a valid access token in the Authorization header.

```
Authorization: Bearer <access_token>
```

### 1.2 Auth Endpoints (Supabase Auth)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/v1/signup` | POST | Register new user |
| `/auth/v1/token?grant_type=password` | POST | Email/password login |
| `/auth/v1/token?grant_type=refresh_token` | POST | Refresh access token |
| `/auth/v1/logout` | POST | Sign out user |
| `/auth/v1/recover` | POST | Request password reset |
| `/auth/v1/magiclink` | POST | Send magic link |
| `/auth/v1/user` | GET | Get current user |
| `/auth/v1/user` | PUT | Update user data |

### 1.3 Login Request/Response

**Request:**
```http
POST /auth/v1/token?grant_type=password
Content-Type: application/json

{
  "email": "contractor@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "-J9sPj9Fq0d8l2a...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "contractor@example.com",
    "role": "CONTRACTOR",
    "aud": "authenticated"
  }
}
```

---

## 2. USERS & PROFILES

### 2.1 Get Current Profile

```http
GET /rest/v1/profiles?select=*,subcontractors(*)
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "contractor@example.com",
  "first_name": "John",
  "last_name": "Smith",
  "phone": "(555) 123-4567",
  "role": "CONTRACTOR",
  "is_active": true,
  "last_login_at": "2026-02-04T09:30:00Z",
  "created_at": "2026-01-15T08:00:00Z",
  "subcontractors": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "business_name": "Smith Electrical Services LLC",
    "onboarding_status": "APPROVED",
    "is_eligible_for_assignment": true
  }
}
```

### 2.2 Update Profile

```http
PATCH /rest/v1/profiles?id=eq.<user_id>
Authorization: Bearer <token>
Content-Type: application/json

{
  "first_name": "John",
  "last_name": "Smith",
  "phone": "(555) 987-6543"
}
```

---

## 3. SUBCONTRACTORS

### 3.1 List Subcontractors (Admin Only)

```http
GET /rest/v1/subcontractors?select=*,profiles(first_name,last_name,email)&order=created_at.desc
Authorization: Bearer <admin_token>
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `onboarding_status` | string | Filter by status |
| `is_eligible_for_assignment` | boolean | Filter by eligibility |
| `limit` | integer | Page size (default: 20) |
| `offset` | integer | Pagination offset |

**Response:**
```json
[
  {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "business_name": "Smith Electrical Services LLC",
    "business_type": "LLC",
    "tax_id": "**-***1234",
    "address_line1": "123 Business Ave",
    "city": "Tampa",
    "state": "FL",
    "zip_code": "33601",
    "onboarding_status": "APPROVED",
    "is_eligible_for_assignment": true,
    "approved_at": "2026-01-20T10:00:00Z",
    "profiles": {
      "first_name": "John",
      "last_name": "Smith",
      "email": "john@example.com"
    }
  }
]
```

### 3.2 Get Subcontractor Details

```http
GET /rest/v1/subcontractors?id=eq.<id>&select=*,profiles(*),subcontractor_credentials(*),subcontractor_rates(*)
Authorization: Bearer <token>
```

### 3.3 Create Subcontractor (Onboarding)

```http
POST /rest/v1/subcontractors
Authorization: Bearer <token>
Content-Type: application/json

{
  "profile_id": "550e8400-e29b-41d4-a716-446655440000",
  "business_name": "Smith Electrical Services LLC",
  "business_type": "LLC",
  "tax_id_encrypted": "<encrypted_value>",
  "address_line1": "123 Business Ave",
  "city": "Tampa",
  "state": "FL",
  "zip_code": "33601",
  "business_phone": "(555) 123-4567",
  "business_email": "business@example.com"
}
```

### 3.4 Update Subcontractor Status (Admin)

```http
PATCH /rest/v1/subcontractors?id=eq.<id>
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "onboarding_status": "APPROVED",
  "is_eligible_for_assignment": true,
  "approved_by": "admin-user-id",
  "approved_at": "2026-02-04T10:00:00Z"
}
```

### 3.5 Upload Credential Document

```http
POST /storage/v1/object/credentials/<subcontractor_id>/<filename>
Authorization: Bearer <token>
Content-Type: application/pdf

<binary file data>
```

---

## 4. TICKETS

### 4.1 List Tickets

```http
GET /rest/v1/tickets?select=*,assigned_subcontractor:subcontractors(id,business_name,profiles(first_name,last_name))&order=created_at.desc
Authorization: Bearer <token>
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter by status |
| `assigned_to` | uuid | Filter by assignee |
| `priority` | string | Filter by priority |
| `utility_client` | string | Filter by client |
| `scheduled_date` | date | Filter by date |
| `limit` | integer | Page size |
| `offset` | integer | Pagination offset |

**Response:**
```json
[
  {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "ticket_number": "GES-260245",
    "status": "IN_ROUTE",
    "priority": "A",
    "address": "1234 Main Street",
    "city": "Tampa",
    "state": "FL",
    "zip_code": "33601",
    "latitude": 27.9506,
    "longitude": -82.4572,
    "utility_client": "Duke Energy",
    "work_order_ref": "DUKE-2026-8842",
    "scheduled_date": "2026-02-04",
    "due_date": "2026-02-04T14:00:00",
    "assigned_to": "660e8400-e29b-41d4-a716-446655440001",
    "assigned_at": "2026-02-04T08:30:00Z",
    "created_at": "2026-02-04T08:00:00Z",
    "assigned_subcontractor": {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "business_name": "Smith Electrical Services LLC",
      "profiles": {
        "first_name": "John",
        "last_name": "Smith"
      }
    }
  }
]
```

### 4.2 Get Ticket Details

```http
GET /rest/v1/tickets?id=eq.<id>&select=*,ticket_status_history(*),damage_assessments(*),time_entries(*)
Authorization: Bearer <token>
```

### 4.3 Create Ticket (Admin)

```http
POST /rest/v1/tickets
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "ticket_number": "GES-260246",
  "priority": "A",
  "address": "5678 Oak Avenue",
  "city": "Orlando",
  "state": "FL",
  "zip_code": "32801",
  "latitude": 28.5383,
  "longitude": -81.3792,
  "utility_client": "Duke Energy",
  "work_order_ref": "DUKE-2026-8843",
  "work_description": "Downed conductor from vehicle collision",
  "special_instructions": "Coordinate with Orlando Fire Dept",
  "scheduled_date": "2026-02-04",
  "due_date": "2026-02-04T16:00:00",
  "created_by": "admin-user-id"
}
```

### 4.4 Update Ticket Status

```http
PATCH /rest/v1/tickets?id=eq.<id>
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "ON_SITE",
  "started_at": "2026-02-04T10:00:00Z"
}
```

### 4.5 Assign Ticket

```http
PATCH /rest/v1/tickets?id=eq.<id>
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "assigned_to": "660e8400-e29b-41d4-a716-446655440001",
  "assigned_by": "admin-user-id",
  "assigned_at": "2026-02-04T08:30:00Z",
  "status": "ASSIGNED"
}
```

### 4.6 Get Tickets by Location (Geospatial)

```http
GET /rest/v1/tickets?and=(latitude.gte.27.9,latitude.lte.28.0,longitude.gte.-82.5,longitude.lte.-82.4)
Authorization: Bearer <token>
```

---

## 5. TIME TRACKING

### 5.1 Clock In

```http
POST /rest/v1/time_entries
Authorization: Bearer <token>
Content-Type: application/json

{
  "subcontractor_id": "660e8400-e29b-41d4-a716-446655440001",
  "ticket_id": "770e8400-e29b-41d4-a716-446655440002",
  "clock_in_at": "2026-02-04T09:15:00Z",
  "clock_in_latitude": 27.9506,
  "clock_in_longitude": -82.4572,
  "clock_in_accuracy": 45.2,
  "clock_in_photo_url": "https://storage.../clockin_123.jpg",
  "work_type": "STANDARD_ASSESSMENT",
  "work_type_rate": 75.00
}
```

**Response:**
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440003",
  "subcontractor_id": "660e8400-e29b-41d4-a716-446655440001",
  "ticket_id": "770e8400-e29b-41d4-a716-446655440002",
  "clock_in_at": "2026-02-04T09:15:00Z",
  "work_type": "STANDARD_ASSESSMENT",
  "work_type_rate": 75.00,
  "status": "PENDING",
  "created_at": "2026-02-04T09:15:05Z"
}
```

### 5.2 Clock Out

```http
PATCH /rest/v1/time_entries?id=eq.<time_entry_id>
Authorization: Bearer <token>
Content-Type: application/json

{
  "clock_out_at": "2026-02-04T13:45:00Z",
  "clock_out_latitude": 27.9506,
  "clock_out_longitude": -82.4572,
  "clock_out_accuracy": 38.5,
  "clock_out_photo_url": "https://storage.../clockout_123.jpg",
  "break_minutes": 30
}
```

### 5.3 List Time Entries

```http
GET /rest/v1/time_entries?select=*,tickets(ticket_number)&order=clock_in_at.desc
Authorization: Bearer <token>
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `subcontractor_id` | uuid | Filter by subcontractor |
| `ticket_id` | uuid | Filter by ticket |
| `status` | string | Filter by status |
| `clock_in_at.gte` | timestamp | Start date range |
| `clock_in_at.lte` | timestamp | End date range |

### 5.4 Approve Time Entry (Admin)

```http
PATCH /rest/v1/time_entries?id=eq.<time_entry_id>
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "status": "APPROVED",
  "reviewed_by": "admin-user-id",
  "reviewed_at": "2026-02-04T15:00:00Z"
}
```

### 5.5 Reject Time Entry (Admin)

```http
PATCH /rest/v1/time_entries?id=eq.<time_entry_id>
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "status": "REJECTED",
  "reviewed_by": "admin-user-id",
  "reviewed_at": "2026-02-04T15:00:00Z",
  "rejection_reason": "GPS location does not match ticket site"
}
```

### 5.6 Get Current Active Time Entry

```http
GET /rest/v1/time_entries?subcontractor_id=eq.<id>&clock_out_at=is.null&order=clock_in_at.desc&limit=1
Authorization: Bearer <token>
```

---

## 6. EXPENSES

### 6.1 Create Expense Report

```http
POST /rest/v1/expense_reports
Authorization: Bearer <token>
Content-Type: application/json

{
  "subcontractor_id": "660e8400-e29b-41d4-a716-446655440001",
  "report_period_start": "2026-02-01",
  "report_period_end": "2026-02-29"
}
```

### 6.2 Add Expense Item

```http
POST /rest/v1/expense_items
Authorization: Bearer <token>
Content-Type: application/json

{
  "expense_report_id": "990e8400-e29b-41d4-a716-446655440004",
  "category": "MILEAGE",
  "description": "Travel to assessment site",
  "amount": 24.24,
  "expense_date": "2026-02-04",
  "mileage_start": 45230,
  "mileage_end": 45267,
  "mileage_rate": 0.655,
  "from_location": "Home Office",
  "to_location": "1234 Main St, Tampa",
  "ticket_id": "770e8400-e29b-41d4-a716-446655440002",
  "billable_to_client": true
}
```

### 6.3 Upload Receipt

```http
POST /storage/v1/object/receipts/<subcontractor_id>/<expense_item_id>_<filename>
Authorization: Bearer <token>
Content-Type: image/jpeg

<binary image data>
```

### 6.4 List Expense Reports

```http
GET /rest/v1/expense_reports?select=*,expense_items(*)&order=created_at.desc
Authorization: Bearer <token>
```

### 6.5 Submit Expense Report

```http
PATCH /rest/v1/expense_reports?id=eq.<report_id>
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "SUBMITTED",
  "submitted_at": "2026-02-05T10:00:00Z"
}
```

### 6.6 Approve Expense Report (Admin)

```http
PATCH /rest/v1/expense_reports?id=eq.<report_id>
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "status": "APPROVED",
  "reviewed_by": "admin-user-id",
  "reviewed_at": "2026-02-06T09:00:00Z"
}
```

---

## 7. DAMAGE ASSESSMENTS

### 7.1 Create Assessment

```http
POST /rest/v1/damage_assessments
Authorization: Bearer <token>
Content-Type: application/json

{
  "ticket_id": "770e8400-e29b-41d4-a716-446655440002",
  "subcontractor_id": "660e8400-e29b-41d4-a716-446655440001",
  "safety_observations": {
    "downed_conductors": true,
    "damaged_insulators": true,
    "vegetation_contact": false,
    "structural_damage": true,
    "fire_hazard": false,
    "public_accessible": false,
    "safe_distance_maintained": true
  },
  "damage_cause": "VEHICLE_COLLISION",
  "weather_conditions": "Clear, 72°F",
  "estimated_repair_hours": 8,
  "priority": "A",
  "immediate_actions": "Area secured, traffic diverted, utility notified",
  "repair_vs_replace": "REPLACE",
  "estimated_repair_cost": 15000.00,
  "assessed_by": "550e8400-e29b-41d4-a716-446655440000",
  "assessed_at": "2026-02-04T12:00:00Z",
  "digital_signature": "<encrypted_signature_data>"
}
```

### 7.2 Add Equipment Assessment

```http
POST /rest/v1/equipment_assessments
Authorization: Bearer <token>
Content-Type: application/json

{
  "damage_assessment_id": "aa0e8400-e29b-41d4-a716-446655440005",
  "equipment_type_id": "bb0e8400-e29b-41d4-a716-446655440006",
  "equipment_tag": "T-4521",
  "condition": "DESTROYED",
  "damage_description": "Pole sheared at base, transformer detached and damaged",
  "requires_replacement": true,
  "photo_urls": [
    "https://storage.../equip1_1.jpg",
    "https://storage.../equip1_2.jpg"
  ]
}
```

### 7.3 Get Assessment with Details

```http
GET /rest/v1/damage_assessments?ticket_id=eq.<ticket_id>&select=*,equipment_assessments(*,equipment_types(*)),media_assets(*)
Authorization: Bearer <token>
```

### 7.4 Review Assessment (Admin)

```http
PATCH /rest/v1/damage_assessments?id=eq.<assessment_id>
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "reviewed_by": "admin-user-id",
  "reviewed_at": "2026-02-04T15:30:00Z",
  "review_notes": "Assessment complete and accurate. Approved for client submission."
}
```

---

## 8. INVOICES

### 8.1 Generate Invoice

```http
POST /functions/v1/generate-invoice
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "subcontractor_id": "660e8400-e29b-41d4-a716-446655440001",
  "billing_period_start": "2026-01-01",
  "billing_period_end": "2026-01-31"
}
```

**Response:**
```json
{
  "invoice_id": "cc0e8400-e29b-41d4-a716-446655440007",
  "invoice_number": "INV-2026-0003",
  "subtotal_time": 3200.00,
  "subtotal_expenses": 850.00,
  "total_amount": 4050.00,
  "time_entries": ["880e8400-e29b-41d4-a716-446655440003"],
  "expense_reports": ["990e8400-e29b-41d4-a716-446655440004"]
}
```

### 8.2 List Invoices

```http
GET /rest/v1/subcontractor_invoices?select=*&order=created_at.desc
Authorization: Bearer <token>
```

### 8.3 Get Invoice Details

```http
GET /rest/v1/subcontractor_invoices?id=eq.<invoice_id>&select=*,invoice_line_items(*)
Authorization: Bearer <token>
```

### 8.4 Mark Invoice as Paid (Admin)

```http
PATCH /rest/v1/subcontractor_invoices?id=eq.<invoice_id>
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "status": "PAID",
  "paid_at": "2026-02-10T10:00:00Z",
  "payment_method": "ACH",
  "payment_reference": "ACH-20260210-001"
}
```

### 8.5 Get Invoice PDF

```http
GET /storage/v1/object/invoices/<invoice_id>.pdf
Authorization: Bearer <token>
```

---

## 9. MEDIA & FILES

### 9.1 Upload File

```http
POST /storage/v1/object/<bucket>/<path>/<filename>
Authorization: Bearer <token>
Content-Type: <mime_type>
x-upsert: true

<binary file data>
```

**Buckets:**
- `photos` — Assessment photos
- `receipts` — Expense receipts
- `credentials` — Insurance/license documents
- `signatures` — Digital signatures
- `invoices` — Generated PDF invoices

### 9.2 Get Public URL

```http
GET /storage/v1/object/public/<bucket>/<path>/<filename>
```

### 9.3 Create Signed URL (Private Files)

```http
POST /storage/v1/object/sign/<bucket>/<path>/<filename>
Authorization: Bearer <token>
Content-Type: application/json

{
  "expiresIn": 3600
}
```

### 9.4 Delete File

```http
DELETE /storage/v1/object/<bucket>/<path>/<filename>
Authorization: Bearer <token>
```

### 9.5 Record Media Asset

```http
POST /rest/v1/media_assets
Authorization: Bearer <token>
Content-Type: application/json

{
  "uploaded_by": "550e8400-e29b-41d4-a716-446655440000",
  "subcontractor_id": "660e8400-e29b-41d4-a716-446655440001",
  "file_name": "assessment_photo_1.jpg",
  "original_name": "IMG_20260204_120000.jpg",
  "file_type": "PHOTO",
  "mime_type": "image/jpeg",
  "file_size_bytes": 2457600,
  "storage_bucket": "photos",
  "storage_path": "2026/02/04/assessment_photo_1.jpg",
  "public_url": "https://storage.../photos/2026/02/04/assessment_photo_1.jpg",
  "checksum_sha256": "a3f5c8e9d2b1...",
  "entity_type": "ASSESSMENT",
  "entity_id": "aa0e8400-e29b-41d4-a716-446655440005",
  "exif_data": {
    "captured_at": "2026-02-04T12:00:00Z",
    "gps_latitude": 27.9506,
    "gps_longitude": -82.4572
  }
}
```

---

## 10. REAL-TIME SUBSCRIPTIONS

### 10.1 Subscribe to Ticket Updates

```javascript
// Using Supabase Realtime
const subscription = supabase
  .channel('ticket_updates')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'tickets',
      filter: `assigned_to=eq.${subcontractorId}`
    },
    (payload) => {
      console.log('Ticket update:', payload);
    }
  )
  .subscribe();
```

### 10.2 Subscribe to Status Changes

```javascript
const subscription = supabase
  .channel('status_changes')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'ticket_status_history'
    },
    (payload) => {
      console.log('Status change:', payload);
    }
  )
  .subscribe();
```

### 10.3 Subscribe to Notifications

```javascript
const subscription = supabase
  .channel('user_notifications')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'notification_logs',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      console.log('New notification:', payload);
    }
  )
  .subscribe();
```

---

## 11. ERROR HANDLING

### 11.1 Error Response Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": "Additional context or field-specific errors"
  }
}
```

### 11.2 HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists |
| 422 | Unprocessable | Validation failed |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Internal server error |

### 11.3 Common Error Codes

| Code | Description |
|------|-------------|
| `INVALID_CREDENTIALS` | Email or password incorrect |
| `TOKEN_EXPIRED` | JWT token has expired |
| `INSUFFICIENT_PERMISSIONS` | User lacks required role |
| `RESOURCE_NOT_FOUND` | Requested resource doesn't exist |
| `VALIDATION_ERROR` | Request data failed validation |
| `GPS_VALIDATION_FAILED` | GPS coordinates outside geofence |
| `ALREADY_CLOCKED_IN` | User already has active time entry |
| `INVOICE_ALREADY_GENERATED` | Invoice exists for period |
| `RATE_LIMIT_EXCEEDED` | Too many requests |

### 11.4 Validation Error Example

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "email": ["Email is required", "Invalid email format"],
      "password": ["Password must be at least 12 characters"]
    }
  }
}
```

---

## 12. RATE LIMITING

| Endpoint Group | Limit | Window |
|----------------|-------|--------|
| Authentication | 5 requests | 1 minute |
| General API | 100 requests | 1 minute |
| File Uploads | 10 requests | 1 minute |
| Real-time | 100 connections | - |

---

**END OF API SPECIFICATIONS**
