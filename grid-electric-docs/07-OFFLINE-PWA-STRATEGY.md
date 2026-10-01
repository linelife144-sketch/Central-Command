# Central Command — OFFLINE-FIRST PWA STRATEGY

## Progressive Web App Implementation Guide

**Version:** 1.0  
**Date:** February 4, 2026  
**Priority:** Critical for Field Operations

---

## TABLE OF CONTENTS

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Service Worker](#3-service-worker)
4. [IndexedDB with Dexie.js](#4-indexeddb-with-dexiejs)
5. [Background Sync](#5-background-sync)
6. [Optimistic UI](#6-optimistic-ui)
7. [Conflict Resolution](#7-conflict-resolution)
8. [Implementation Checklist](#8-implementation-checklist)

---

## 1. OVERVIEW

### 1.1 Why Offline-First?

Field contractors often work in areas with:
- **Poor cellular coverage** (rural areas, underground facilities)
- **Network congestion** (emergency response situations)
- **Battery constraints** (continuous radio usage drains battery)
- **Safety requirements** (may need to disable radios in certain areas)

### 1.2 Offline-First Principles

1. **Local-First Data** — All data originates in local storage
2. **Optimistic Updates** — UI updates immediately, syncs in background
3. **Background Sync** — Queue operations for when connectivity returns
4. **Graceful Degradation** — App works with limited functionality offline
5. **Clear Feedback** — Users always know sync status

### 1.3 Offline Capabilities Matrix

| Feature | Online | Offline | Sync Behavior |
|---------|--------|---------|---------------|
| View tickets | ✅ Full | ✅ Cached | Read-only |
| Update ticket status | ✅ Real-time | ✅ Queued | Auto-sync |
| Clock in/out | ✅ Real-time | ✅ Queued | Auto-sync |
| Take photos | ✅ Upload | ✅ Stored | Background upload |
| Submit assessment | ✅ Real-time | ✅ Queued | Auto-sync |
| Submit expenses | ✅ Real-time | ✅ Queued | Auto-sync |
| View map | ✅ Full | ⚠️ Cached area | Limited |
| Generate reports | ✅ Full | ❌ No | N/A |

---

## 2. ARCHITECTURE

### 2.1 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OFFLINE-FIRST DATA FLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────┐                                                           │
│   │   USER UI    │                                                           │
│   └──────┬───────┘                                                           │
│          │                                                                   │
│          ▼                                                                   │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐               │
│   │  ZUSTAND     │◄───►│  REACT QUERY │◄───►│   DEXIE.JS   │               │
│   │    STORE     │     │  (CACHE)     │     │  (IndexedDB) │               │
│   └──────┬───────┘     └──────────────┘     └──────┬───────┘               │
│          │                                          │                        │
│          │         ┌───────────────────────────────┘                        │
│          │         │                                                        │
│          │         ▼                                                        │
│          │    ┌──────────────┐                                              │
│          │    │  SYNC QUEUE  │                                              │
│          │    │  (Pending)   │                                              │
│          │    └──────┬───────┘                                              │
│          │           │                                                      │
│          ▼           ▼                    ┌──────────────┐                 │
│   ┌──────────────┐  ┌──────────────┐      │              │                 │
│   │   SUPABASE   │  │   SERVICE    │◄────►│  BACKGROUND  │                 │
│   │   (SERVER)   │  │   WORKER     │      │     SYNC     │                 │
│   └──────────────┘  └──────────────┘      │              │                 │
│                                           └──────────────┘                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Storage Hierarchy

| Layer | Technology | Purpose | Persistence |
|-------|------------|---------|-------------|
| React State | useState/useReducer | UI state | Session only |
| Zustand Store | Zustand | App state | Memory + partial persist |
| React Query Cache | TanStack Query | Server state | Memory + cache |
| IndexedDB | Dexie.js | Local database | Persistent |
| Cache API | Service Worker | Static assets | Persistent |

---

## 3. SERVICE WORKER

### 3.1 Service Worker Configuration

```typescript
// public/sw.ts (TypeScript, compiled to sw.js)

/// <reference lib="es2020" />
/// <reference lib="webworker" />

const sw = self as ServiceWorkerGlobalScope;

// Cache names
const CACHE_NAMES = {
  static: 'grid-electric-static-v1',
  dynamic: 'grid-electric-dynamic-v1',
  images: 'grid-electric-images-v1',
};

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/login',
  '/dashboard',
  '/tickets',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// Install event - cache static assets
sw.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAMES.static).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  sw.skipWaiting();
});

// Activate event - clean old caches
sw.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !Object.values(CACHE_NAMES).includes(name))
          .map((name) => caches.delete(name))
      );
    })
  );
  sw.clients.claim();
});

// Fetch event - cache strategies
sw.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Strategy: Cache First for static assets
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, CACHE_NAMES.static));
    return;
  }

  // Strategy: Stale While Revalidate for API calls
  if (isAPIRequest(url)) {
    event.respondWith(staleWhileRevalidate(request, CACHE_NAMES.dynamic));
    return;
  }

  // Strategy: Cache First for images
  if (isImageRequest(request)) {
    event.respondWith(cacheFirst(request, CACHE_NAMES.images));
    return;
  }
});

// Cache strategies
async function cacheFirst(
  request: Request,
  cacheName: string
): Promise<Response> {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  const response = await fetch(request);
  cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(
  request: Request,
  cacheName: string
): Promise<Response> {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  // Fetch and update cache in background
  const fetchPromise = fetch(request).then((response) => {
    cache.put(request, response.clone());
    return response;
  });
  
  // Return cached version immediately if available
  if (cached) {
    return cached;
  }
  
  return fetchPromise;
}

// Background Sync
sw.addEventListener('sync', (event) => {
  if (event.tag === 'sync-tickets') {
    event.waitUntil(syncTickets());
  } else if (event.tag === 'sync-time-entries') {
    event.waitUntil(syncTimeEntries());
  } else if (event.tag === 'sync-assessments') {
    event.waitUntil(syncAssessments());
  } else if (event.tag === 'sync-expenses') {
    event.waitUntil(syncExpenses());
  } else if (event.tag === 'sync-photos') {
    event.waitUntil(syncPhotos());
  }
});

// Push notifications
sw.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  
  event.waitUntil(
    sw.registration.showNotification(data.title ?? 'Grid Electric', {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      data: data.payload,
      actions: data.actions,
    })
  );
});

// Notification click
sw.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const { notification } = event;
  const payload = notification.data;
  
  event.waitUntil(
    sw.clients.openWindow(payload?.url ?? '/dashboard')
  );
});

// Helper functions
function isStaticAsset(url: URL): boolean {
  return STATIC_ASSETS.includes(url.pathname) ||
    url.pathname.startsWith('/_next/') ||
    url.pathname.match(/\.(js|css|woff2?)$/);
}

function isAPIRequest(url: URL): boolean {
  return url.pathname.startsWith('/rest/v1/') ||
    url.pathname.startsWith('/auth/v1/');
}

function isImageRequest(request: Request): boolean {
  return request.destination === 'image';
}

// Sync functions (implement based on your needs)
async function syncTickets(): Promise<void> {
  // Implementation
}

async function syncTimeEntries(): Promise<void> {
  // Implementation
}

async function syncAssessments(): Promise<void> {
  // Implementation
}

async function syncExpenses(): Promise<void> {
  // Implementation
}

async function syncPhotos(): Promise<void> {
  // Implementation
}
```

### 3.2 Service Worker Registration

```typescript
// lib/sw/register.ts

export function registerServiceWorker(): void {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        
        console.log('SW registered:', registration.scope);
        
        // Request background sync permission
        if ('sync' in registration) {
          await registration.sync.register('sync-tickets');
        }
        
        // Request push notification permission
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(
              process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
            ),
          });
          
          // Send subscription to server
          await fetch('/api/push-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subscription),
          });
        }
      } catch (error) {
        console.error('SW registration failed:', error);
      }
    });
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}
```

---

## 4. INDEXEDDB WITH DEXIE.JS

### 4.1 Database Schema

```typescript
// lib/db/dexie.ts

import Dexie, { Table } from 'dexie';
import { 
  Ticket, 
  TimeEntry, 
  ExpenseReport, 
  ExpenseItem,
  DamageAssessment,
  MediaAsset,
  SyncQueueItem 
} from '@/types';

// Extended types for offline storage
interface OfflineTicket extends Ticket {
  syncStatus: 'SYNCED' | 'PENDING' | 'FAILED';
  lastModified: Date;
}

interface OfflineTimeEntry extends TimeEntry {
  syncStatus: 'SYNCED' | 'PENDING' | 'FAILED';
  lastModified: Date;
}

interface PendingPhoto {
  id: string;
  file: Blob;
  metadata: {
    entityType: string;
    entityId: string;
    photoType: string;
    capturedAt: Date;
    gpsLatitude?: number;
    gpsLongitude?: number;
  };
  retryCount: number;
  createdAt: Date;
}

class GridElectricDatabase extends Dexie {
  // Tables
  tickets!: Table<OfflineTicket>;
  timeEntries!: Table<OfflineTimeEntry>;
  expenseReports!: Table<ExpenseReport>;
  expenseItems!: Table<ExpenseItem>;
  assessments!: Table<DamageAssessment>;
  mediaAssets!: Table<MediaAsset>;
  syncQueue!: Table<SyncQueueItem>;
  pendingPhotos!: Table<PendingPhoto>;

  constructor() {
    super('GridElectricDB');
    
    this.version(1).stores({
      tickets: 'id, ticket_number, status, assigned_to, priority, scheduled_date, syncStatus, lastModified',
      timeEntries: 'id, contractor_id, ticket_id, clock_in_at, status, syncStatus, lastModified',
      expenseReports: 'id, contractor_id, report_period_start, status',
      expenseItems: 'id, expense_report_id, category, expense_date',
      assessments: 'id, ticket_id, contractor_id, assessed_at',
      mediaAssets: 'id, uploaded_by, entity_type, entity_id, upload_status',
      syncQueue: 'id, operation, table, entity_id, status, retry_count, created_at',
      pendingPhotos: 'id, retryCount, createdAt',
    });
  }
}

export const db = new GridElectricDatabase();

// Database operations
export async function saveTicketLocally(ticket: Ticket): Promise<void> {
  await db.tickets.put({
    ...ticket,
    syncStatus: 'SYNCED',
    lastModified: new Date(),
  });
}

export async function updateTicketLocally(
  id: string, 
  updates: Partial<Ticket>
): Promise<void> {
  await db.tickets.update(id, {
    ...updates,
    syncStatus: 'PENDING',
    lastModified: new Date(),
  });
  
  // Add to sync queue
  await db.syncQueue.add({
    id: crypto.randomUUID(),
    operation: 'UPDATE',
    table: 'tickets',
    entity_id: id,
    payload: updates,
    status: 'PENDING',
    retry_count: 0,
    created_at: new Date(),
  });
}

export async function getTicketsLocally(
  filters?: { status?: string; assignedTo?: string }
): Promise<OfflineTicket[]> {
  let query = db.tickets.toCollection();
  
  if (filters?.status) {
    query = query.filter((t) => t.status === filters.status);
  }
  
  if (filters?.assignedTo) {
    query = query.filter((t) => t.assigned_to === filters.assignedTo);
  }
  
  return query.sortBy('scheduled_date');
}

export async function queuePhotoUpload(
  file: Blob,
  metadata: PendingPhoto['metadata']
): Promise<string> {
  const id = crypto.randomUUID();
  
  await db.pendingPhotos.add({
    id,
    file,
    metadata,
    retryCount: 0,
    createdAt: new Date(),
  });
  
  // Register background sync
  if ('serviceWorker' in navigator && 'sync' in registration) {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register('sync-photos');
  }
  
  return id;
}

export async function getPendingSyncCount(): Promise<number> {
  return db.syncQueue.where('status').equals('PENDING').count();
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  return db.syncQueue
    .where('status')
    .equals('PENDING')
    .sortBy('created_at');
}
```

### 4.2 React Hook for Offline Data

```typescript
// hooks/useOfflineTickets.ts

import { useState, useEffect, useCallback } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { db, saveTicketLocally, updateTicketLocally, getTicketsLocally } from '@/lib/db/dexie';
import { supabase } from '@/lib/supabase/client';
import { Ticket } from '@/types';

interface UseOfflineTicketsReturn {
  tickets: Ticket[];
  isLoading: boolean;
  error: Error | null;
  updateTicket: (id: string, updates: Partial<Ticket>) => Promise<void>;
  refresh: () => Promise<void>;
  pendingCount: number;
}

export function useOfflineTickets(
  filters?: { status?: string; assignedTo?: string }
): UseOfflineTicketsReturn {
  const isOnline = useOnlineStatus();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  // Load tickets (from local first, then sync with server)
  const loadTickets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // First, load from local database
      const localTickets = await getTicketsLocally(filters);
      setTickets(localTickets);
      
      // If online, sync with server
      if (isOnline) {
        const { data: serverTickets, error: serverError } = await supabase
          .from('tickets')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (serverError) throw serverError;
        
        // Update local database with server data
        if (serverTickets) {
          await db.tickets.bulkPut(
            serverTickets.map((t) => ({
              ...t,
              syncStatus: 'SYNCED' as const,
              lastModified: new Date(),
            }))
          );
          
          // Update state with fresh data
          const freshTickets = await getTicketsLocally(filters);
          setTickets(freshTickets);
        }
      }
      
      // Update pending count
      const count = await db.syncQueue.where('status').equals('PENDING').count();
      setPendingCount(count);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [isOnline, filters]);

  // Update ticket (offline-capable)
  const updateTicket = useCallback(async (
    id: string, 
    updates: Partial<Ticket>
  ) => {
    // Optimistic update
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
    
    // Save to local database
    await updateTicketLocally(id, updates);
    
    // Update pending count
    const count = await db.syncQueue.where('status').equals('PENDING').count();
    setPendingCount(count);
    
    // If online, try to sync immediately
    if (isOnline) {
      try {
        const { error } = await supabase
          .from('tickets')
          .update(updates)
          .eq('id', id);
        
        if (error) throw error;
        
        // Mark as synced
        await db.tickets.update(id, {
          syncStatus: 'SYNCED',
          lastModified: new Date(),
        });
        
        // Remove from sync queue
        await db.syncQueue
          .where({ table: 'tickets', entity_id: id })
          .delete();
      } catch (err) {
        // Will retry on next sync
        console.error('Sync failed, queued for retry:', err);
      }
    }
    
    // Register background sync
    if ('serviceWorker' in navigator && 'sync' in registration) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-tickets');
    }
  }, [isOnline]);

  // Initial load
  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Subscribe to real-time updates when online
  useEffect(() => {
    if (!isOnline) return;
    
    const subscription = supabase
      .channel('tickets')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        (payload) => {
          // Update local cache
          if (payload.eventType === 'INSERT') {
            saveTicketLocally(payload.new as Ticket);
          } else if (payload.eventType === 'UPDATE') {
            saveTicketLocally(payload.new as Ticket);
          } else if (payload.eventType === 'DELETE') {
            db.tickets.delete(payload.old.id);
          }
          
          // Refresh list
          loadTickets();
        }
      )
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, [isOnline, loadTickets]);

  return {
    tickets,
    isLoading,
    error,
    updateTicket,
    refresh: loadTickets,
    pendingCount,
  };
}
```

---

## 5. BACKGROUND SYNC

### 5.1 Sync Manager

```typescript
// lib/sync/syncManager.ts

import { db } from '@/lib/db/dexie';
import { supabase } from '@/lib/supabase/client';
import { SyncQueueItem } from '@/types';

interface SyncResult {
  success: boolean;
  item: SyncQueueItem;
  error?: Error;
}

export class SyncManager {
  private isSyncing = false;
  private abortController: AbortController | null = null;

  async sync(): Promise<SyncResult[]> {
    if (this.isSyncing) {
      console.log('Sync already in progress');
      return [];
    }

    this.isSyncing = true;
    this.abortController = new AbortController();
    
    const results: SyncResult[] = [];
    
    try {
      // Get pending items
      const pendingItems = await db.syncQueue
        .where('status')
        .equals('PENDING')
        .sortBy('created_at');
      
      for (const item of pendingItems) {
        // Check if aborted
        if (this.abortController.signal.aborted) {
          break;
        }
        
        const result = await this.syncItem(item);
        results.push(result);
      }
      
      // Sync photos
      await this.syncPhotos();
      
    } finally {
      this.isSyncing = false;
      this.abortController = null;
    }
    
    return results;
  }

  private async syncItem(item: SyncQueueItem): Promise<SyncResult> {
    try {
      switch (item.table) {
        case 'tickets':
          await this.syncTicket(item);
          break;
        case 'time_entries':
          await this.syncTimeEntry(item);
          break;
        case 'damage_assessments':
          await this.syncAssessment(item);
          break;
        case 'expense_reports':
        case 'expense_items':
          await this.syncExpense(item);
          break;
        default:
          throw new Error(`Unknown table: ${item.table}`);
      }
      
      // Remove from queue on success
      await db.syncQueue.delete(item.id);
      
      return { success: true, item };
    } catch (error) {
      // Increment retry count
      await db.syncQueue.update(item.id, {
        retry_count: item.retry_count + 1,
        status: item.retry_count >= 3 ? 'FAILED' : 'PENDING',
      });
      
      return { success: false, item, error: error as Error };
    }
  }

  private async syncTicket(item: SyncQueueItem): Promise<void> {
    const { error } = await supabase
      .from('tickets')
      .update(item.payload)
      .eq('id', item.entity_id);
    
    if (error) throw error;
  }

  private async syncTimeEntry(item: SyncQueueItem): Promise<void> {
    if (item.operation === 'CREATE') {
      const { error } = await supabase
        .from('time_entries')
        .insert(item.payload);
      
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('time_entries')
        .update(item.payload)
        .eq('id', item.entity_id);
      
      if (error) throw error;
    }
  }

  private async syncAssessment(item: SyncQueueItem): Promise<void> {
    const { error } = await supabase
      .from('damage_assessments')
      .upsert(item.payload);
    
    if (error) throw error;
  }

  private async syncExpense(item: SyncQueueItem): Promise<void> {
    const { error } = await supabase
      .from(item.table)
      .upsert(item.payload);
    
    if (error) throw error;
  }

  private async syncPhotos(): Promise<void> {
    const pendingPhotos = await db.pendingPhotos.toArray();
    
    for (const photo of pendingPhotos) {
      try {
        // Upload to Supabase Storage
        const fileName = `${photo.metadata.entityType}/${photo.metadata.entityId}/${photo.id}.jpg`;
        
        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(fileName, photo.file, {
            contentType: 'image/jpeg',
          });
        
        if (uploadError) throw uploadError;
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('photos')
          .getPublicUrl(fileName);
        
        // Save media asset record
        await supabase.from('media_assets').insert({
          file_name: fileName,
          storage_bucket: 'photos',
          storage_path: fileName,
          public_url: publicUrl,
          entity_type: photo.metadata.entityType,
          entity_id: photo.metadata.entityId,
          file_type: 'PHOTO',
          captured_at: photo.metadata.capturedAt,
          gps_latitude: photo.metadata.gpsLatitude,
          gps_longitude: photo.metadata.gpsLongitude,
        });
        
        // Remove from pending
        await db.pendingPhotos.delete(photo.id);
      } catch (error) {
        // Increment retry count
        await db.pendingPhotos.update(photo.id, {
          retryCount: photo.retryCount + 1,
        });
        
        // If max retries reached, mark as failed
        if (photo.retryCount >= 3) {
          console.error('Photo sync failed after 3 retries:', photo.id);
        }
      }
    }
  }

  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }
}

export const syncManager = new SyncManager();
```

---

## 6. OPTIMISTIC UI

### 6.1 Optimistic Update Pattern

```typescript
// hooks/useOptimisticUpdate.ts

import { useState, useCallback } from 'react';
import { useOnlineStatus } from './useOnlineStatus';

interface UseOptimisticUpdateOptions<T> {
  onOptimisticUpdate: (item: T) => void;
  onServerUpdate: (item: T) => Promise<void>;
  onRollback: (item: T) => void;
  onError?: (error: Error, item: T) => void;
}

interface UseOptimisticUpdateReturn<T> {
  update: (item: T) => Promise<void>;
  isPending: boolean;
  error: Error | null;
}

export function useOptimisticUpdate<T>(
  options: UseOptimisticUpdateOptions<T>
): UseOptimisticUpdateReturn<T> {
  const isOnline = useOnlineStatus();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const update = useCallback(async (item: T) => {
    setError(null);
    
    // Always apply optimistic update
    options.onOptimisticUpdate(item);
    
    // If offline, queue for later
    if (!isOnline) {
      return;
    }
    
    // If online, try server update
    setIsPending(true);
    
    try {
      await options.onServerUpdate(item);
    } catch (err) {
      const error = err as Error;
      setError(error);
      
      // Rollback on error
      options.onRollback(item);
      
      // Call error handler if provided
      options.onError?.(error, item);
    } finally {
      setIsPending(false);
    }
  }, [isOnline, options]);

  return { update, isPending, error };
}

// Usage example
function TicketStatusButton({ ticket }: { ticket: Ticket }) {
  const queryClient = useQueryClient();
  
  const { update, isPending } = useOptimisticUpdate({
    onOptimisticUpdate: (newTicket) => {
      // Update cache immediately
      queryClient.setQueryData(
        ['tickets', ticket.id],
        newTicket
      );
    },
    onServerUpdate: async (newTicket) => {
      // Make API call
      await updateTicketStatus(newTicket.id, newTicket.status);
    },
    onRollback: (oldTicket) => {
      // Revert cache on error
      queryClient.setQueryData(
        ['tickets', ticket.id],
        oldTicket
      );
    },
  });

  const handleStatusChange = async (newStatus: string) => {
    await update({ ...ticket, status: newStatus });
  };

  return (
    <Button 
      onClick={() => handleStatusChange('ON_SITE')}
      disabled={isPending}
    >
      {isPending ? 'Updating...' : 'Mark On Site'}
    </Button>
  );
}
```

---

## 7. CONFLICT RESOLUTION

### 7.1 Conflict Detection Strategy

```typescript
// lib/sync/conflictResolver.ts

interface Conflict {
  entityId: string;
  table: string;
  localVersion: unknown;
  serverVersion: unknown;
  localTimestamp: Date;
  serverTimestamp: Date;
}

type ConflictResolution = 'LOCAL' | 'SERVER' | 'MERGE' | 'MANUAL';

export class ConflictResolver {
  // Detect conflicts based on timestamps
  detectConflict(
    local: { data: unknown; timestamp: Date; version: number },
    server: { data: unknown; timestamp: Date; version: number }
  ): boolean {
    // If server version is newer than local, potential conflict
    return server.version > local.version && server.timestamp > local.timestamp;
  }

  // Resolve conflict based on strategy
  resolve(
    conflict: Conflict,
    strategy: ConflictResolution
  ): unknown {
    switch (strategy) {
      case 'LOCAL':
        return conflict.localVersion;
      
      case 'SERVER':
        return conflict.serverVersion;
      
      case 'MERGE':
        return this.mergeVersions(conflict);
      
      case 'MANUAL':
        // Store conflict for manual resolution
        this.storeConflictForManualResolution(conflict);
        return null;
      
      default:
        // Default: last write wins (server)
        return conflict.serverVersion;
    }
  }

  private mergeVersions(conflict: Conflict): unknown {
    // Simple merge: prefer server for conflicting fields
    // Custom merge logic based on entity type
    const local = conflict.localVersion as Record<string, unknown>;
    const server = conflict.serverVersion as Record<string, unknown>;
    
    return {
      ...local,
      ...server,
      // Preserve local-only fields
      local_notes: local.notes,
    };
  }

  private storeConflictForManualResolution(conflict: Conflict): void {
    // Store in IndexedDB for UI to display
    db.conflicts.put({
      id: crypto.randomUUID(),
      entity_id: conflict.entityId,
      table: conflict.table,
      local_data: conflict.localVersion,
      server_data: conflict.serverVersion,
      detected_at: new Date(),
      resolved: false,
    });
  }
}

export const conflictResolver = new ConflictResolver();
```

---

## 8. IMPLEMENTATION CHECKLIST

### 8.1 PWA Requirements

- [ ] `manifest.json` with app metadata
- [ ] Service worker registration
- [ ] Icons (192×192, 512×512, maskable)
- [ ] Theme color and background color
- [ ] `apple-touch-icon` for iOS
- [ ] Works offline (Lighthouse audit)

### 8.2 Offline Features

- [ ] IndexedDB schema with Dexie.js
- [ ] Local data caching for tickets
- [ ] Local data caching for time entries
- [ ] Local data caching for assessments
- [ ] Local data caching for expenses
- [ ] Photo storage in IndexedDB
- [ ] Sync queue implementation
- [ ] Background sync registration
- [ ] Optimistic UI updates
- [ ] Conflict resolution UI

### 8.3 Sync Features

- [ ] Automatic sync when online
- [ ] Manual sync button
- [ ] Sync status indicator
- [ ] Pending items count
- [ ] Failed sync retry
- [ ] Photo upload queue
- [ ] Sync error handling
- [ ] Sync conflict detection

### 8.4 UI Components

- [ ] Offline banner
- [ ] Sync status badge
- [ ] Pending sync counter
- [ ] Queue management screen
- [ ] Conflict resolution modal
- [ ] Loading skeletons
- [ ] Error boundaries

---

**END OF OFFLINE-FIRST PWA STRATEGY**
