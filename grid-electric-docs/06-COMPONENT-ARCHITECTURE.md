# Central Command — COMPONENT ARCHITECTURE

## Frontend Structure & Organization

**Version:** 1.0  
**Date:** February 4, 2026  
**Framework:** Next.js 14 + React 18 + TypeScript

---

## TABLE OF CONTENTS

1. [Folder Structure](#1-folder-structure)
2. [Component Organization](#2-component-organization)
3. [State Management](#3-state-management)
4. [Hooks](#4-hooks)
5. [Services](#5-services)
6. [Utilities](#6-utilities)
7. [Type Definitions](#7-type-definitions)
8. [Styling Strategy](#8-styling-strategy)

---

## 1. FOLDER STRUCTURE

```typescript
│
├── 📁 app/                          # Next.js App Router
│   ├── 📁 (auth)/                   # Auth route group
│   │   ├── 📁 login/
│   │   │   └── page.tsx
│   │   ├── 📁 forgot-password/
│   │   │   └── page.tsx
│   │   ├── 📁 reset-password/
│   │   │   └── page.tsx
│   │   └── 📁 magic-link/
│   │       └── page.tsx
│   │
│   ├── 📁 (onboarding)/             # Onboarding route group
│   │   ├── 📁 welcome/
│   │   │   └── page.tsx
│   │   ├── 📁 personal-info/
│   │   │   └── page.tsx
│   │   ├── 📁 business-info/
│   │   │   └── page.tsx
│   │   ├── 📁 insurance/
│   │   │   └── page.tsx
│   │   ├── 📁 credentials/
│   │   │   └── page.tsx
│   │   ├── 📁 banking/
│   │   │   └── page.tsx
│   │   ├── 📁 rates/
│   │   │   └── page.tsx
│   │   ├── 📁 agreements/
│   │   │   └── page.tsx
│   │   ├── 📁 training/
│   │   │   └── page.tsx
│   │   ├── 📁 profile-photo/
│   │   │   └── page.tsx
│   │   ├── 📁 review/
│   │   │   └── page.tsx
│   │   └── 📁 pending/
│   │       └── page.tsx
│   │
│   ├── 📁 (admin)/                  # Admin portal route group
│   │   ├── 📁 dashboard/
│   │   │   └── page.tsx
│   │   ├── 📁 tickets/
│   │   │   ├── page.tsx
│   │   │   └── 📁 [id]/
│   │   │       └── page.tsx
│   │   ├── 📁 subcontractors/
│   │   │   ├── page.tsx
│   │   │   └── 📁 [id]/
│   │   │       └── page.tsx
│   │   ├── 📁 time-review/
│   │   │   └── page.tsx
│   │   ├── 📁 expense-review/
│   │   │   └── page.tsx
│   │   ├── 📁 assessments/
│   │   │   └── page.tsx
│   │   ├── 📁 invoices/
│   │   │   ├── page.tsx
│   │   │   └── 📁 generate/
│   │   │       └── page.tsx
│   │   ├── 📁 reports/
│   │   │   └── page.tsx
│   │   ├── 📁 map/
│   │   │   └── page.tsx
│   │   └── 📁 settings/
│   │       └── page.tsx
│   │
│   ├── 📁 (subcontractor)/          # Subcontractor portal route group
│   │   ├── 📁 dashboard/
│   │   │   └── page.tsx
│   │   ├── 📁 tickets/
│   │   │   ├── page.tsx
│   │   │   └── 📁 [id]/
│   │   │       ├── page.tsx
│   │   │       └── 📁 assess/
│   │   │           └── page.tsx
│   │   ├── 📁 time/
│   │   │   ├── page.tsx
│   │   │   └── 📁 clock/
│   │   │       └── page.tsx
│   │   ├── 📁 expenses/
│   │   │   ├── page.tsx
│   │   │   └── 📁 new/
│   │   │       └── page.tsx
│   │   ├── 📁 invoices/
│   │   │   ├── page.tsx
│   │   │   └── 📁 [id]/
│   │   │       └── page.tsx
│   │   ├── 📁 profile/
│   │   │   └── page.tsx
│   │   └── 📁 sync/
│   │       └── page.tsx
│   │
│   ├── 📁 api/                      # API routes (if needed)
│   │   └── 📁 webhooks/
│   │       └── route.ts
│   │
│   ├── layout.tsx                   # Root layout
│   ├── page.tsx                     # Root redirect
│   ├── globals.css                  # Global styles
│   └── manifest.ts                  # PWA manifest
│
├── 📁 components/                   # React components
│   ├── 📁 ui/                       # shadcn/ui components (auto-generated)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── table.tsx
│   │   ├── tabs.tsx
│   │   ├── badge.tsx
│   │   ├── avatar.tsx
│   │   ├── skeleton.tsx
│   │   ├── toast.tsx
│   │   ├── calendar.tsx
│   │   └── ... (40+ components)
│   │
│   ├── 📁 common/                   # Shared/common components
│   │   ├── 📁 layout/
│   │   │   ├── AppShell.tsx         # Main app shell
│   │   │   ├── Sidebar.tsx          # Desktop sidebar
│   │   │   ├── BottomNav.tsx        # Mobile bottom nav
│   │   │   ├── TopBar.tsx           # Top header bar
│   │   │   └── PageHeader.tsx       # Page header with back button
│   │   │
│   │   ├── 📁 feedback/
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── SyncStatus.tsx
│   │   │   └── OfflineBanner.tsx
│   │   │
│   │   ├── 📁 data-display/
│   │   │   ├── DataTable.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── PriorityBadge.tsx
│   │   │   ├── MetricCard.tsx
│   │   │   └── TicketCard.tsx
│   │   │
│   │   └── 📁 forms/
│   │       ├── FormField.tsx
│   │       ├── FormSection.tsx
│   │       ├── ImageUpload.tsx
│   │       ├── SignaturePad.tsx
│   │       └── LocationPicker.tsx
│   │
│   ├── 📁 features/                 # Feature-specific components
│   │   ├── 📁 auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── ForgotPasswordForm.tsx
│   │   │   └── MagicLinkForm.tsx
│   │   │
│   │   ├── 📁 onboarding/
│   │   │   ├── OnboardingProgress.tsx
│   │   │   ├── PersonalInfoForm.tsx
│   │   │   ├── BusinessInfoForm.tsx
│   │   │   ├── InsuranceUpload.tsx
│   │   │   ├── CredentialsForm.tsx
│   │   │   ├── BankingForm.tsx
│   │   │   ├── RateAgreement.tsx
│   │   │   ├── AgreementSignature.tsx
│   │   │   ├── TrainingVideo.tsx
│   │   │   └── ProfilePhotoCapture.tsx
│   │   │
│   │   ├── 📁 tickets/
│   │   │   ├── TicketList.tsx
│   │   │   ├── TicketDetail.tsx
│   │   │   ├── TicketCreateForm.tsx
│   │   │   ├── TicketAssign.tsx
│   │   │   ├── TicketFilters.tsx
│   │   │   ├── StatusUpdater.tsx
│   │   │   └── RouteOptimizer.tsx
│   │   │
│   │   ├── 📁 time-tracking/
│   │   │   ├── TimeClock.tsx
│   │   │   ├── TimeEntryList.tsx
│   │   │   ├── TimeEntryCard.tsx
│   │   │   ├── ActiveTimer.tsx
│   │   │   └── WorkTypeSelector.tsx
│   │   │
│   │   ├── 📁 expenses/
│   │   │   ├── ExpenseList.tsx
│   │   │   ├── ExpenseForm.tsx
│   │   │   ├── ExpenseItemForm.tsx
│   │   │   ├── ReceiptCapture.tsx
│   │   │   ├── MileageCalculator.tsx
│   │   │   └── ExpenseCategorySelect.tsx
│   │   │
│   │   ├── 📁 assessments/
│   │   │   ├── AssessmentForm.tsx
│   │   │   ├── SafetyChecklist.tsx
│   │   │   ├── EquipmentAssessment.tsx
│   │   │   ├── DamageClassification.tsx
│   │   │   ├── PhotoGallery.tsx
│   │   │   └── PhotoCapture.tsx
│   │   │
│   │   ├── 📁 invoices/
│   │   │   ├── InvoiceList.tsx
│   │   │   ├── InvoiceDetail.tsx
│   │   │   ├── InvoiceGenerator.tsx
│   │   │   ├── InvoiceLineItems.tsx
│   │   │   └── InvoicePDFViewer.tsx
│   │   │
│   │   ├── 📁 map/
│   │   │   ├── MapView.tsx
│   │   │   ├── TicketMarkers.tsx
│   │   │   ├── RouteOverlay.tsx
│   │   │   └── GeofenceCircle.tsx
│   │   │
│   │   └── 📁 dashboard/
│   │       ├── DashboardMetrics.tsx
│   │       ├── RecentTickets.tsx
│   │       ├── ActivityFeed.tsx
│   │       └── AlertsPanel.tsx
│   │
│   └── 📁 providers/                # Context providers
│       ├── AuthProvider.tsx
│       ├── ThemeProvider.tsx
│       ├── SyncProvider.tsx
│       └── NotificationProvider.tsx
│
├── 📁 hooks/                        # Custom React hooks
│   ├── useAuth.ts
│   ├── useUser.ts
│   ├── useTickets.ts
│   ├── useTimeEntries.ts
│   ├── useExpenses.ts
│   ├── useAssessments.ts
│   ├── useInvoices.ts
│   ├── useSubcontractors.ts
│   ├── useMedia.ts
│   ├── useGeolocation.ts
│   ├── useSync.ts
│   ├── useOffline.ts
│   ├── useNotifications.ts
│   ├── useLocalStorage.ts
│   └── useDebounce.ts
│
├── 📁 lib/                          # Utilities & configuration
│   ├── 📁 supabase/
│   │   ├── client.ts                # Browser client
│   │   ├── server.ts                # Server client
│   │   ├── admin.ts                 # Admin client
│   │   └── realtime.ts              # Realtime config
│   │
│   ├── 📁 db/                       # Database helpers
│   │   ├── queries.ts               # Common queries
│   │   ├── mutations.ts             # Common mutations
│   │   └── types.ts                 # DB type helpers
│   │
│   ├── 📁 services/                 # External services
│   │   ├── mapbox.ts                # Mapbox integration
│   │   ├── geolocation.ts           # GPS services
│   │   ├── notifications.ts         # Push notifications
│   │   └── ocr.ts                   # Receipt OCR
│   │
│   ├── 📁 utils/                    # Utility functions
│   │   ├── formatters.ts            # Date, currency, etc.
│   │   ├── validators.ts            # Input validation
│   │   ├── calculations.ts          # Math helpers
│   │   ├── crypto.ts                # Encryption helpers
│   │   └── helpers.ts               # General helpers
│   │
│   ├── 📁 constants/                # App constants
│   │   ├── routes.ts                # Route definitions
│   │   ├── roles.ts                 # User roles
│   │   ├── statuses.ts              # Status enums
│   │   ├── workTypes.ts             # Work type definitions
│   │   ├── expenseCategories.ts     # Expense categories
│   │   ├── equipmentTypes.ts        # Equipment catalog
│   │   └── hazardCategories.ts      # Safety hazards
│   │
│   └── config.ts                    # App configuration
│
├── 📁 types/                        # TypeScript type definitions
│   ├── index.ts                     # Main exports
│   ├── auth.ts
│   ├── user.ts
│   ├── subcontractor.ts
│   ├── ticket.ts
│   ├── timeEntry.ts
│   ├── expense.ts
│   ├── assessment.ts
│   ├── invoice.ts
│   ├── media.ts
│   ├── notification.ts
│   └── api.ts
│
├── 📁 stores/                       # Zustand stores
│   ├── authStore.ts
│   ├── ticketStore.ts
│   ├── timeStore.ts
│   ├── expenseStore.ts
│   ├── syncStore.ts
│   └── uiStore.ts
│
├── 📁 public/                       # Static assets
│   ├── 📁 icons/                    # App icons
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   └── apple-touch-icon.png
│   ├── 📁 images/                   # Static images
│   │   ├── logo.svg
│   │   ├── logo-white.svg
│   │   └── onboarding/
│   ├── manifest.json                # PWA manifest
│   ├── sw.js                        # Service worker
│   └── robots.txt
│
├── 📁 styles/                       # Additional styles
│   └── mapbox.css                   # Mapbox custom styles
│
├── 📁 workers/                      # Web workers
│   └── sync.worker.ts               # Background sync
│
├── .env.local                       # Environment variables
├── .env.example                     # Env template
├── next.config.js                   # Next.js config
├── tailwind.config.ts               # Tailwind config
├── tsconfig.json                    # TypeScript config
├── components.json                  # shadcn/ui config
└── package.json
```

---

## 2. COMPONENT ORGANIZATION

### 2.1 Component Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           COMPONENT HIERARCHY                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  LAYOUT COMPONENTS (Shell)                                                  │
│  ├── AppShell.tsx                    # Main layout wrapper                  │
│  │   ├── Sidebar.tsx (desktop)      # Navigation sidebar                    │
│  │   ├── BottomNav.tsx (mobile)     # Mobile navigation                     │
│  │   ├── TopBar.tsx                 # Header bar                            │
│  │   └── PageHeader.tsx             # Page title + actions                  │
│  │                                                                          │
│  │   [AuthProvider]                   # Authentication context              │
│  │   [ThemeProvider]                  # Theme/styling context               │
│  │   [SyncProvider]                   # Offline sync context                │
│  │   [NotificationProvider]           # Push notification context           │
│  │                                                                          │
│  PAGE COMPONENTS (Routes)                                                   │
│  ├── (auth)/login/page.tsx           # Login page                           │
│  ├── (admin)/dashboard/page.tsx      # Admin dashboard                      │
│  ├── (subcontractor)/tickets/page.tsx # Sub ticket list                     │
│  │                                                                          │
│  FEATURE COMPONENTS (Business Logic)                                        │
│  ├── TicketList.tsx                  # Ticket list with filters             │
│  │   ├── TicketCard.tsx               # Individual ticket card              │
│  │   ├── TicketFilters.tsx            # Filter controls                     │
│  │   └── StatusBadge.tsx              # Status indicator                    │
│  │                                                                          │
│  UI COMPONENTS (Primitives)                                                 │
│  ├── Button (shadcn)                 # Base button                          │
│  ├── Card (shadcn)                   # Base card                            │
│  ├── Input (shadcn)                  # Base input                           │
│  └── Badge (shadcn)                  # Base badge                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Pages | `page.tsx` | `app/(admin)/dashboard/page.tsx` |
| Layouts | `layout.tsx` | `app/(admin)/layout.tsx` |
| Components | PascalCase | `TicketList.tsx`, `TimeClock.tsx` |
| Hooks | camelCase with `use` prefix | `useTickets.ts`, `useGeolocation.ts` |
| Utilities | camelCase | `formatters.ts`, `validators.ts` |
| Types | PascalCase | `Ticket.ts`, `TimeEntry.ts` |
| Constants | SCREAMING_SNAKE_CASE | `TICKET_STATUSES`, `WORK_TYPES` |

### 2.3 Component File Structure

```typescript
// components/features/tickets/TicketCard.tsx

// 1. Imports (ordered: React, libs, components, hooks, utils, types)
import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatCurrency } from '@/lib/utils/formatters';
import { Ticket } from '@/types/ticket';

// 2. Type definitions
interface TicketCardProps {
  ticket: Ticket;
  onStatusChange?: (id: string, status: string) => void;
  showActions?: boolean;
}

// 3. Component
export function TicketCard({ 
  ticket, 
  onStatusChange, 
  showActions = true 
}: TicketCardProps) {
  // Hooks
  const router = useRouter();
  const { user } = useAuth();
  
  // Derived state
  const isAssigned = !!ticket.assigned_to;
  const isOverdue = new Date(ticket.due_date) < new Date();
  
  // Handlers
  const handleViewDetails = () => {
    router.push(`/tickets/${ticket.id}`);
  };
  
  // Render
  return (
    <Card className={cn(
      "hover:shadow-md transition-shadow",
      isOverdue && "border-red-500"
    )}>
      <CardHeader>
        {/* Content */}
      </CardHeader>
      <CardContent>
        {/* Content */}
      </CardContent>
    </Card>
  );
}

// 4. Default export (if needed)
export default TicketCard;
```

---

## 3. STATE MANAGEMENT

### 3.1 Zustand Store Pattern

```typescript
// stores/ticketStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Ticket } from '@/types/ticket';
import { supabase } from '@/lib/supabase/client';

interface TicketState {
  // State
  tickets: Ticket[];
  selectedTicket: Ticket | null;
  isLoading: boolean;
  error: string | null;
  filters: {
    status: string | null;
    priority: string | null;
    assignedTo: string | null;
  };
  
  // Actions
  setTickets: (tickets: Ticket[]) => void;
  addTicket: (ticket: Ticket) => void;
  updateTicket: (id: string, updates: Partial<Ticket>) => void;
  deleteTicket: (id: string) => void;
  selectTicket: (ticket: Ticket | null) => void;
  setFilters: (filters: Partial<TicketState['filters']>) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Async actions
  fetchTickets: () => Promise<void>;
  createTicket: (data: CreateTicketData) => Promise<void>;
  updateTicketStatus: (id: string, status: string) => Promise<void>;
}

export const useTicketStore = create<TicketState>()(
  persist(
    (set, get) => ({
      // Initial state
      tickets: [],
      selectedTicket: null,
      isLoading: false,
      error: null,
      filters: {
        status: null,
        priority: null,
        assignedTo: null,
      },
      
      // Actions
      setTickets: (tickets) => set({ tickets }),
      
      addTicket: (ticket) => set((state) => ({
        tickets: [ticket, ...state.tickets],
      })),
      
      updateTicket: (id, updates) => set((state) => ({
        tickets: state.tickets.map((t) =>
          t.id === id ? { ...t, ...updates } : t
        ),
      })),
      
      deleteTicket: (id) => set((state) => ({
        tickets: state.tickets.filter((t) => t.id !== id),
      })),
      
      selectTicket: (ticket) => set({ selectedTicket: ticket }),
      
      setFilters: (filters) => set((state) => ({
        filters: { ...state.filters, ...filters },
      })),
      
      setLoading: (isLoading) => set({ isLoading }),
      
      setError: (error) => set({ error }),
      
      // Async actions
      fetchTickets: async () => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('tickets')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          set({ tickets: data || [] });
        } catch (err) {
          set({ error: (err as Error).message });
        } finally {
          set({ isLoading: false });
        }
      },
      
      createTicket: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const { data: ticket, error } = await supabase
            .from('tickets')
            .insert(data)
            .select()
            .single();
          
          if (error) throw error;
          get().addTicket(ticket);
        } catch (err) {
          set({ error: (err as Error).message });
        } finally {
          set({ isLoading: false });
        }
      },
      
      updateTicketStatus: async (id, status) => {
        try {
          const { error } = await supabase
            .from('tickets')
            .update({ status })
            .eq('id', id);
          
          if (error) throw error;
          get().updateTicket(id, { status });
        } catch (err) {
          set({ error: (err as Error).message });
        }
      },
    }),
    {
      name: 'ticket-store',
      partialize: (state) => ({ 
        filters: state.filters 
      }),
    }
  )
);
```

### 3.2 React Query Pattern

```typescript
// hooks/useTickets.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { Ticket } from '@/types/ticket';

// Query keys
export const ticketKeys = {
  all: ['tickets'] as const,
  lists: () => [...ticketKeys.all, 'list'] as const,
  list: (filters: object) => [...ticketKeys.lists(), filters] as const,
  details: () => [...ticketKeys.all, 'detail'] as const,
  detail: (id: string) => [...ticketKeys.details(), id] as const,
};

// Fetch all tickets
export function useTickets(filters?: object) {
  return useQuery({
    queryKey: ticketKeys.list(filters || {}),
    queryFn: async () => {
      let query = supabase
        .from('tickets')
        .select('*, assigned_subcontractor:subcontractors(id, business_name)')
        .order('created_at', { ascending: false });
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Ticket[];
    },
  });
}

// Fetch single ticket
export function useTicket(id: string) {
  return useQuery({
    queryKey: ticketKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('*, ticket_status_history(*), damage_assessments(*)')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Ticket;
    },
    enabled: !!id,
  });
}

// Create ticket mutation
export function useCreateTicket() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (newTicket: CreateTicketData) => {
      const { data, error } = await supabase
        .from('tickets')
        .insert(newTicket)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
    },
  });
}

// Update ticket status mutation
export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from('tickets')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ticketKeys.detail(data.id) 
      });
      queryClient.invalidateQueries({ 
        queryKey: ticketKeys.lists() 
      });
    },
  });
}
```

---

## 4. HOOKS

### 4.1 Custom Hooks Library

```typescript
// hooks/useGeolocation.ts

import { useState, useEffect, useCallback } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number | null;
  error: string | null;
  isLoading: boolean;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watch?: boolean;
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0,
    watch = false,
  } = options;
  
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    altitude: null,
    heading: null,
    speed: null,
    timestamp: null,
    error: null,
    isLoading: true,
  });
  
  const handleSuccess = useCallback((position: GeolocationPosition) => {
    setState({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      heading: position.coords.heading,
      speed: position.coords.speed,
      timestamp: position.timestamp,
      error: null,
      isLoading: false,
    });
  }, []);
  
  const handleError = useCallback((error: GeolocationPositionError) => {
    setState((prev) => ({
      ...prev,
      error: error.message,
      isLoading: false,
    }));
  }, []);
  
  useEffect(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: 'Geolocation is not supported',
        isLoading: false,
      }));
      return;
    }
    
    const geoOptions = {
      enableHighAccuracy,
      timeout,
      maximumAge,
    };
    
    if (watch) {
      const watchId = navigator.geolocation.watchPosition(
        handleSuccess,
        handleError,
        geoOptions
      );
      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      navigator.geolocation.getCurrentPosition(
        handleSuccess,
        handleError,
        geoOptions
      );
    }
  }, [enableHighAccuracy, timeout, maximumAge, watch, handleSuccess, handleError]);
  
  const refresh = useCallback(() => {
    setState((prev) => ({ ...prev, isLoading: true }));
    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      handleError,
      { enableHighAccuracy, timeout, maximumAge }
    );
  }, [enableHighAccuracy, timeout, maximumAge, handleSuccess, handleError]);
  
  return { ...state, refresh };
}
```

```typescript
// hooks/useSync.ts

import { useState, useEffect, useCallback } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { db } from '@/lib/db/dexie';

interface SyncQueueItem {
  id: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  table: string;
  data: unknown;
  retryCount: number;
  createdAt: Date;
}

interface UseSyncReturn {
  queue: SyncQueueItem[];
  isSyncing: boolean;
  lastSync: Date | null;
  pendingCount: number;
  sync: () => Promise<void>;
  addToQueue: (item: Omit<SyncQueueItem, 'id' | 'retryCount' | 'createdAt'>) => void;
  removeFromQueue: (id: string) => void;
}

export function useSync(): UseSyncReturn {
  const isOnline = useOnlineStatus();
  const [queue, setQueue] = useState<SyncQueueItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  
  // Load queue from IndexedDB on mount
  useEffect(() => {
    loadQueue();
  }, []);
  
  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && queue.length > 0 && !isSyncing) {
      sync();
    }
  }, [isOnline, queue.length]);
  
  const loadQueue = async () => {
    const items = await db.syncQueue.toArray();
    setQueue(items);
  };
  
  const addToQueue = useCallback(async (item: Omit<SyncQueueItem, 'id' | 'retryCount' | 'createdAt'>) => {
    const newItem: SyncQueueItem = {
      ...item,
      id: crypto.randomUUID(),
      retryCount: 0,
      createdAt: new Date(),
    };
    
    await db.syncQueue.add(newItem);
    setQueue((prev) => [...prev, newItem]);
    
    // Try to sync immediately if online
    if (isOnline) {
      sync();
    }
  }, [isOnline]);
  
  const removeFromQueue = useCallback(async (id: string) => {
    await db.syncQueue.delete(id);
    setQueue((prev) => prev.filter((item) => item.id !== id));
  }, []);
  
  const sync = useCallback(async () => {
    if (isSyncing || queue.length === 0) return;
    
    setIsSyncing(true);
    
    try {
      for (const item of queue) {
        try {
          await processSyncItem(item);
          await removeFromQueue(item.id);
        } catch (error) {
          // Increment retry count
          await db.syncQueue.update(item.id, {
            retryCount: item.retryCount + 1,
          });
        }
      }
      
      setLastSync(new Date());
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, queue, removeFromQueue]);
  
  const processSyncItem = async (item: SyncQueueItem) => {
    // Implementation depends on item type
    // This would call the appropriate Supabase mutation
  };
  
  return {
    queue,
    isSyncing,
    lastSync,
    pendingCount: queue.length,
    sync,
    addToQueue,
    removeFromQueue,
  };
}
```

---

## 5. SERVICES

### 5.1 External Service Integration

```typescript
// lib/services/mapbox.ts

import mapboxgl from 'mapbox-gl';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

interface MapConfig {
  container: string | HTMLElement;
  center: [number, number];
  zoom: number;
  style?: string;
}

export function initializeMap(config: MapConfig): mapboxgl.Map {
  return new mapboxgl.Map({
    container: config.container,
    style: config.style || 'mapbox://styles/mapbox/streets-v12',
    center: config.center,
    zoom: config.zoom,
  });
}

export function addMarker(
  map: mapboxgl.Map,
  coordinates: [number, number],
  options?: mapboxgl.MarkerOptions
): mapboxgl.Marker {
  return new mapboxgl.Marker(options)
    .setLngLat(coordinates)
    .addTo(map);
}

export function addGeofence(
  map: mapboxgl.Map,
  center: [number, number],
  radiusInMeters: number
): mapboxgl.GeoJSONSource {
  const circle = createGeoJSONCircle(center, radiusInMeters);
  
  map.addSource('geofence', {
    type: 'geojson',
    data: circle,
  });
  
  map.addLayer({
    id: 'geofence-fill',
    type: 'fill',
    source: 'geofence',
    paint: {
      'fill-color': '#3B82F6',
      'fill-opacity': 0.2,
    },
  });
  
  map.addLayer({
    id: 'geofence-line',
    type: 'line',
    source: 'geofence',
    paint: {
      'line-color': '#3B82F6',
      'line-width': 2,
    },
  });
  
  return map.getSource('geofence') as mapboxgl.GeoJSONSource;
}

function createGeoJSONCircle(
  center: [number, number],
  radiusInMeters: number
): GeoJSON.Feature {
  const points = 64;
  const coords = {
    latitude: center[1],
    longitude: center[0],
  };
  
  const km = radiusInMeters / 1000;
  const ret = [];
  const distanceX = km / (111.32 * Math.cos((coords.latitude * Math.PI) / 180));
  const distanceY = km / 110.574;
  
  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    ret.push([coords.longitude + x, coords.latitude + y]);
  }
  ret.push(ret[0]);
  
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [ret],
    },
    properties: {},
  };
}

export async function getDirections(
  waypoints: [number, number][]
): Promise<mapboxgl.DirectionsResponse | null> {
  const coordinates = waypoints.map((wp) => wp.join(',')).join(';');
  
  const response = await fetch(
    `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?` +
    `alternatives=true&geometries=geojson&steps=true&access_token=${mapboxgl.accessToken}`
  );
  
  if (!response.ok) return null;
  return response.json();
}
```

---

## 6. UTILITIES

### 6.1 Formatters

```typescript
// lib/utils/formatters.ts

import { format, formatDistanceToNow, parseISO } from 'date-fns';

// Date formatters
export function formatDate(date: string | Date, formatStr = 'MMM d, yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr);
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM d, yyyy h:mm a');
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'h:mm a');
}

// Currency formatters
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatCurrencyCompact(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
  }).format(amount);
}

// Number formatters
export function formatNumber(num: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatPercent(value: number, decimals = 1): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

// Duration formatters
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function formatDurationDecimal(minutes: number): string {
  return (minutes / 60).toFixed(2);
}

// Phone number formatter
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phone;
}

// Coordinate formatters
export function formatCoordinate(lat: number, lng: number): string {
  return `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° W`;
}

// Ticket number formatter
export function formatTicketNumber(number: string): string {
  return number.toUpperCase();
}

// File size formatter
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
```

### 6.2 Validators

```typescript
// lib/utils/validators.ts

import { z } from 'zod';

// Email validation
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email address');

// Password validation
export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// Phone validation
export const phoneSchema = z
  .string()
  .regex(/^\(\d{3}\) \d{3}-\d{4}$/, 'Invalid phone number format');

// Coordinate validation
export const coordinateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).optional(),
});

// Ticket form validation
export const ticketSchema = z.object({
  priority: z.enum(['A', 'B', 'C', 'X']),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().length(2, 'State must be 2 characters'),
  zip_code: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  utility_client: z.string().min(1, 'Client is required'),
  work_description: z.string().min(10, 'Description must be at least 10 characters'),
  scheduled_date: z.string().datetime(),
  due_date: z.string().datetime(),
});

// Time entry validation
export const timeEntrySchema = z.object({
  ticket_id: z.string().uuid(),
  work_type: z.enum([
    'STANDARD_ASSESSMENT',
    'EMERGENCY_RESPONSE',
    'TRAVEL',
    'STANDBY',
    'ADMIN',
    'TRAINING',
  ]),
  clock_in_latitude: z.number(),
  clock_in_longitude: z.number(),
  clock_in_accuracy: z.number().max(100, 'GPS accuracy must be within 100 meters'),
});

// Expense validation
export const expenseItemSchema = z.object({
  category: z.enum([
    'MILEAGE',
    'FUEL',
    'LODGING',
    'MEALS',
    'TOLLS',
    'PARKING',
    'MATERIALS',
    'EQUIPMENT_RENTAL',
    'OTHER',
  ]),
  description: z.string().min(1, 'Description is required'),
  amount: z.number().min(0, 'Amount must be positive'),
  expense_date: z.string().datetime(),
  mileage_start: z.number().optional(),
  mileage_end: z.number().optional(),
});

// Assessment validation
export const assessmentSchema = z.object({
  safety_observations: z.object({
    downed_conductors: z.boolean(),
    damaged_insulators: z.boolean(),
    vegetation_contact: z.boolean(),
    structural_damage: z.boolean(),
    fire_hazard: z.boolean(),
    public_accessible: z.boolean(),
    safe_distance_maintained: z.boolean(),
  }),
  damage_cause: z.string().optional(),
  estimated_repair_hours: z.number().min(0),
  priority: z.enum(['A', 'B', 'C', 'X']),
  immediate_actions: z.string().min(1, 'Immediate actions are required'),
  repair_vs_replace: z.enum(['REPAIR', 'REPLACE', 'ENGINEERING_REVIEW']),
});

// Type exports
export type TicketFormData = z.infer<typeof ticketSchema>;
export type TimeEntryFormData = z.infer<typeof timeEntrySchema>;
export type ExpenseItemFormData = z.infer<typeof expenseItemSchema>;
export type AssessmentFormData = z.infer<typeof assessmentSchema>;
```

---

## 7. TYPE DEFINITIONS

### 7.1 Core Types

```typescript
// types/index.ts

// Re-export all types
export * from './auth';
export * from './user';
export * from './subcontractor';
export * from './ticket';
export * from './timeEntry';
export * from './expense';
export * from './assessment';
export * from './invoice';
export * from './media';

// Common types
export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
}

export type SyncStatus = 'SYNCED' | 'PENDING' | 'FAILED' | 'CONFLICT';

export type UserRole = 
  | 'SUPER_ADMIN' 
  | 'ADMIN' 
  | 'TEAM_LEAD' 
  | 'CONTRACTOR' 
  | 'READ_ONLY';
```

```typescript
// types/ticket.ts

export type TicketStatus =
  | 'DRAFT'
  | 'ASSIGNED'
  | 'REJECTED'
  | 'IN_ROUTE'
  | 'ON_SITE'
  | 'IN_PROGRESS'
  | 'COMPLETE'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'NEEDS_REWORK'
  | 'CLOSED'
  | 'ARCHIVED'
  | 'EXPIRED';

export type PriorityLevel = 'A' | 'B' | 'C' | 'X';

export interface Ticket {
  id: string;
  ticket_number: string;
  status: TicketStatus;
  priority: PriorityLevel;
  address: string;
  address_line2?: string;
  city: string;
  state: string;
  zip_code: string;
  latitude?: number;
  longitude?: number;
  geofence_radius_meters: number;
  assigned_to?: string;
  assigned_by?: string;
  assigned_at?: string;
  created_at: string;
  scheduled_date?: string;
  due_date?: string;
  started_at?: string;
  completed_at?: string;
  utility_client: string;
  work_order_ref?: string;
  work_description?: string;
  special_instructions?: string;
  damage_types?: string[];
  severity?: string;
  created_by: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface TicketStatusHistory {
  id: string;
  ticket_id: string;
  from_status: TicketStatus;
  to_status: TicketStatus;
  changed_by?: string;
  changed_at: string;
  gps_latitude?: number;
  gps_longitude?: number;
  gps_accuracy?: number;
  ip_address?: string;
  user_agent?: string;
  change_reason?: string;
}

export interface CreateTicketData {
  ticket_number: string;
  priority: PriorityLevel;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  latitude?: number;
  longitude?: number;
  utility_client: string;
  work_description: string;
  scheduled_date: string;
  due_date: string;
  created_by: string;
}
```

---

## 8. STYLING STRATEGY

### 8.1 Tailwind Configuration

```typescript
// tailwind.config.ts

import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors
        navy: {
          900: '#0F172A',
          800: '#1E293B',
          700: '#334155',
          600: '#475569',
        },
        electric: {
          900: '#1E3A8A',
          800: '#1E40AF',
          700: '#1D4ED8',
          600: '#2563EB',
          500: '#3B82F6',
        },
        utility: {
          600: '#CA8A04',
          500: '#EAB308',
          400: '#FACC15',
          300: '#FDE047',
        },
        // shadcn/ui theme mapping
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'display-lg': ['3rem', { lineHeight: '3.5rem', letterSpacing: '-0.02em' }],
        'display': ['2.25rem', { lineHeight: '2.75rem', letterSpacing: '-0.02em' }],
        'h1': ['1.875rem', { lineHeight: '2.375rem', letterSpacing: '-0.01em' }],
        'h2': ['1.5rem', { lineHeight: '2rem' }],
        'h3': ['1.25rem', { lineHeight: '1.75rem' }],
        'h4': ['1.125rem', { lineHeight: '1.625rem' }],
        'body-lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'body': ['1rem', { lineHeight: '1.5rem' }],
        'body-sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'caption': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      height: {
        'screen-safe': '100dvh',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

### 8.2 CSS Variables (globals.css)

```css
/* app/globals.css */

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222 47% 11%;
    --card: 0 0% 100%;
    --card-foreground: 222 47% 11%;
    --popover: 0 0% 100%;
    --popover-foreground: 222 47% 11%;
    --primary: 224 76% 48%;
    --primary-foreground: 0 0% 100%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222 47% 11%;
    --muted: 210 40% 96%;
    --muted-foreground: 215 16% 47%;
    --accent: 48 96% 53%;
    --accent-foreground: 222 47% 11%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --border: 214 32% 91%;
    --input: 214 32% 91%;
    --ring: 224 76% 48%;
    --radius: 0.5rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  
  body {
    @apply bg-background text-foreground font-sans antialiased;
  }
  
  html {
    @apply scroll-smooth;
  }
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
  
  .safe-area-inset-bottom {
    padding-bottom: env(safe-area-inset-bottom);
  }
  
  .safe-area-inset-top {
    padding-top: env(safe-area-inset-top);
  }
}
```

---

**END OF COMPONENT ARCHITECTURE**
