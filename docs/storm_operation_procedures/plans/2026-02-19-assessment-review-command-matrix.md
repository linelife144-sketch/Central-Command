# Assessment Review Command Matrix + Topbar Identity Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Completely redesign `/admin/assessment-review` into a unique, brand-consistent, high-clarity review workspace while preserving existing assessment-review data flow, validation rules, and schema compatibility.

## Implementation Status

- [x] Task 1: Add decision schema (validation-first)
- [x] Task 2: Build reusable decision slide-over component
- [x] Task 3: Refactor assessment review into command matrix layout
- [x] Task 4: Ensure schema compatibility with service parsing contract
- [x] Task 5: Page shell redesign for `/admin/assessment-review`
- [x] Task 6: Topbar identity cleanup (remove initials/avatar/button chrome)
- [x] Task 7: Add bottom `Account` section in sidebar (action home)
- [x] Task 8: Gold-border sharpness + motion polish scoped to assessment screen
- [ ] Task 9: End-to-end regression and acceptance sweep
- [ ] Task 10: Full verifier pass + final branch finishing workflow

## Notes

- No DB migrations were required.
- Existing service behavior and review-note compatibility (`[APPROVED]` / `[NEEDS_REWORK]`) were preserved.
- Decisions no longer use `window.prompt`; they now use a validated slide-over workflow.
