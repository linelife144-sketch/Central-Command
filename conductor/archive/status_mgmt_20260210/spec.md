# Specification: Ticket Status Management System (Task 5.3)

## Overview
Implement a robust, role-aware status management system for tickets. This includes a context-aware action component (`StatusUpdater`), a comprehensive status history timeline, and the underlying state machine logic to ensure tickets follow the defined lifecycle.

## Functional Requirements

### 1. Context-Aware Status Updater
- **Role-Based Visibility:**
    - **Subcontractors:** View "Field Actions" (e.g., Start Route, Mark On Site, Mark Complete).
    - **Admins:** View "Management Actions" (e.g., Approve, Request Rework, Close, Archive).
- **Logical Flow:** Buttons only appear if the transition is valid from the current state (e.g., "Mark On Site" only shows if status is "In Route").
- **Confirmation Modals:** Trigger a modal for high-impact or negative transitions.

### 2. Status History & Audit Trail
- **Timeline Component:** A vertical list showing the chronological history of status changes.
- **Data Points:**
    - New Status (using `StatusBadge`).
    - Changed By (User Name).
    - Timestamp (Relative and absolute).
    - Reason for Change (if provided).

### 3. Validation & Business Logic
- **Mandatory Reasons:** Moving a ticket to `REJECTED`, `NEEDS_REWORK`, or `CLOSED` requires a text explanation.
- **State Machine Integrity:** Prevent invalid status jumps (e.g., jumping from `ASSIGNED` directly to `COMPLETE`).
- **Persistence:** All changes must update both the `tickets.status` field and append a new record to the `ticket_status_history` table in Supabase.

## User Interface (UX)
- **Primary Actions:** Large, high-contrast buttons for field workers.
- **Safety First:** "Danger" actions (Reject/Archive) styled with `destructive` variants.
- **Feedback:** Use `sonner` toasts to confirm successful updates or display validation errors.

## Acceptance Criteria
- [ ] Subcontractors can successfully move a ticket from `ASSIGNED` to `COMPLETE` using one-tap action buttons.
- [ ] Admins can approve or request rework on tickets in the `PENDING_REVIEW` state.
- [ ] Attempting to reject a ticket without a reason shows a validation error.
- [ ] The status history timeline accurately reflects all previous transitions.
- [ ] Only authorized roles can see their respective action buttons.

## Out of Scope
- GPS/Geofence validation (handled in Task 6.2).
- Photo requirements for completion (handled in Task 7.3).
- Automated email/push notifications (handled in Phase 4).