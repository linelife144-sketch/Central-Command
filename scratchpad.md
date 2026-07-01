# 📝 Developer & Agent Scratchpad

Use this scratchpad to organize your work during development sessions. You can write checklists, design notes, context snapshots, and debug logs here to maintain continuity across runs.

---

## 🚀 Current Session Goal

Implement the core mapping and GPS tracking foundations required for contractor dispatching and status workflow verification.

- **Target Phase/Milestone:** Phase 2 / Week 6 (GPS Workflow & Maps)
- **Active Task:** Map Integration & GPS Workflows

---

## 📋 Task Checklist

### 1. Map Integration (Task 6.1)

- [ ] Integrate Mapbox GL into the application
- [ ] Create `MapView` component for layout display
- [ ] Create `TicketMarkers` to plot tickets on the map
- [ ] Create `RouteOverlay` to draw routes from OSRM/Mapbox
- [ ] Create `GeofenceCircle` to visualize the 500m geofence area

### 2. GPS Workflow (Task 6.2)

- [ ] Implement geofencing check logic (verify distance < 500m)
- [ ] Create custom `useGeolocation` / GPS validation hook
- [ ] Implement route optimization logic (using OSRM or Mapbox)
- [ ] Create route view UI for subcontractors

### 3. Status Update Flow (Task 6.3)

- [ ] Implement GPS validation check at each status transition
- [ ] Implement the 3-status subcontractor mobile map view flow (In Route → On Site → Complete)
- [ ] Create mobile map view interface

---

## 🧠 Technical Design & Logic Notes

### 1. Geolocation Hook Plan (`hooks/useGeolocation.ts`)

- Use browser's `navigator.geolocation` API with `enableHighAccuracy: true`.
- Compare current coordinate to ticket destination coordinate using Haversine formula.
- Return `isWithinGeofence: boolean`, `distance: number`, and `accuracy: number`.
- Block status update if `accuracy > 100` (threshold) or `distance > 500` (geofence).

### 2. Mapbox Component Structure

- Render wrapper `div` with Mapbox container ref.
- Fetch Mapbox token from environment: `process.env.NEXT_PUBLIC_MAPBOX_TOKEN`.
- Fallback gracefully if token is missing or if offline (use offline maps strategy or fallback screen).

---

## 🔍 Debugging & Troubleshooting Log

| Issue / Error | Cause | Resolution |
|---|---|---|
| | | |

---

## 📌 Context Snapshot (For Next Run)

- **Where things stand:** Project infrastructure is set up, Auth/Onboarding/Admin/Tickets completed. Ready to start GPS & Maps integration (Week 6).
- **Files worked on:**
  - `README.md` (Updated with agent instructions)
  - `scratchpad.md` (Created and populated)
  - `.cursorrules` (Created for IDE agents)
  - `AGENTS.md` (Synced status tracking)
- **Next immediate action:** Begin Mapbox GL package integration or create mapping UI component placeholders.

---
