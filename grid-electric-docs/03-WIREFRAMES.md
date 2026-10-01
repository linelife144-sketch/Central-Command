# Central Command — WIREFRAME SPECIFICATIONS

## Complete Screen Designs & User Flows

**Version:** 1.0  
**Date:** February 4, 2026  
**Platform:** Progressive Web App (PWA)

---

## TABLE OF CONTENTS

1. [Design Principles](#1-design-principles)
2. [Screen Inventory](#2-screen-inventory)
3. [Authentication Flows](#3-authentication-flows)
4. [Onboarding Flows](#4-onboarding-flows)
5. [Admin Portal Screens](#5-admin-portal-screens)
6. [Contractor Portal Screens](#6-contractor-portal-screens)
7. [Shared Components](#7-shared-components)
8. [Mobile-First Specifications](#8-mobile-first-specifications)

---

## 1. DESIGN PRINCIPLES

### 1.1 Mobile-First Approach

- All screens designed for 375px width (iPhone SE) as baseline
- Responsive scaling to tablet (768px) and desktop (1440px)
- Touch targets minimum 44×44px
- Bottom navigation for primary actions on mobile

### 1.2 Accessibility Standards

- WCAG 2.1 AA compliance
- Color contrast ratio 4.5:1 minimum
- Screen reader support with ARIA labels
- Keyboard navigation support

### 1.3 Offline-First UX

- Optimistic UI updates
- Clear sync status indicators
- Queue management visibility
- Conflict resolution interfaces

---

## 2. SCREEN INVENTORY

### 2.1 Authentication Screens (6)

| # | Screen | Purpose | Primary User |
|---|--------|---------|--------------|
| A1 | Login | Email/password entry | All |
| A2 | Forgot Password | Password reset flow | All |
| A3 | Reset Password | New password entry | All |
| A4 | Magic Link | Passwordless login option | All |
| A5 | Role Selection | Post-login role selection | Multi-role users |
| A6 | Session Expired | Re-authentication prompt | All |

### 2.2 Onboarding Screens (12)

| # | Screen | Purpose | Primary User |
|---|--------|---------|--------------|
| O1 | Welcome | Platform introduction | New Contractors |
| O2 | Personal Info | Identity collection | New Contractors |
| O3 | Business Info | 1099 entity setup | New Contractors |
| O4 | Insurance Upload | Coverage verification | New Contractors |
| O5 | Credentials | License/certification | New Contractors |
| O6 | Banking Setup | Payment information | New Contractors |
| O7 | Rate Agreement | Compensation terms | New Contractors |
| O8 | Agreements | Legal document signing | New Contractors |
| O9 | Safety Training | Video completion | New Contractors |
| O10 | Profile Photo | Identity verification | New Contractors |
| O11 | Review & Submit | Final confirmation | New Contractors |
| O12 | Pending Approval | Awaiting admin review | New Contractors |

### 2.3 Admin Portal Screens (18)

| # | Screen | Purpose | Primary User |
|---|--------|---------|--------------|
| AD1 | Admin Dashboard | Overview & metrics | Operations Manager |
| AD2 | Contractor List | Manage workforce | Operations Manager |
| AD3 | Contractor Detail | Individual profile view | Operations Manager |
| AD4 | Contractor Approval | Review onboarding | Operations Manager |
| AD5 | Ticket List | All tickets view | Operations Manager |
| AD6 | Ticket Detail | Individual ticket view | Operations Manager |
| AD7 | Ticket Create | New ticket creation | Operations Manager |
| AD8 | Ticket Assignment | Assign to contractor | Operations Manager |
| AD9 | Route Optimization | Multi-ticket routing | Operations Manager |
| AD10 | Time Review | Approve/reject time entries | Operations Manager |
| AD11 | Expense Review | Approve/reject expenses | Operations Manager |
| AD12 | Assessment Review | Review damage assessments | Operations Manager |
| AD13 | Invoice Generation | Create contractor invoices | Operations Manager |
| AD14 | Invoice List | View all invoices | Operations Manager |
| AD15 | Reports Dashboard | Analytics & reporting | Operations Manager |
| AD16 | Map View | Geographic ticket view | Operations Manager |
| AD17 | Settings | Platform configuration | Super Admin |
| AD18 | Audit Logs | Compliance tracking | Super Admin |

### 2.4 Contractor Portal Screens (16)

| # | Screen | Purpose | Primary User |
|---|--------|---------|--------------|
| SC1 | Sub Dashboard | Today's work overview | Contractor |
| SC2 | Ticket List | My assigned tickets | Contractor |
| SC3 | Ticket Detail | Individual ticket view | Contractor |
| SC4 | Clock In/Out | Time tracking interface | Contractor |
| SC5 | Route Map | Navigation to site | Contractor |
| SC6 | Photo Capture | Assessment photography | Contractor |
| SC7 | Damage Assessment Form | Equipment evaluation | Contractor |
| SC8 | Safety Checklist | Pre-work verification | Contractor |
| SC9 | Expense List | My expense reports | Contractor |
| SC10 | Expense Create | New expense entry | Contractor |
| SC11 | Receipt Capture | Photo upload for expenses | Contractor |
| SC12 | Time History | Past time entries | Contractor |
| SC13 | Invoice List | My invoices | Contractor |
| SC14 | Invoice Detail | Individual invoice view | Contractor |
| SC15 | Profile | My information | Contractor |
| SC16 | Sync Status | Offline queue management | Contractor |

**Total Screens: 52**

---

## 3. AUTHENTICATION FLOWS

### 3.1 Login Screen (A1)

```
┌─────────────────────────────────────────┐
│                                         │
│           [GRID ELECTRIC]               │
│              [LOGO]                     │
│                                         │
│         DAMAGE ASSESSMENT               │
│            PLATFORM                     │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  Email Address                  │    │
│  │  contractor@example.com         │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  Password                       │    │
│  │  ••••••••••••••                 │    │
│  │  [👁]                           │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [ ] Remember me                        │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │         SIGN IN                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Forgot Password?                       │
│                                         │
│  ──────────── OR ────────────           │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │    Sign in with Magic Link      │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Don't have an account?                 │
│  Contact your administrator             │
│                                         │
└─────────────────────────────────────────┘
```

**Specifications:**

- Logo: 120×120px, centered
- Input fields: 56px height, 16px font
- Primary button: Full width, 56px height
- Background: Gradient from navy to dark blue

### 3.2 Forgot Password (A2)

```
┌─────────────────────────────────────────┐
│                                         │
│           [GRID ELECTRIC]               │
│                                         │
│         Reset Your Password             │
│                                         │
│  Enter your email address and we'll     │
│  send you a link to reset your          │
│  password.                              │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  Email Address                  │    │
│  │  contractor@example.com         │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │      SEND RESET LINK            │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Back to Sign In                        │
│                                         │
└─────────────────────────────────────────┘
```

### 3.3 Magic Link Sent (A4)

```
┌─────────────────────────────────────────┐
│                                         │
│           [GRID ELECTRIC]               │
│                                         │
│         ✉️ Check Your Email             │
│                                         │
│  We've sent a magic link to:            │
│  contractor@example.com                 │
│                                         │
│  Click the link in your email to        │
│  sign in instantly.                     │
│                                         │
│  Didn't receive it?                     │
│  [Resend Link]                          │
│                                         │
│  Back to Sign In                        │
│                                         │
└─────────────────────────────────────────┘
```

---

## 4. ONBOARDING FLOWS

### 4.1 Welcome Screen (O1)

```
┌─────────────────────────────────────────┐
│                                         │
│           [GRID ELECTRIC]               │
│                                         │
│      Welcome to the Team!               │
│                                         │
│  [Illustration: Workers in field]       │
│                                         │
│  Complete your profile to start         │
│  receiving damage assessment            │
│  assignments.                           │
│                                         │
│  What you'll need:                      │
│  ✓ Personal identification              │
│  ✓ Business/Tax information             │
│  ✓ Insurance documents                  │
│  ✓ Bank account for payments            │
│                                         │
│  Time: ~15 minutes                      │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │      GET STARTED →              │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [Progress: 0 of 11]                    │
│  ○○○○○○○○○○○                            │
│                                         │
└─────────────────────────────────────────┘
```

### 4.2 Personal Info (O2)

```
┌─────────────────────────────────────────┐
│  ← Back                    Save Draft   │
│                                         │
│  Personal Information                   │
│  Step 1 of 11                           │
│                                         │
│  Let's verify your identity             │
│                                         │
│  First Name *                           │
│  ┌─────────────────────────────────┐    │
│  │ John                            │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Last Name *                            │
│  ┌─────────────────────────────────┐    │
│  │ Smith                           │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Date of Birth *                        │
│  ┌─────────────────────────────────┐    │
│  │ MM/DD/YYYY                      │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Social Security Number *               │
│  ┌─────────────────────────────────┐    │
│  │ •••-••-••••                     │    │
│  └─────────────────────────────────┘    │
│  Encrypted and secure                   │
│                                         │
│  Phone Number *                         │
│  ┌─────────────────────────────────┐    │
│  │ (555) 123-4567                  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │      CONTINUE →                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [Progress: 1 of 11]                    │
│  ●○○○○○○○○○○                            │
│                                         │
└─────────────────────────────────────────┘
```

### 4.3 Business Info (O3)

```
┌─────────────────────────────────────────┐
│  ← Back                    Save Draft   │
│                                         │
│  Business Information                   │
│  Step 2 of 11                           │
│                                         │
│  How should we pay you?                 │
│                                         │
│  Business Structure *                   │
│  ┌─────────────────────────────────┐    │
│  │ ▼ Select...                     │    │
│  │   Sole Proprietorship           │    │
│  │   LLC                           │    │
│  │   S Corporation                 │    │
│  │   C Corporation                 │    │
│  │   Partnership                   │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Business Name (if applicable)          │
│  ┌─────────────────────────────────┐    │
│  │ Smith Electrical Services LLC   │    │
│  └─────────────────────────────────┘    │
│                                         │
│  EIN or SSN for 1099 *                  │
│  ┌─────────────────────────────────┐    │
│  │ ••-•••••••                      │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Business Address *                     │
│  ┌─────────────────────────────────┐    │
│  │ Street Address                  │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ Apt, Suite, etc. (optional)     │    │
│  └─────────────────────────────────┘    │
│  ┌──────────────┐ ┌────────────────┐    │
│  │ City         │ │ State ▼        │    │
│  └──────────────┘ └────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ ZIP Code                        │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │      CONTINUE →                 │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

### 4.4 Insurance Upload (O4)

```
┌─────────────────────────────────────────┐
│  ← Back                    Save Draft   │
│                                         │
│  Insurance Coverage                     │
│  Step 3 of 11                           │
│                                         │
│  Upload your current insurance          │
│  certificates                           │
│                                         │
│  General Liability *                    │
│  ┌─────────────────────────────────┐    │
│  │ [📄] GL_Certificate.pdf         │    │
│  │ Coverage: $1,000,000           │    │
│  │ Expires: 12/31/2026            │    │
│  │ [Change] [View]                 │    │
│  └─────────────────────────────────┘    │
│  OR                                     │
│  ┌─────────────────────────────────┐    │
│  │    + Upload Document            │    │
│  │    Take photo or choose file    │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Workers Compensation *                 │
│  ┌─────────────────────────────────┐    │
│  │    + Upload Document            │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Auto Insurance *                       │
│  ┌─────────────────────────────────┐    │
│  │    + Upload Document            │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Umbrella (optional)                    │
│  ┌─────────────────────────────────┐    │
│  │    + Upload Document            │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │      CONTINUE →                 │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

### 4.5 Banking Setup (O6)

```
┌─────────────────────────────────────────┐
│  ← Back                    Save Draft   │
│                                         │
│  Payment Information                    │
│  Step 5 of 11                           │
│                                         │
│  Set up direct deposit                  │
│                                         │
│  Account Holder Name *                  │
│  ┌─────────────────────────────────┐    │
│  │ John Smith                      │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Bank Name                              │
│  ┌─────────────────────────────────┐    │
│  │ Chase Bank                      │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Account Type *                         │
│  ○ Checking  ● Savings                  │
│                                         │
│  Routing Number *                       │
│  ┌─────────────────────────────────┐    │
│  │ •••••••••                       │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Account Number *                       │
│  ┌─────────────────────────────────┐    │
│  │ ••••••••••••                    │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Confirm Account Number *               │
│  ┌─────────────────────────────────┐    │
│  │ ••••••••••••                    │    │
│  └─────────────────────────────────┘    │
│                                         │
│  🔒 Your banking information is         │
│     encrypted and secure                │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │      CONTINUE →                 │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

### 4.6 Rate Agreement (O7)

```
┌─────────────────────────────────────────┐
│  ← Back                    Save Draft   │
│                                         │
│  Compensation Rates                     │
│  Step 6 of 11                           │
│                                         │
│  Your agreed hourly rates:              │
│                                         │
│  Standard Assessment                    │
│  ┌─────────────────────────────────┐    │
│  │ $ 75.00 / hour                  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Emergency Response                     │
│  ┌─────────────────────────────────┐    │
│  │ $ 125.00 / hour                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Travel Time                            │
│  ┌─────────────────────────────────┐    │
│  │ $ 37.50 / hour                  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Standby                                │
│  ┌─────────────────────────────────┐    │
│  │ $ 25.00 / hour                  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Training                               │
│  ┌─────────────────────────────────┐    │
│  │ $ 50.00 / hour                  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ─────────────────────────────────      │
│                                         │
│  Expense Reimbursement:                 │
│  • Mileage: $0.655/mile (IRS rate)      │
│  • Meals: Up to $75/day                 │
│  • Lodging: Up to $150/night            │
│                                         │
│  [ ] I agree to these rates             │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │      CONTINUE →                 │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

### 4.7 Agreements - E-Signature (O8)

```
┌─────────────────────────────────────────┐
│  ← Back                    Save Draft   │
│                                         │
│  Independent Contractor                 │
│  Agreement                              │
│  Step 7 of 11                           │
│                                         │
│  Please review and sign:                │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ [Document Preview]              │    │
│  │                                 │    │
│  │ INDEPENDENT CONTRACTOR          │    │
│  │ AGREEMENT                       │    │
│  │                                 │    │
│  │ This agreement establishes...   │    │
│  │                                 │    │
│  │ [View Full Document]            │    │
│  └─────────────────────────────────┘    │
│                                         │
│  By signing, you acknowledge:           │
│  • You are an independent contractor    │
│  • You are responsible for your taxes   │
│  • You carry required insurance         │
│  • You will follow safety protocols     │
│                                         │
│  [ ] I have read and agree to the       │
│    Independent Contractor Agreement     │
│                                         │
│  Digital Signature *                    │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  │  [SIGN HERE]                    │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│  Sign with your finger or mouse         │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │      CONTINUE →                 │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

### 4.8 Safety Training (O9)

```
┌─────────────────────────────────────────┐
│  ← Back                    Save Draft   │
│                                         │
│  Safety Training                        │
│  Step 8 of 11                           │
│                                         │
│  Required: Electrical Safety            │
│  for Damage Assessment                  │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  [VIDEO PLAYER]                 │    │
│  │                                 │    │
│  │  ▶️                             │    │
│  │                                 │    │
│  │  0:00 / 15:30                   │    │
│  │  ━━━━━━●━━━━━━━━━━━━━━━━━       │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Video Topics:                          │
│  ✓ Safe approach distances              │
│  ✓ PPE requirements                     │
│  ✓ Downed conductor protocols           │
│  ✓ Hazard identification                │
│  ✓ Emergency procedures                 │
│                                         │
│  [Transcript] [Download PDF]            │
│                                         │
│  ⚠️ You must watch the entire video     │
│    before continuing                    │
│                                         │
│  Progress: 45% watched                  │
│  ━━━━━━━━●━━━━━━━━━━━━━━━               │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │      CONTINUE →                 │    │
│  │      (disabled until complete)  │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

### 4.9 Profile Photo (O10)

```
┌─────────────────────────────────────────┐
│  ← Back                    Save Draft   │
│                                         │
│  Profile Photo                          │
│  Step 9 of 11                           │
│                                         │
│  Take a clear photo of yourself         │
│  for identification purposes            │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  │    [📷]                         │    │
│  │                                 │    │
│  │    Camera Preview               │    │
│  │                                 │    │
│  │    [CAPTURE]                    │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  OR                                     │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │    Upload from Gallery          │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Requirements:                          │
│  • Face clearly visible                 │
│  • Good lighting                        │
│  • Plain background                     │
│  • No hats or sunglasses                │
│                                         │
│  Preview:                               │
│  ┌────────────┐                         │
│  │ [Photo]    │  [Retake] [Use Photo]   │
│  └────────────┘                         │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │      CONTINUE →                 │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

### 4.10 Review & Submit (O11)

```
┌─────────────────────────────────────────┐
│  ← Back                    Save Draft   │
│                                         │
│  Review Your Information                │
│  Step 10 of 11                          │
│                                         │
│  Please review before submitting:       │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ Personal Information    [Edit]  │    │
│  │ ─────────────────────────────── │    │
│  │ John Smith                      │    │
│  │ DOB: 01/15/1985                 │    │
│  │ SSN: •••-••-••••                │    │
│  │ Phone: (555) 123-4567           │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ Business Information    [Edit]  │    │
│  │ ─────────────────────────────── │    │
│  │ Smith Electrical Services LLC   │    │
│  │ EIN: ••-•••••••                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ Insurance               [Edit]  │    │
│  │ ─────────────────────────────── │    │
│  │ ✓ General Liability             │    │
│  │ ✓ Workers Compensation          │    │
│  │ ✓ Auto Insurance                │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ Banking                 [Edit]  │    │
│  │ ─────────────────────────────── │    │
│  │ Chase Bank ****1234             │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [ ] I confirm all information is       │
│    accurate and complete                │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │      SUBMIT APPLICATION         │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

### 4.11 Pending Approval (O12)

```
┌─────────────────────────────────────────┐
│                                         │
│           [GRID ELECTRIC]               │
│                                         │
│         ⏳ Pending Approval             │
│                                         │
│  Your application has been submitted!   │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  │    [Illustration: Checkmark]    │    │
│  │                                 │    │
│  │    Application Submitted        │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  What happens next:                     │
│                                         │
│  1. Document Review                     │
│     Our team will verify your           │
│     credentials and insurance           │
│     ─────────────────────────           │
│                                         │
│  2. Background Check                    │
│     Standard verification process       │
│     ─────────────────────────           │
│                                         │
│  3. Approval Notification               │
│     You'll receive an email when        │
│     approved                            │
│     ─────────────────────────           │
│                                         │
│  Estimated time: 2-3 business days      │
│                                         │
│  Questions? Contact:                    │
│  onboarding@gridelectric.com            │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │      CHECK STATUS               │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [Sign Out]                             │
│                                         │
└─────────────────────────────────────────┘
```

---

## 5. ADMIN PORTAL SCREENS

### 5.1 Admin Dashboard (AD1)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Central Command                                    John | Admin ▼  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DASHBOARD                                              [Refresh] [Export]  │
│                                                                             │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌───────────┐  │
│  │ ACTIVE TICKETS  │ │ FIELD CREWS     │ │ PENDING REVIEWS │ │  REVENUE  │  │
│  │                 │ │                 │ │                 │ │   (MTD)   │  │
│  │     47          │ │      12         │ │      23         │ │  $284,500 │  │
│  │ ↑ 12% vs last wk│ │ 8 on site       │ │ 15 time, 8 exp  │ │ ↑ 8%      │  │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘ └───────────┘  │
│                                                                             │
│  TODAY'S ACTIVITY                              QUICK ACTIONS                │
│  ┌─────────────────────────────────────────┐   ┌─────────────────────────┐  │
│  │ [Map: Ticket locations with status]     │   │ [+ Create Ticket]       │  │
│  │                                         │   │ [+ Assign Route]        │  │
│  │  🔵 In Route (5)                        │   │ [⚡ Emergency Dispatch]  │  │
│  │  🟢 On Site (8)                         │   │ [📋 Review Timesheets]  │  │
│  │  🟡 Pending Review (12)                 │   │ [💰 Generate Invoices]  │  │
│  │  ⚪ Unassigned (22)                     │   │                         │  │
│  │                                         │   │                         │  │
│  │ [View Full Map]                         │   │                         │  │
│  └─────────────────────────────────────────┘   └─────────────────────────┘  │
│                                                                             │
│  RECENT TICKETS                              ALERTS                         │
│  ┌─────────────────────────────────────────┐   ┌─────────────────────────┐  │
│  │ Ticket #     Status    Assigned    Due  │   │ ⚠️ 3 Insurance Expiring │  │
│  │ ─────────────────────────────────────── │   │    View →               │  │
│  │ GES-260201  On Site   J. Smith    2pm   │   │                         │  │
│  │ GES-260202  In Route  M. Johnson  3pm   │   │ 🔴 1 Credential Expired │  │
│  │ GES-260203  Pending   A. Davis    4pm   │   │    View →               │  │
│  │ GES-260204  Unassigned     -      5pm   │   │                         │  │
│  │ GES-260205  Complete  R. Wilson   -     │   │ 📊 5 Timesheets Pending │  │
│  │                                         │   │    Review →             │  │
│  │ [View All 47 Tickets]                   │   │                         │  │
│  └─────────────────────────────────────────┘   └─────────────────────────┘  │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  [🏠] Dashboard  [🎫] Tickets  [👷] Crews  [📊] Reports  [⚙️] Settings     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Ticket List (AD5)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Central Command                                    John | Admin ▼  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TICKETS                                          [+ New Ticket] [Export]   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ 🔍 Search tickets...  [Status ▼] [Priority ▼] [Date ▼] [Assignee ▼] │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ □  Ticket #      Location              Status      Assigned    Due  │    │
│  │ ─────────────────────────────────────────────────────────────────── │    │
│  │ □  GES-260245   1234 Main St, Tampa    🔵 In Route  J. Smith   2:00 │    │
│  │ □  GES-260244   5678 Oak Ave, Orlando  🟢 On Site   M. Johnson 2:30 │    │
│  │ □  GES-260243   9012 Pine Rd, Miami    🟡 Pending   A. Davis   3:00 │    │
│  │ □  GES-260242   3456 Elm St, Tampa     ⚪ Unassigned    -      4:00 │    │
│  │ □  GES-260241   7890 Maple Dr, Jax     ✅ Complete  R. Wilson   -   │    │
│  │ □  GES-260240   2468 Cedar Ln, Tampa   🔵 In Route  T. Brown   5:00 │    │
│  │ □  GES-260239   1357 Birch Way, Orl    🟢 On Site   K. Lee    5:30 │    │
│  │ □  GES-260238   8642 Spruce St, Miami  ⚪ Unassigned    -      6:00 │    │
│  │                                                                     │    │
│  │ [Previous] Page 1 of 6 [Next]        Showing 1-8 of 47 tickets      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  SELECTED ACTIONS: [Assign] [Batch Update] [Export] [Delete]                │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  [🏠] Dashboard  [🎫] Tickets  [👷] Crews  [📊] Reports  [⚙️] Settings     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Ticket Detail (AD6)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Central Command                                    John | Admin ▼  │
├─────────────────────────────────────────────────────────────────────────────┤
│  ← Back to Tickets                              [Edit] [Reassign] [Close]   │
│                                                                             │
│  GES-260245                                    Status: 🔵 IN ROUTE          │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────────┐   │
│  │ LOCATION                    │  │ ASSIGNMENT                          │   │
│  │ ─────────────────────────── │  │ ─────────────────────────────────── │   │
│  │ 1234 Main Street            │  │ Assigned to: John Smith             │   │
│  │ Tampa, FL 33601             │  │ Phone: (555) 123-4567               │   │
│  │                             │  │                                     │   │
│  │ [View on Map]               │  │ Assigned: Today 8:30 AM             │   │
│  │                             │  │ By: Operations Manager              │   │
│  │ Coordinates:                │  │                                     │   │
│  │ 27.9506° N, 82.4572° W      │  │ [Reassign] [Contact]                │   │
│  │                             │  │                                     │   │
│  │ Client: Duke Energy         │  │                                     │   │
│  │ WO #: DUKE-2026-8842        │  │                                     │   │
│  └─────────────────────────────┘  └─────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────────┐   │
│  │ WORK DETAILS                │  │ TIMELINE                            │   │
│  │ ─────────────────────────── │  │ ─────────────────────────────────── │   │
│  │ Priority: A - Critical      │  │ 8:30 AM - Assigned                  │   │
│  │                             │  │ 9:15 AM - In Route (GPS confirmed)  │   │
│  │ Description:                │  │ 9:45 AM - ETA on site               │   │
│  │ Downed primary conductor    │  │                                     │   │
│  │ due to vehicle collision.   │  │                                     │   │
│  │ Pole #T-4521 damaged.       │  │                                     │   │
│  │                             │  │                                     │   │
│  │ Special Instructions:       │  │                                     │   │
│  │ Coordinate with Tampa Fire  │  │                                     │   │
│  │ Dept on scene.              │  │                                     │   │
│  │                             │  │                                     │   │
│  │ Scheduled: Today 10:00 AM   │  │                                     │   │
│  │ Due: Today 2:00 PM          │  │                                     │   │
│  └─────────────────────────────┘  └─────────────────────────────────────┘   │
│                                                                             │
│  ASSESSMENT (Pending)                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Assessment will appear here once submitted by field crew            │    │
│  │                                                                     │    │
│  │ [No assessment data available]                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  [🏠] Dashboard  [🎫] Tickets  [👷] Crews  [📊] Reports  [⚙️] Settings     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.4 Ticket Create (AD7)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Central Command                                    John | Admin ▼  │
├─────────────────────────────────────────────────────────────────────────────┤
│  ← Cancel                                                        [Create]   │
│                                                                             │
│  CREATE NEW TICKET                                                          │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  CLIENT INFORMATION                                                         │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────────┐   │
│  │ Utility Client *            │  │ Work Order Reference                │   │
│  │ ┌─────────────────────────┐ │  │ ┌─────────────────────────────────┐ │   │
│  │ │ ▼ Select Client...      │ │  │ │                                 │ │   │
│  │ │ Duke Energy             │ │  │ │                                 │ │   │
│  │ │ Florida Power & Light   │ │  │ └─────────────────────────────────┘ │   │
│  │ │ TECO                    │ │  │                                     │   │
│  │ └─────────────────────────┘ │  │                                     │   │
│  └─────────────────────────────┘  └─────────────────────────────────────┘   │
│                                                                             │
│  LOCATION *                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ 🔍 Search address or click on map...                                │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ [Interactive Map - Click to set location]                           │    │
│  │                                                                     │    │
│  │                    [📍]                                             │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│  1234 Main Street, Tampa, FL 33601                                          │
│  27.9506° N, 82.4572° W                                                     │
│                                                                             │
│  WORK DETAILS                                                               │
│  Priority *          Scheduled Date *        Due Date *                     │
│  ┌──────────────┐    ┌──────────────┐        ┌──────────────┐               │
│  │ ▼ A - Critical│    │ 02/04/2026   │        │ 02/04/2026   │               │
│  │ B - Urgent    │    │              │        │              │               │
│  │ C - Standard  │    │              │        │              │               │
│  │ X - Hold      │    │              │        │              │               │
│  └──────────────┘    └──────────────┘        └──────────────┘               │
│                                                                             │
│  Description *                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  Special Instructions                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  [+ Create Ticket]                                    [Save as Draft]       │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  [🏠] Dashboard  [🎫] Tickets  [👷] Crews  [📊] Reports  [⚙️] Settings     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.5 Contractor List (AD2)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Central Command                                    John | Admin ▼  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CONTRACTORS                                    [+ Invite] [Export]      │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ 🔍 Search by name...  [Status ▼] [Eligibility ▼] [Insurance ▼]      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  OVERVIEW                                                                   │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────┐   │
│  │ Total      │ │ Active     │ │ Onboarding │ │ Pending    │ │ Expiring │   │
│  │   156      │ │   142      │ │     8      │ │    4       │ │    6     │   │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘ └──────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Name              Status    Eligible  Tickets  YTD Earnings  Alerts │    │
│  │ ─────────────────────────────────────────────────────────────────── │    │
│  │ John Smith        ● Active   ✓ Yes      12      $45,230       -     │    │
│  │ Maria Johnson     ● Active   ✓ Yes       8      $38,150       -     │    │
│  │ David Chen        ● Active   ✓ Yes      15      $52,400       ⚠️    │    │
│  │ Sarah Williams    🟡 Pending  ✗ No       -           -        -     │    │
│  │ Michael Brown     ● Active   ✓ Yes      10      $41,800       -     │    │
│  │ Lisa Davis        🔴 Expired  ✗ No       -      $12,500       🔴    │    │
│  │ Robert Wilson     ● Active   ✓ Yes       6      $28,900       -     │    │
│  │ Jennifer Lee      🟡 Onboard  ✗ No       -           -        -     │    │
│  │                                                                     │    │
│  │ [Previous] Page 1 of 20 [Next]     Showing 1-8 of 156               │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  [🏠] Dashboard  [🎫] Tickets  [👷] Crews  [📊] Reports  [⚙️] Settings     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.6 Time Review (AD10)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Central Command                                    John | Admin ▼  │
├─────────────────────────────────────────────────────────────────────────────┤
│  ← Back to Dashboard                                                        │
│                                                                             │
│  TIME ENTRY REVIEW                                                          │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ 🔍 Search...  [Status ▼] [Date Range ▼] [Contractor ▼] [Export]  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  PENDING REVIEW (15)                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ □  Contractor  Ticket      Date        Hours   Type        Amount│    │
│  │ ─────────────────────────────────────────────────────────────────── │    │
│  │ □  John Smith     GES-260245  02/03/2026  4.5h    Standard    $337.50│   │
│  │     [📷 Clock-in] [📍 GPS: 27.95, -82.45]                           │    │
│  │ ─────────────────────────────────────────────────────────────────── │    │
│  │ □  Maria Johnson  GES-260244  02/03/2026  6.0h    Emergency   $750.00│   │
│  │     [📷 Clock-in] [📍 GPS: 28.54, -81.37]                           │    │
│  │ ─────────────────────────────────────────────────────────────────── │    │
│  │ □  David Chen     GES-260241  02/03/2026  2.0h    Travel      $75.00 │   │
│  │     [📷 Clock-in] [📍 GPS: 27.95, -82.45]                           │    │
│  │ ─────────────────────────────────────────────────────────────────── │    │
│  │ □  John Smith     GES-260238  02/02/2026  8.0h    Standard    $600.00│   │
│  │     [📷 Clock-in] [📍 GPS: 25.76, -80.19]                           │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  BATCH ACTIONS: [Approve Selected] [Reject Selected] [Request Info]         │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  RECENTLY APPROVED                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Contractor  Ticket      Date        Hours   Type        Amount   │    │
│  │ ─────────────────────────────────────────────────────────────────── │    │
│  │ Robert Wilson  GES-260230  02/01/2026  5.5h    Standard    $412.50  │    │
│  │ Lisa Davis     GES-260228  02/01/2026  3.0h    Emergency   $375.00  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  [🏠] Dashboard  [🎫] Tickets  [👷] Crews  [📊] Reports  [⚙️] Settings     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.7 Invoice Generation (AD13)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Central Command                                    John | Admin ▼  │
├─────────────────────────────────────────────────────────────────────────────┤
│  ← Back to Invoices                                                         │
│                                                                             │
│  GENERATE INVOICES                                                          │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  BILLING PERIOD                                                             │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────────┐   │
│  │ Start Date *                │  │ End Date *                          │   │
│  │ ┌─────────────────────────┐ │  │ ┌─────────────────────────────────┐ │   │
│  │ │ 01/01/2026              │ │  │ │ 01/31/2026                      │ │   │
│  │ └─────────────────────────┘ │  │ └─────────────────────────────────┘ │   │
│  └─────────────────────────────┘  └─────────────────────────────────────┘   │
│                                                                             │
│  CONTRACTORS TO INVOICE                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ □ Select All                                                        │    │
│  │ ─────────────────────────────────────────────────────────────────── │    │
│  │ □  John Smith                    │  Time: $3,450  │  Exp: $850      │    │
│  │    [View 12 time entries]        │                │  [View 5 expenses]│   │
│  │ ─────────────────────────────────────────────────────────────────── │    │
│  │ □  Maria Johnson                 │  Time: $2,800  │  Exp: $620      │    │
│  │    [View 8 time entries]         │                │  [View 3 expenses]│   │
│  │ ─────────────────────────────────────────────────────────────────── │    │
│  │ □  David Chen                    │  Time: $4,200  │  Exp: $1,100    │    │
│  │    [View 15 time entries]        │                │  [View 7 expenses]│   │
│  │ ─────────────────────────────────────────────────────────────────── │    │
│  │ □  Robert Wilson                 │  Time: $1,950  │  Exp: $340      │    │
│  │    [View 6 time entries]         │                │  [View 2 expenses]│   │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  SUMMARY                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Contractors Selected: 4                                          │    │
│  │ Total Time Entries: 41                                              │    │
│  │ Total Expense Reports: 17                                           │    │
│  │                                                                     │    │
│  │ Subtotal (Time):                            $12,400.00              │    │
│  │ Subtotal (Expenses):                         $2,910.00              │    │
│  │ ─────────────────────────────────────────────────────────────       │    │
│  │ TOTAL TO BE INVOICED:                       $15,310.00              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  [Preview Invoices]                              [Generate 4 Invoices]      │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  [🏠] Dashboard  [🎫] Tickets  [👷] Crews  [📊] Reports  [⚙️] Settings     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. CONTRACTOR PORTAL SCREENS

### 6.1 Sub Dashboard (SC1) - Mobile

```
┌─────────────────────────┐
│  ≡  Grid Electric    🔔 │
├─────────────────────────┤
│                         │
│  Good morning,          │
│  John! 👋               │
│                         │
│  ┌─────────────────┐    │
│  │ 📅 TUE, FEB 4   │    │
│  │                 │    │
│  │ Today's Status  │    │
│  │                 │    │
│  │  🟢 CLOCKED IN  │    │
│  │     2h 15m      │    │
│  │                 │    │
│  │ [CLOCK OUT]     │    │
│  └─────────────────┘    │
│                         │
│  TODAY'S TICKETS (2)    │
│  ┌─────────────────┐    │
│  │ GES-260245      │    │
│  │ 🔵 In Route     │    │
│  │ 1234 Main St    │    │
│  │ Tampa, FL       │    │
│  │                 │    │
│  │ [Update Status] │    │
│  └─────────────────┘    │
│                         │
│  ┌─────────────────┐    │
│  │ GES-260240      │    │
│  │ ⚪ Assigned     │    │
│  │ 2468 Cedar Ln   │    │
│  │ Tampa, FL       │    │
│  │                 │    │
│  │ [Start Route]   │    │
│  └─────────────────┘    │
│                         │
│  QUICK ACTIONS          │
│  ┌────┐ ┌────┐ ┌────┐   │
│  │ 🎫 │ │ ⏱️ │ │ 💰 │   │
│  │View│ │Time│ │Exp │   │
│  │Tix │ │Hist│ │ense│   │
│  └────┘ └────┘ └────┘   │
│                         │
│  THIS WEEK              │
│  ┌─────────────────┐    │
│  │ Earnings: $1,240│    │
│  │ Hours: 18.5     │    │
│  │ Tickets: 5      │    │
│  └─────────────────┘    │
│                         │
├─────────────────────────┤
│  🏠    🎫    ⏱️    💰   │
│ Home  Tix   Time  More  │
└─────────────────────────┘
```

### 6.2 Ticket List (SC2) - Mobile

```
┌─────────────────────────┐
│  ← My Tickets        🔔 │
├─────────────────────────┤
│                         │
│  [Active] [Complete]    │
│                         │
│  TODAY                  │
│  ┌─────────────────┐    │
│  │ GES-260245      │    │
│  │ ─────────────── │    │
│  │ 🔵 In Route     │    │
│  │ Priority: A     │    │
│  │                 │    │
│  │ 1234 Main St    │    │
│  │ Tampa, FL 33601 │    │
│  │                 │    │
│  │ Due: 2:00 PM    │    │
│  │                 │    │
│  │ [View Details →]│    │
│  └─────────────────┘    │
│                         │
│  ┌─────────────────┐    │
│  │ GES-260240      │    │
│  │ ─────────────── │    │
│  │ ⚪ Assigned     │    │
│  │ Priority: B     │    │
│  │                 │    │
│  │ 2468 Cedar Ln   │    │
│  │ Tampa, FL 33602 │    │
│  │                 │    │
│  │ Due: 5:00 PM    │    │
│  │                 │    │
│  │ [Start Route →] │    │
│  └─────────────────┘    │
│                         │
│  TOMORROW               │
│  ┌─────────────────┐    │
│  │ GES-260250      │    │
│  │ ─────────────── │    │
│  │ ⚪ Assigned     │    │
│  │ Priority: C     │    │
│  │                 │    │
│  │ 7890 Maple Dr   │    │
│  │ Orlando, FL     │    │
│  │                 │    │
│  │ Due: 10:00 AM   │    │
│  └─────────────────┘    │
│                         │
├─────────────────────────┤
│  🏠    🎫    ⏱️    💰   │
│ Home  Tix   Time  More  │
└─────────────────────────┘
```

### 6.3 Ticket Detail (SC3) - Mobile

```
┌─────────────────────────┐
│  ← GES-260245        🔔 │
├─────────────────────────┤
│                         │
│  GES-260245             │
│  🔵 IN ROUTE            │
│                         │
│  ┌─────────────────┐    │
│  │ [Map Preview]   │    │
│  │                 │    │
│  │    [📍]         │    │
│  │                 │    │
│  │ [Navigate]      │    │
│  └─────────────────┘    │
│                         │
│  📍 LOCATION            │
│  1234 Main Street       │
│  Tampa, FL 33601        │
│                         │
│  📞 CLIENT CONTACT      │
│  Duke Energy            │
│  WO: DUKE-2026-8842     │
│                         │
│  ⚡ PRIORITY            │
│  A - Critical           │
│                         │
│  📝 DESCRIPTION         │
│  Downed primary         │
│  conductor due to       │
│  vehicle collision.     │
│  Pole #T-4521 damaged.  │
│                         │
│  📋 SPECIAL NOTES       │
│  Coordinate with Tampa  │
│  Fire Dept on scene.    │
│                         │
│  ⏰ TIMELINE            │
│  Assigned: 8:30 AM      │
│  In Route: 9:15 AM      │
│  ETA: 9:45 AM           │
│                         │
│  ─────────────────────  │
│                         │
│  UPDATE STATUS:         │
│  ┌─────────────────┐    │
│  │  🟢 ON SITE     │    │
│  │  (GPS Required) │    │
│  └─────────────────┘    │
│                         │
├─────────────────────────┤
│  🏠    🎫    ⏱️    💰   │
│ Home  Tix   Time  More  │
└─────────────────────────┘
```

### 6.4 Clock In/Out (SC4) - Mobile

```
┌─────────────────────────┐
│  ← Time Tracking       ✕ │
├─────────────────────────┤
│                         │
│  GES-260245             │
│  1234 Main St, Tampa    │
│                         │
│  ┌─────────────────┐    │
│  │                 │    │
│  │   [LARGE CLOCK] │    │
│  │                 │    │
│  │    02:15:32     │    │
│  │                 │    │
│  │   ELAPSED TIME  │    │
│  │                 │    │
│  └─────────────────┘    │
│                         │
│  STATUS: 🟢 CLOCKED IN  │
│  Since: 9:15 AM         │
│                         │
│  📍 GPS LOCATION        │
│  ✓ Verified (45m accuracy)│  │
│  27.9506° N, 82.4572° W │
│                         │
│  📸 CLOCK-IN PHOTO      │
│  ┌─────────────────┐    │
│  │ [Photo thumbnail]│    │
│  │ 9:15:02 AM      │    │
│  └─────────────────┘    │
│                         │
│  WORK TYPE              │
│  ● Standard Assessment  │
│  ○ Emergency Response   │
│  ○ Travel               │
│                         │
│  BREAK TIME             │
│  [+ Add 15 min break]   │
│                         │
│  ─────────────────────  │
│                         │
│  ┌─────────────────┐    │
│  │    🔴 CLOCK OUT │    │
│  │                 │    │
│  │  Photo Required │    │
│  └─────────────────┘    │
│                         │
└─────────────────────────┘
```

### 6.5 Route Map (SC5) - Mobile

```
┌─────────────────────────┐
│  ← Navigation        🔔 │
├─────────────────────────┤
│                         │
│  ┌─────────────────┐    │
│  │                 │    │
│  │   [FULL MAP]    │    │
│  │                 │    │
│  │   [📍] ← You    │    │
│  │   [🏁] ← Dest   │    │
│  │                 │    │
│  │   [Route line]  │    │
│  │                 │    │
│  └─────────────────┘    │
│                         │
│  TO: 1234 Main St       │
│  Tampa, FL 33601        │
│                         │
│  DISTANCE: 12.4 miles   │
│  EST. TIME: 24 minutes  │
│                         │
│  ┌─────────────────┐    │
│  │  [🧭 Navigate]  │    │
│  │  Open in Maps   │    │
│  └─────────────────┘    │
│                         │
│  TICKET INFO            │
│  GES-260245 | Priority A│
│  Due: 2:00 PM           │
│                         │
│  ┌─────────────────┐    │
│  │  🟢 ARRIVED     │    │
│  │  (On Site)      │    │
│  └─────────────────┘    │
│                         │
├─────────────────────────┤
│  🏠    🎫    ⏱️    💰   │
│ Home  Tix   Time  More  │
└─────────────────────────┘
```

### 6.6 Damage Assessment Form (SC7) - Mobile

```
┌─────────────────────────┐
│  ← Assessment        🔔 │
├─────────────────────────┤
│                         │
│  Damage Assessment      │
│  GES-260245             │
│                         │
│  Progress: 2 of 4       │
│  ━━━━━━●━━━━━━━━━━━━    │
│                         │
│  SAFETY OBSERVATIONS    │
│  ─────────────────────  │
│                         │
│  [✓] Safe distance      │
│      maintained (35ft)  │
│                         │
│  Hazards Observed:      │
│  [✓] Downed conductors  │
│  [✓] Damaged insulators │
│  [ ] Vegetation contact │
│  [✓] Structural damage  │
│  [ ] Fire hazard        │
│  [ ] Public accessible  │
│                         │
│  PPE WORN               │
│  [✓] Class E Hard Hat   │
│  [✓] Class 3 Vest       │
│  [✓] Insulated Gloves   │
│                         │
│  ─────────────────────  │
│                         │
│  EQUIPMENT ASSESSMENT   │
│  ─────────────────────  │
│                         │
│  Equipment 1 of 3       │
│                         │
│  Equipment Type *       │
│  ┌─────────────────┐    │
│  │ ▼ Select...     │    │
│  │ Pole-Mounted    │    │
│  │ Transformer     │    │
│  └─────────────────┘    │
│                         │
│  Condition *            │
│  ○ Good  ○ Fair         │
│  ● Damaged  ○ Destroyed │
│                         │
│  Damage Description     │
│  ┌─────────────────┐    │
│  │ Housing cracked │    │
│  │ Oil leaking from│    │
│  │ base            │    │
│  └─────────────────┘    │
│                         │
│  Photos (3 added)       │
│  ┌────┐┌────┐┌────┐┌──┐ │
│  │ 📷 ││ 📷 ││ 📷 ││+ │ │
│  └────┘└────┘└────┘└──┘ │
│                         │
│  [+ Add Equipment]      │
│                         │
│  ┌─────────────────┐    │
│  │  SAVE & CONTINUE│    │
│  └─────────────────┘    │
│                         │
├─────────────────────────┤
│  🏠    🎫    ⏱️    💰   │
│ Home  Tix   Time  More  │
└─────────────────────────┘
```

### 6.7 Photo Capture (SC6) - Mobile

```
┌─────────────────────────┐
│  ✕                 📸 ⚙️│
├─────────────────────────┤
│                         │
│  ┌─────────────────┐    │
│  │                 │    │
│  │                 │    │
│  │   [CAMERA       │    │
│  │    PREVIEW]     │    │
│  │                 │    │
│  │                 │    │
│  │    [Focus box]  │    │
│  │                 │    │
│  │                 │    │
│  └─────────────────┘    │
│                         │
│  PHOTO TYPE             │
│  ┌────┐┌────┐┌────┐┌──┐ │
│  │OVER││EQUIP││DAMG││SAF│ │
│  │VIEW││MENT ││ AGE││ETY│ │
│  └────┘└────┘└────┘└──┘ │
│                         │
│  DESCRIPTION (optional) │
│  ┌─────────────────┐    │
│  │ Enter notes...  │    │
│  └─────────────────┘    │
│                         │
│  GPS: ✓ 45m accuracy    │
│                         │
│  ┌─────────────────┐    │
│  │      [○]        │    │
│  │    CAPTURE      │    │
│  └─────────────────┘    │
│                         │
│  [📁 Gallery]  [⚡ Flash]│
│                         │
└─────────────────────────┘
```

### 6.8 Expense Create (SC10) - Mobile

```
┌─────────────────────────┐
│  ← New Expense         ✕ │
├─────────────────────────┤
│                         │
│  New Expense            │
│                         │
│  CATEGORY *             │
│  ┌─────────────────┐    │
│  │ ▼ Select...     │    │
│  │ Mileage         │    │
│  │ Fuel            │    │
│  │ Lodging         │    │
│  │ Meals           │    │
│  │ ...             │    │
│  └─────────────────┘    │
│                         │
│  ─────────────────────  │
│  MILEAGE SELECTED       │
│                         │
│  Starting Odometer *    │
│  ┌─────────────────┐    │
│  │ 45,230          │    │
│  └─────────────────┘    │
│                         │
│  Ending Odometer *      │
│  ┌─────────────────┐    │
│  │ 45,267          │    │
│  └─────────────────┘    │
│                         │
│  Total Miles: 37        │
│  Rate: $0.655/mile      │
│  Amount: $24.24         │
│                         │
│  From Location          │
│  ┌─────────────────┐    │
│  │ Home office     │    │
│  └─────────────────┘    │
│                         │
│  To Location            │
│  ┌─────────────────┐    │
│  │ 1234 Main St    │    │
│  └─────────────────┘    │
│                         │
│  Related Ticket         │
│  ┌─────────────────┐    │
│  │ GES-260245      │    │
│  └─────────────────┘    │
│                         │
│  [ ] Billable to client │
│                         │
│  ┌─────────────────┐    │
│  │  SAVE EXPENSE   │    │
│  └─────────────────┘    │
│                         │
└─────────────────────────┘
```

### 6.9 Expense List (SC9) - Mobile

```
┌─────────────────────────┐
│  ← Expenses          🔔 │
├─────────────────────────┤
│                         │
│  MY EXPENSES            │
│                         │
│  ┌─────────────────┐    │
│  │ [+ New Expense] │    │
│  └─────────────────┘    │
│                         │
│  THIS MONTH             │
│  Total: $847.50         │
│                         │
│  ┌─────────────────┐    │
│  │ Feb 4, 2026     │    │
│  │ ─────────────── │    │
│  │ 🚗 Mileage      │    │
│  │ 37 miles        │    │
│  │ $24.24          │    │
│  │ ✅ Approved     │    │
│  └─────────────────┘    │
│                         │
│  ┌─────────────────┐    │
│  │ Feb 3, 2026     │    │
│  │ ─────────────── │    │
│  │ ⛽ Fuel          │    │
│  │ Shell Station   │    │
│  │ $58.50          │    │
│  │ ✅ Approved     │    │
│  │ [📷 Receipt]    │    │
│  └─────────────────┘    │
│                         │
│  ┌─────────────────┐    │
│  │ Feb 2, 2026     │    │
│  │ ─────────────── │    │
│  │ 🏨 Lodging      │    │
│  │ Hampton Inn     │    │
│  │ $145.00         │    │
│  │ ⏳ Pending      │    │
│  │ [📷 Receipt]    │    │
│  └─────────────────┘    │
│                         │
│  [View Previous Months] │
│                         │
├─────────────────────────┤
│  🏠    🎫    ⏱️    💰   │
│ Home  Tix   Time  More  │
└─────────────────────────┘
```

### 6.10 Invoice List (SC13) - Mobile

```
┌─────────────────────────┐
│  ← Invoices          🔔 │
├─────────────────────────┤
│                         │
│  MY INVOICES            │
│                         │
│  YEAR-TO-DATE           │
│  ┌─────────────────┐    │
│  │                 │    │
│  │   $12,450.00    │    │
│  │                 │    │
│  │   3 Invoices    │    │
│  │   Paid          │    │
│  │                 │    │
│  └─────────────────┘    │
│                         │
│  INVOICE HISTORY        │
│                         │
│  ┌─────────────────┐    │
│  │ INV-2026-0003   │    │
│  │ ─────────────── │    │
│  │ Jan 1-31, 2026  │    │
│  │ $4,250.00       │    │
│  │ ✅ Paid 02/03   │    │
│  │ [View PDF]      │    │
│  └─────────────────┘    │
│                         │
│  ┌─────────────────┐    │
│  │ INV-2026-0002   │    │
│  │ ─────────────── │    │
│  │ Dec 1-31, 2025  │    │
│  │ $3,800.00       │    │
│  │ ✅ Paid 01/05   │    │
│  │ [View PDF]      │    │
│  └─────────────────┘    │
│                         │
│  ┌─────────────────┐    │
│  │ INV-2026-0001   │    │
│  │ ─────────────── │    │
│  │ Nov 1-30, 2025  │    │
│  │ $4,400.00       │    │
│  │ ✅ Paid 12/05   │    │
│  │ [View PDF]      │    │
│  └─────────────────┘    │
│                         │
│  [View All Invoices]    │
│                         │
├─────────────────────────┤
│  🏠    🎫    ⏱️    💰   │
│ Home  Tix   Time  More  │
└─────────────────────────┘
```

### 6.11 Sync Status (SC16) - Mobile

```
┌─────────────────────────┐
│  ← Sync Status         ✕ │
├─────────────────────────┤
│                         │
│  SYNC STATUS            │
│                         │
│  ┌─────────────────┐    │
│  │                 │    │
│  │    [☁️↔️📱]      │    │
│  │                 │    │
│  │   All Synced!   │    │
│  │                 │    │
│  │ Last sync:      │    │
│  │ Just now        │    │
│  │                 │    │
│  └─────────────────┘    │
│                         │
│  ─────────────────────  │
│                         │
│  SYNC QUEUE (0 pending) │
│                         │
│  Everything is up to    │
│  date.                  │
│                         │
│  ─────────────────────  │
│                         │
│  OFFLINE DATA           │
│                         │
│  Cached Tickets: 5      │
│  Cached Photos: 12      │
│  Cached Maps: 3 areas   │
│                         │
│  [Clear Cache]          │
│                         │
│  ─────────────────────  │
│                         │
│  SYNC SETTINGS          │
│                         │
│  [✓] Auto-sync on WiFi  │
│  [✓] Sync photos        │
│  [ ] Sync on cellular   │
│                         │
│  [Sync Now]             │
│                         │
└─────────────────────────┘
```

---

## 7. SHARED COMPONENTS

### 7.1 Navigation Components

#### Mobile Bottom Navigation

```
┌─────────────────────────┐
│  🏠    🎫    ⏱️    💰   │
│ Home  Tix   Time  More  │
└─────────────────────────┘
```

- Height: 64px
- Background: White with top shadow
- Active state: Primary blue color
- Inactive state: Gray

#### Desktop Sidebar Navigation

```
┌────────┐
│ [LOGO] │
├────────┤
│ 🏠 Dash│
│ 🎫 Tix │
│ 👷 Crew│
│ 📊 Rpts│
│ 💰 Inv │
│ ⚙️ Set │
├────────┤
│ [User] │
└────────┘
```

- Width: 240px
- Background: Navy (#0F172A)
- Text: White

### 7.2 Status Badges

| Status | Badge | Color |
|--------|-------|-------|
| Draft | ⚪ DRAFT | Gray |
| Assigned | ⚪ ASSIGNED | Gray |
| In Route | 🔵 IN ROUTE | Blue |
| On Site | 🟢 ON SITE | Green |
| Complete | ✅ COMPLETE | Green |
| Pending Review | 🟡 PENDING | Yellow |
| Approved | ✅ APPROVED | Green |
| Needs Rework | 🔴 REWORK | Red |
| Expired | 🔴 EXPIRED | Red |

### 7.3 Form Components

#### Input Field

```
Label *
┌─────────────────────────┐
│ Placeholder text        │
└─────────────────────────┘
```

- Height: 56px (mobile), 48px (desktop)
- Border: 1px solid #E2E8F0
- Focus: 2px solid #1E40AF
- Error: 2px solid #DC2626

#### Button Variants

```
┌─────────────────────────┐
│    PRIMARY BUTTON       │  (Filled, dark blue)
└─────────────────────────┘

┌─────────────────────────┐
│    SECONDARY BUTTON     │  (Outlined)
└─────────────────────────┘

┌─────────────────────────┐
│    DANGER BUTTON        │  (Red)
└─────────────────────────┘
```

---

## 8. MOBILE-FIRST SPECIFICATIONS

### 8.1 Breakpoints

| Breakpoint | Width | Target |
|------------|-------|--------|
| xs | 375px | iPhone SE |
| sm | 640px | Large phones |
| md | 768px | Tablets |
| lg | 1024px | Small laptops |
| xl | 1440px | Desktops |

### 8.2 Touch Targets

| Element | Minimum Size |
|---------|-------------|
| Buttons | 44×44px |
| Form inputs | 56px height |
| List items | 64px height |
| Navigation icons | 48×48px |

### 8.3 Typography Scale

| Element | Mobile | Desktop |
|---------|--------|---------|
| H1 | 28px | 36px |
| H2 | 24px | 30px |
| H3 | 20px | 24px |
| Body | 16px | 16px |
| Small | 14px | 14px |
| Caption | 12px | 12px |

---

**END OF WIREFRAME SPECIFICATIONS**
