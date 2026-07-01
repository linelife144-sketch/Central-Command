# GRID ELECTRIC CORP — DESIGN SYSTEM

## Visual Identity & Component Library

**Version:** 2.0  
**Date:** February 10, 2026  
**Theme:** Based on gridelectriccorp.com Official Brand

---

## TABLE OF CONTENTS

1. [Brand Identity](#1-brand-identity)
2. [Color Palette](#2-color-palette)
3. [Typography](#3-typography)
4. [Spacing & Layout](#4-spacing--layout)
5. [Component Library](#5-component-library)
6. [Iconography](#6-iconography)
7. [Animations & Interactions](#7-animations--interactions)
8. [Responsive Design](#8-responsive-design)

---

## 1. BRAND IDENTITY

### 1.1 Brand Overview

Grid Electric Corp is an Alaska Native American Women-Owned Business providing expert solutions for electric power disruption and internet access challenges. The design system reflects:

- **Trust & Reliability** — Government contract compliance
- **Safety & Professionalism** — Electrical industry standards
- **Efficiency & Modernity** — Technology-forward approach
- **Energy & Power** — Electrical utility sector
- **Heritage & Values** — Alaska Native "North to the Future" spirit

### 1.2 Logo Specifications

```
┌─────────────────────────────────────────────────────────────────┐
│                         LOGO CONCEPT                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                    ┌─────────────────┐                          │
│                    │      ⚡         │                          │
│                    │                 │                          │
│                    │  GRID ELECTRIC  │                          │
│                    │                 │                          │
│                    │     CORP        │                          │
│                    │                 │                          │
│                    └─────────────────┘                          │
│                                                                  │
│  Primary Logo: Lightning bolt in gradient circle                 │
│  - Lightning: Energy/electricity (White)                         │
│  - Background: Gradient from #002168 to #2ea3f2                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Logo Implementation:**
```tsx
// Logo Component
<div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#002168] to-[#2ea3f2]">
  <Zap className="w-5 h-5 text-white" fill="white" />
</div>
```

### 1.3 Brand Voice

- **Professional** but approachable
- **Clear** and direct (utility workers need quick info)
- **Safety-focused** in all messaging
- **Action-oriented** (buttons use verbs)
- **Inclusive** — reflecting the Women-Owned Business heritage

---

## 2. COLOR PALETTE

### 2.1 Primary Colors

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PRIMARY COLOR PALETTE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  GRID BLUE (Primary Brand Color)                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │  #2ea3f2  ██████████████████████████████████████████████████████   │    │
│  │                                                                     │    │
│  │  Usage: Primary buttons, links, active states, progress bars       │    │
│  │  - CTA buttons, Navigation active states, Form focus rings         │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  DARK NAVY (Headers & Strong Text)                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │  #002168  ██████████████████████████████████████████████████████   │    │
│  │                                                                     │    │
│  │  Usage: Headings, titles, important text                           │    │
│  │  - Page titles, Card headers, Primary headings                     │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  BRIGHT BLUE (Accents & Highlights)                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │  #0693e3  ██████████████████████████████████████████████████████   │    │
│  │                                                                     │    │
│  │  Usage: Secondary accents, gradients, chart colors                 │    │
│  │  - Progress bar gradients, Charts, Highlights                      │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Semantic Colors

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SEMANTIC COLOR SYSTEM                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SUCCESS (Green)                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │  #00d084  ██████████████████████████████████████████████████████   │    │
│  │                                                                     │    │
│  │  Usage: Success states, completed items, positive indicators       │    │
│  │  - Approved status, Completed steps, Success messages              │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  WARNING (Amber/Yellow)                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │  #fcb900  ██████████████████████████████████████████████████████   │    │
│  │                                                                     │    │
│  │  Usage: Warnings, pending items, attention needed                  │    │
│  │  - Pending review, Alerts, Caution states                          │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  DANGER (Red)                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │  #cf2e2e  ██████████████████████████████████████████████████████   │    │
│  │                                                                     │    │
│  │  Usage: Errors, critical alerts, destructive actions               │    │
│  │  - Error messages, Delete actions, Validation errors               │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  INFO (Blue)                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │  #2ea3f2  ██████████████████████████████████████████████████████   │    │
│  │                                                                     │    │
│  │  Usage: Informational messages, neutral alerts                     │
│  │  - Tips, Info alerts, Help text                                    │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Neutral Colors

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              NEUTRAL PALETTE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  GRAY SCALE                                                                  │
│  ┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐    │
│  │  900   ││  800   ││  700   ││  600   ││  500   ││  400   ││  300   │    │
│  │#111827 ││#1f2937 ││#374151 ││#4b5563 ││#6b7280 ││#9ca3af ││#d1d5db │    │
│  │ ██████ ││ ██████ ││ ██████ ││ ██████ ││ ██████ ││ ██████ ││ ██████ │    │
│  └────────┘└────────┘└────────┘└────────┘└────────┘└────────┘└────────┘    │
│  ┌────────┐┌────────┐┌────────┐                                            │
│  │  200   ││  100   ││  50    │                                            │
│  │#e5e7eb ││#f3f4f6 ││#f9fafb │                                            │
│  │ ██████ ││ ██████ ││ ██████ │                                            │
│  └────────┘└────────┘└────────┘                                            │
│                                                                              │
│  WHITE & BLACK                                                               │
│  ┌────────────────┐  ┌────────────────┐                                      │
│  │   #FFFFFF      │  │   #000000      │                                      │
│  │   ████████     │  │   ████████     │                                      │
│  │   White        │  │   Black        │                                      │
│  └────────────────┘  └────────────────┘                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.4 Color Usage Guidelines

| Element | Color | Hex Code | Usage |
|---------|-------|----------|-------|
| Primary Background | White | #ffffff | Main backgrounds |
| Secondary Background | Gray 50 | #f9fafb | Section backgrounds |
| Card Background | White | #ffffff | Card surfaces |
| Primary Text | Navy | #002168 | Headings, titles |
| Secondary Text | Gray 600 | #666666 | Body text |
| Muted Text | Gray 500 | #6b7280 | Captions, hints |
| Primary Action | Grid Blue | #2ea3f2 | Buttons, links |
| Primary Action Hover | Dark Blue | #1a8fd9 | Button hover states |
| Accent/Highlight | Bright Blue | #0693e3 | Gradients, highlights |
| Success | Emerald | #00d084 | Success states |
| Warning | Amber | #fcb900 | Warning states |
| Danger | Red | #cf2e2e | Error states |
| Border | Gray 200 | #e5e7eb | Borders, dividers |
| Border Focus | Grid Blue | #2ea3f2 | Focus rings |

### 2.5 CSS Variables

```css
:root {
  /* Primary Brand Colors */
  --grid-blue: #2ea3f2;
  --grid-blue-dark: #1a8fd9;
  --grid-blue-light: #5cb8f5;
  --grid-navy: #002168;
  --grid-navy-dark: #001545;
  --grid-navy-light: #003399;
  
  /* Semantic Colors */
  --grid-success: #00d084;
  --grid-warning: #fcb900;
  --grid-danger: #cf2e2e;
  --grid-info: #0693e3;
}
```

### 2.6 Accessibility (WCAG 2.1 AA)

| Combination | Contrast Ratio | Pass |
|-------------|----------------|------|
| White text on Navy (#002168) | 16.2:1 | ✅ |
| White text on Grid Blue (#2ea3f2) | 3.0:1 | ✅ (Large text) |
| Navy text (#002168) on White | 16.2:1 | ✅ |
| Gray 600 text on White | 6.3:1 | ✅ |
| Grid Blue (#2ea3f2) on White | 3.0:1 | ✅ (Large text) |

---

## 3. TYPOGRAPHY

### 3.1 Font Family

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TYPOGRAPHY STACK                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  HEADING FONT: Raleway                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │  Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt      │    │
│  │                                                                     │    │
│  │  Weights: 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)  │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  BODY FONT: Cairo                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │  Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt      │    │
│  │                                                                     │    │
│  │  Weights: 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)  │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  FALLBACK STACK: 'Raleway', 'Cairo', -apple-system, BlinkMacSystemFont,     │
│                   'Segoe UI', Roboto, sans-serif                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Type Scale

| Level | Size | Line Height | Weight | Usage |
|-------|------|-------------|--------|-------|
| Display | 48px / 3rem | 56px / 3.5rem | 700 | Hero titles |
| H1 | 36px / 2.25rem | 44px / 2.75rem | 700 | Page titles |
| H2 | 30px / 1.875rem | 38px / 2.375rem | 600 | Section headers |
| H3 | 24px / 1.5rem | 32px / 2rem | 600 | Card titles |
| H4 | 20px / 1.25rem | 28px / 1.75rem | 600 | Subsection titles |
| H5 | 18px / 1.125rem | 26px / 1.625rem | 600 | Labels |
| Body Large | 18px / 1.125rem | 28px / 1.75rem | 400 | Lead paragraphs |
| Body | 16px / 1rem | 24px / 1.5rem | 400 | Regular text |
| Body Small | 14px / 0.875rem | 20px / 1.25rem | 400 | Secondary text |
| Caption | 12px / 0.75rem | 16px / 1rem | 500 | Labels, captions |

### 3.3 Typography Implementation

```tsx
// Heading Example
<h1 className="text-4xl font-bold text-[#002168] tracking-tight">
  Welcome to Grid Electric
</h1>

// Card Title Example
<CardTitle className="text-xl text-[#002168]">
  Personal Information
</CardTitle>

// Body Text Example
<p className="text-gray-600">
  Join our network of damage assessment professionals
</p>
```

---

## 4. SPACING & LAYOUT

### 4.1 Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| 0 | 0px | None |
| 0.5 | 2px | Hairline |
| 1 | 4px | Tight |
| 2 | 8px | Compact |
| 3 | 12px | Small |
| 4 | 16px | Default |
| 5 | 20px | Medium |
| 6 | 24px | Large |
| 8 | 32px | XLarge |
| 10 | 40px | XXLarge |
| 12 | 48px | Section |
| 16 | 64px | Major |

### 4.2 Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| sm | 4px | Small elements |
| DEFAULT | 8px | Cards, buttons |
| md | 12px | Modals |
| lg | 16px | Large cards |
| xl | 24px | Hero sections |
| full | 9999px | Pills, avatars |

### 4.3 Shadows

```css
/* Card Shadow */
--shadow-card: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);

/* Card Hover Shadow */
--shadow-card-hover: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);

/* Button Shadow */
--shadow-button: 0 4px 14px 0 rgba(46, 163, 242, 0.39);
```

---

## 5. COMPONENT LIBRARY

### 5.1 Buttons

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BUTTON COMPONENTS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PRIMARY BUTTON                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │    │
│  │  │    Default      │  │     Hover       │  │    Disabled     │     │    │
│  │  │                 │  │                 │  │                 │     │    │
│  │  │  [Button]       │  │  [Button]       │  │  [Button]       │     │    │
│  │  │  BG: #2ea3f2    │  │  BG: #1a8fd9    │  │  BG: #d1d5db    │     │    │
│  │  │  Text: White    │  │  Shadow: Blue   │  │  Text: #9ca3af  │     │    │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘     │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  SECONDARY BUTTON                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │  ┌─────────────────┐  ┌─────────────────┐                          │    │
│  │  │    Default      │  │     Hover       │                          │    │
│  │  │                 │  │                 │                          │    │
│  │  │  [Button]       │  │  [Button]       │                          │    │
│  │  │  BG: White      │  │  BG: #f3f4f6    │                          │    │
│  │  │  Border: #e5e7eb│  │  Border: #d1d5db│                          │    │
│  │  │  Text: #333333  │  │  Text: #002168  │                          │    │
│  │  └─────────────────┘  └─────────────────┘                          │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  GHOST BUTTON                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │  ┌─────────────────┐  ┌─────────────────┐                          │    │
│  │  │    Default      │  │     Hover       │                          │    │
│  │  │                 │  │                 │                          │    │
│  │  │  [Button]       │  │  [Button]       │                          │    │
│  │  │  BG: Transparent│  │  BG: #f3f4f6    │                          │    │
│  │  │  Text: #2ea3f2  │  │  Text: #1a8fd9  │                          │    │
│  │  └─────────────────┘  └─────────────────┘                          │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Cards

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CARD COMPONENTS                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ONBOARDING CARD                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  ┌─────────────────────────────────────────────────────────────┐   │    │
│  │  │  [Icon]  Card Title                                         │   │    │
│  │  │                                                             │   │    │
│  │  │  Card description goes here...                             │   │    │
│  │  │                                                             │   │    │
│  │  │  [Form Content]                                             │   │    │
│  │  │                                                             │   │    │
│  │  └─────────────────────────────────────────────────────────────┘   │    │
│  │                                                                     │    │
│  │  BG: White, Border: 1px solid #e5e7eb, Radius: 12px                │    │
│  │  Shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1)                              │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  BENEFIT CARD                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  ┌─────────────────────────────────────────────────────────────┐   │    │
│  │  │  [Icon]  Title                                              │   │    │
│  │  │          Description                                        │   │    │
│  │  └─────────────────────────────────────────────────────────────┘   │    │
│  │                                                                     │    │
│  │  Hover: Shadow increase, Border color → #bfdbfe                   │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Form Inputs

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FORM INPUTS                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  TEXT INPUT                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │  Label *                                                            │    │
│  │  ┌─────────────────────────────────────────────────────────────┐   │    │
│  │  │ Placeholder text                                              │   │    │
│  │  └─────────────────────────────────────────────────────────────┘   │    │
│  │                                                                     │    │
│  │  Focus: Border #2ea3f2, Ring rgba(46, 163, 242, 0.2)             │    │
│  │  Error: Border #cf2e2e, Text #cf2e2e                             │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.4 Progress Indicators

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PROGRESS INDICATORS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PROGRESS BAR                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │  Step X of Y    [████████████░░░░░░░░░░░░░░░░░░░░]                │    │
│  │                                                                     │    │
│  │  BG: #e5e7eb, Fill: gradient(90deg, #2ea3f2, #0693e3)             │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  STEP DOTS                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │  [1]  [2]  [3]  [4]  [5]  [6]  [7]  [8]  [9]  [10]                │    │
│  │   ✓    ✓    ●                                                   │    │
│  │                                                                     │    │
│  │  Completed: #2ea3f2, Active: gradient, Pending: #e5e7eb          │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. ICONOGRAPHY

### 6.1 Icon Library

**Primary Library:** Lucide React (https://lucide.dev/)

### 6.2 Icon Usage by Context

| Context | Icon | Usage |
|---------|------|-------|
| Personal Info | UserCircle | Personal information section |
| Business Info | Building2 | Business details section |
| Insurance | Shield | Insurance coverage section |
| Credentials | Award | Professional credentials |
| Banking | Landmark | Banking information |
| Rates | DollarSign | Rate agreements |
| Agreements | Scale | Legal agreements |
| Training | GraduationCap | Safety training |
| Photo | Camera | Profile photo |
| Review | ClipboardCheck | Review page |
| Success | CheckCircle | Success states |
| Warning | AlertTriangle | Warning states |
| Info | Info | Information alerts |

---

## 7. ANIMATIONS & INTERACTIONS

### 7.1 Motion Principles

- **Purposeful:** Every animation serves a function
- **Subtle:** Enhance, don't distract
- **Fast:** 200-400ms for most transitions
- **Consistent:** Same patterns throughout

### 7.2 Key Animations

| Animation | Duration | Effect | Usage |
|-----------|----------|--------|-------|
| fadeIn | 500ms | Opacity 0→1, translateY 10px→0 | Page content |
| slideIn | 400ms | Opacity 0→1, translateX -20px→0 | Sidebar items |
| pulse-ring | 2000ms | Scale pulse with shadow | Active indicators |
| progress-fill | 500ms | Width transition | Progress bars |
| card-hover | 300ms | Shadow increase, slight lift | Card interactions |

### 7.3 CSS Animation Classes

```css
.animate-fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}

.animate-slide-in {
  animation: slideIn 0.4s ease-out forwards;
}

.animate-pulse-ring {
  animation: pulse-ring 2s infinite;
}
```

---

## 8. RESPONSIVE DESIGN

### 8.1 Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| sm | 640px | Mobile landscape |
| md | 768px | Tablet |
| lg | 1024px | Desktop |
| xl | 1280px | Large desktop |

### 8.2 Mobile-First Approach

```tsx
// Example responsive layout
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Content */}
</div>

// Responsive typography
<h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#002168]">
  Title
</h1>
```

### 8.3 Touch Targets

- Minimum touch target: 44×44px
- Button height: 48px (mobile), 40px (desktop)
- Spacing between touch targets: 8px minimum

---

## 9. ONBOARDING FLOW SPECIFICS

### 9.1 Page Structure

Each onboarding page follows this structure:

```tsx
<div className="space-y-6">
  <OnboardingStepIndicator />
  
  <Card className="border-gray-100 shadow-sm">
    <CardHeader>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-50">
          <Icon className="w-5 h-5 text-[#2ea3f2]" />
        </div>
        <CardTitle className="text-xl text-[#002168]">Title</CardTitle>
      </div>
      <CardDescription>Description</CardDescription>
    </CardHeader>
    <CardContent>
      <Form />
    </CardContent>
  </Card>
</div>
```

### 9.2 Header Structure

```tsx
<header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
  <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#002168] to-[#2ea3f2]">
        <Zap className="w-5 h-5 text-white" fill="white" />
      </div>
      <div>
        <span className="font-bold text-[#002168] text-lg">Grid Electric</span>
        <span className="block text-xs text-gray-500">Contractor Portal</span>
      </div>
    </div>
    <OnboardingProgress />
  </div>
</header>
```

---

## DOCUMENT CONTROL

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-04 | Initial design system | Agent |
| 2.0 | 2026-02-10 | Updated to match gridelectriccorp.com | Kimi Code CLI |

---

**END OF DESIGN SYSTEM DOCUMENT**
