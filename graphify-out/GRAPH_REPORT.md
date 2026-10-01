# Graph Report - Central Command  (2026-10-01)

## Corpus Check
- 354 files · ~127,587 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: (none) 10, .log 1, .csv 1)

## Summary
- 2209 nodes · 5980 edges · 143 communities (93 shown, 50 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 50 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b2f8ef81`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- SelectContent
- cn
- react
- Types Components
- PhotoCapture.tsx
- MapView.tsx
- tickets/[id]/page.tsx
- TicketFormRenderer.tsx
- Sidebar.tsx
- contractorService.ts
- Dexie Components
- ticketService.ts
- Card
- Storm First Workflow Schema
- dropdown-menu.tsx
- lucide-react
- dashboardReportingService.ts
- package.json
- Application Package Dependencies
- StatusUpdater.tsx
- User Provisioning
- ocr-extract/route.ts
- Storm Sop Workflow Tables Schema
- expenseSubmissionService.ts
- app/layout.tsx
- templates/index.ts
- AssessmentReviewList.tsx
- assessmentReviewService.ts
- Photo Storage Service
- ticket-new-client-page.tsx
- createLocal
- vitest
- ExpenseReviewList.tsx
- SyncProvider.tsx
- Application Package Dependencies
- types/index.ts
- Application Package Dependencies
- Verify Grid2 Schema
- buildReportExportArtifact
- expenseProcessingService.ts
- Assessment Catalog Service
- assessmentReviewService.test.ts
- Photo Upload Queue
- ActiveTimer.tsx
- Time Entry Service
- timeEntryManagementService.ts
- Components Components
- assessmentSubmissionService.ts
- Tsconfig Components
- appConfig.ts
- Time Expense Tables Schema
- useNavigationSignals.ts
- expenseProcessing.ts
- Storm Contractor Auth Alignment Schema
- AuthProvider.tsx
- stormEventService.ts
- AssessmentForm.tsx
- Time Entry Management Service
- Core Tables Schema
- assessmentPhotos.ts
- Button
- validators.ts
- utilityClients.ts
- generate-utility-config.cjs
- Sw Components
- TimeEntryList.tsx
- ExpenseForm.tsx
- buildDashboardReport
- Ticket Templates Ocr Scaffold Schema
- Add Storm Scope To Financial
- Seed Via Api
- Media Audit Tables Schema
- Storm Event Utility Template Preload
- Sw Components
- Receipt Ocr Service
- createDashboardReportingService
- @tanstack/react-query
- Storm Event Sop Master Codes
- Ticket Tables Schema
- Thumbnail Components
- Create Storm Events Root Workflow
- Triggers Schema
- PriorityLevel
- SafetyChecklist.tsx
- contractorService.test.ts
- Test Connection
- Seed Db
- Assessment Tables Schema
- contractor/map/page.tsx
- Navigation Config
- routeOptimizationService.ts
- Add Ceo Role And Lock
- Financial Tables Schema
- Test Supabase Connection
- Storm Event Code Trigger Schema
- Ticket Assignment Picker Schema
- Expense Submission Service
- Fix Profiles Policy Recursion Schema
- Eslint Components
- Allow Two Super Admins And
- Add Ceo Role And Promote
- Postcss Components

## God Nodes (most connected - your core abstractions)
1. `cn()` - 134 edges
2. `Button()` - 111 edges
3. `react` - 98 edges
4. `Card()` - 83 edges
5. `CardContent()` - 82 edges
6. `vitest` - 68 edges
7. `CardHeader()` - 64 edges
8. `CardTitle()` - 62 edges
9. `lucide-react` - 58 edges
10. `next` - 53 edges

## Surprising Connections (you probably didn't know these)
- `expense_policies` --references--> `profiles`  [EXTRACTED]
  sql/04_time_expense_tables.sql → sql/02_core_tables.sql
- `notification_logs` --references--> `profiles`  [EXTRACTED]
  sql/07_media_audit_tables.sql → sql/02_core_tables.sql
- `update_profiles_updated_at` --triggers--> `profiles`  [EXTRACTED]
  sql/09_triggers.sql → sql/02_core_tables.sql
- `tax_1099_tracking` --references--> `contractors`  [EXTRACTED]
  sql/06_financial_tables.sql → sql/02_core_tables.sql
- `update_contractors_updated_at` --triggers--> `contractors`  [EXTRACTED]
  sql/09_triggers.sql → sql/02_core_tables.sql

## Import Cycles
- None detected.

## Communities (143 total, 50 thin omitted)

### Community 0 - "SelectContent"
Cohesion: 0.14
Nodes (41): columns, ContractorsListPage(), exportCsv(), statusOf(), CreateStormEventPage(), STATE_NAMES, STORM_EVENT_STATUS_OPTIONS, UTILITY_CLIENT_OPTIONS (+33 more)

### Community 1 - "cn"
Cohesion: 0.09
Nodes (38): radix-ui, AdminReportsPage(), DataTable(), DataTableProps, ProtectedRoute(), ProtectedRouteProps, amountToPercent(), buildDefaultDates() (+30 more)

### Community 2 - "react"
Cohesion: 0.12
Nodes (31): @hookform/resolvers, react, react-hook-form, zod, toEquipmentLabel(), ForgotPasswordForm(), ForgotPasswordFormData, forgotPasswordSchema (+23 more)

### Community 3 - "Types Components"
Cohesion: 0.07
Nodes (36): TicketFormRendererProps, CreateUtilityTicketInput, CENTERPOINT_TEMPLATE, centerpointPayloadSchema, DUKE_TEMPLATE, dukePayloadSchema, ENTERGY_TEMPLATE, entergyPayloadSchema (+28 more)

### Community 5 - "PhotoCapture.tsx"
Cohesion: 0.22
Nodes (12): class-variance-authority, ALL_PHOTO_TYPES, formatPhotoType(), PhotoCapture(), PhotoGallery(), renderGpsStatus(), TicketPriorityBadgeProps, Badge() (+4 more)

### Community 6 - "MapView.tsx"
Cohesion: 0.11
Nodes (34): mapbox-gl, buildGeofenceFeatureCollection(), buildGeofencePolygon(), GeofenceCircle(), GeofenceCircleProps, GeofenceFeatureCollection, isRenderableGeofence(), removeGeofenceLayers() (+26 more)

### Community 7 - "tickets/[id]/page.tsx"
Cohesion: 0.08
Nodes (35): date-fns, ContractorApprovalPage(), mockPending, PendingContractor, TicketDetailPage(), TicketDetailSkeleton(), TicketsPage(), dotStyles (+27 more)

### Community 8 - "TicketFormRenderer.tsx"
Cohesion: 0.14
Nodes (20): TicketForm(), ticketFormSchema, TicketFormValues, applyFieldFormatting(), getFieldDefault(), StormHeaderSummary, TicketFormRenderer(), toFieldName() (+12 more)

### Community 9 - "Sidebar.tsx"
Cohesion: 0.20
Nodes (13): adminNavItems, contractorNavItems, Sidebar(), SidebarProps, ScrollArea(), ScrollBar(), Sheet(), SheetContent() (+5 more)

### Community 10 - "contractorService.ts"
Cohesion: 0.10
Nodes (23): onSubmit(), AssignableContractor, buildActiveTicketCountByContractor(), ContractorDetail, ContractorListFilters, ContractorListItem, fetchProfilesByIds(), fetchTicketRows() (+15 more)

### Community 11 - "Dexie Components"
Cohesion: 0.11
Nodes (32): addToSyncQueue(), CachedTicketFilters, cacheTicket(), cacheTickets(), createId(), createSyncConflict(), deriveSyncStatus(), getCachedTickets() (+24 more)

### Community 12 - "ticketService.ts"
Cohesion: 0.12
Nodes (22): StormPage(), StormWorkspace(), StatusUpdateFlowProps, StatusUpdaterProps, contractorService, dashboardTicketService, StormEventSummary, StormRosterMember (+14 more)

### Community 13 - "Card"
Cohesion: 0.13
Nodes (35): nextConfig, next, ContractorDetailPage(), ContractorInvitePage(), AdminDashboardPage(), ForgotPasswordPage(), metadata, LoginPage() (+27 more)

### Community 14 - "Storm First Workflow Schema"
Cohesion: 0.07
Nodes (16): expense_item_storm_scope, invoice_line_storm_scope, invoice_storm_immutable, public.assign_contractor_to_storm(), public.create_storm_ticket(), public.enforce_expense_item_storm(), public.enforce_storm_payload(), public.enforce_ticket_roster_assignment() (+8 more)

### Community 15 - "dropdown-menu.tsx"
Cohesion: 0.10
Nodes (25): AdminLayout(), ContractorLayout(), StormLayout(), AppShell(), AppShellProps, adminNavItems, BottomNav(), BottomNavProps (+17 more)

### Community 16 - "lucide-react"
Cohesion: 0.20
Nodes (18): lucide-react, AdminAccountPage(), AdminAssessmentReviewPage(), AdminExpenseReviewPage(), StormEventsPage(), ContractorAccountPage(), AssessmentCreateInner(), AssessmentCreateSkeleton() (+10 more)

### Community 17 - "dashboardReportingService.ts"
Cohesion: 0.08
Nodes (24): CLOSED_TICKET_STATUSES, CountEqClient, CountInClient, CountIsNotClient, DashboardExpenseReportRow, DashboardMetricsBuildInput, DashboardReportBuildInput, DashboardReportContractorRow (+16 more)

### Community 18 - "package.json"
Cohesion: 0.06
Nodes (30): name, private, version, clsx, crypto-js, date-fns-tz, dexie, dexie-react-hooks (+22 more)

### Community 19 - "Application Package Dependencies"
Cohesion: 0.06
Nodes (33): dependencies, browser-image-compression, class-variance-authority, clsx, cmdk, crypto-js, date-fns, date-fns-tz (+25 more)

### Community 20 - "StatusUpdater.tsx"
Cohesion: 0.14
Nodes (28): cmdk, formatPayloadPreview(), formatTimestamp(), SyncStatus(), statusButtonConfig, StatusUpdater(), mocks, TicketAssign() (+20 more)

### Community 21 - "User Provisioning"
Cohesion: 0.09
Nodes (28): AuthUserSummary, AuthUserUpsertInput, ContractorUpsertInput, ExistingSuperAdmin, isRoleAliasWarning(), normalizeEmail(), normalizeHeader(), normalizeRole() (+20 more)

### Community 22 - "ocr-extract/route.ts"
Cohesion: 0.08
Nodes (34): @supabase/ssr, GET(), normalizeProfile(), PATCH(), ProfileRow, resolveAuthenticatedUser(), remote, extractError() (+26 more)

### Community 23 - "Storm Sop Workflow Tables Schema"
Cohesion: 0.13
Nodes (26): idx_auth_logs_authorized_at, idx_auth_logs_storm_event, idx_logistics_phase_category, idx_logistics_status, idx_logistics_storm_event, idx_phase_steps_phase_status, idx_phase_steps_storm_event, idx_roster_members_contractor (+18 more)

### Community 24 - "expenseSubmissionService.ts"
Cohesion: 0.12
Nodes (29): LocalExpenseItem, LocalExpenseReport, createRemote(), defaultDependencies, ExpenseStatusFilter, ExpenseSubmissionDependencies, ExpenseSyncStatus, fetchContractorNames() (+21 more)

### Community 25 - "app/layout.tsx"
Cohesion: 0.10
Nodes (25): agentation, next-themes, metadata, RootLayout(), OfflineBanner(), readOnlineStatus(), shouldRenderOfflineBanner(), Agentation (+17 more)

### Community 26 - "templates/index.ts"
Cohesion: 0.24
Nodes (9): confidence(), extractEntergyFields(), extractMatch(), EXTRACTORS, stubUtilityExtractor(), TicketOcrExtractionResult, TicketOcrExtractor, TicketOcrRequest (+1 more)

### Community 27 - "AssessmentReviewList.tsx"
Cohesion: 0.13
Nodes (19): AssessmentDecisionSheetProps, ASSESSMENT_REVIEW_FILTER_CONTROL_CLASS, ASSESSMENT_REVIEW_LAYOUT_MODE, AssessmentReviewList(), AssessmentReviewListProps, DecisionFilterValue, DecisionSheetState, parseError() (+11 more)

### Community 28 - "assessmentReviewService.ts"
Cohesion: 0.12
Nodes (26): applyFilters(), AssessmentReviewDependencies, assessmentReviewService, AssessmentReviewState, defaultDependencies, fetchContractorNames(), fetchEquipmentCounts(), fetchTicketNumbers() (+18 more)

### Community 29 - "Photo Storage Service"
Cohesion: 0.11
Nodes (22): AuthClient, buildPhotoStoragePath(), ContractorsTableClient, getDefaultClient(), getFileExtension(), MediaAssetsTableClient, PHOTO_STORAGE_AUTH_ERROR, PHOTO_STORAGE_BUCKET (+14 more)

### Community 30 - "ticket-new-client-page.tsx"
Cohesion: 0.17
Nodes (15): TicketNewPage(), TicketNewPageProps, TicketNewClientPage(), TicketNewClientPageProps, notifyTicketsChanged(), detectTicketOcrSourceType(), getNormalizedExtension(), TICKET_OCR_ACCEPT_ATTRIBUTE (+7 more)

### Community 31 - "createLocal"
Cohesion: 0.28
Nodes (9): createId(), createLocal(), getExpenseMonthPeriod(), getOrCreateDraftReport(), normalizeExpenseDate(), processCreateInput(), resolveReceiptOcrText(), toRoundedAmount() (+1 more)

### Community 32 - "vitest"
Cohesion: 0.17
Nodes (18): vitest, TicketsLayout(), canPerformManagementAction(), getManagementActionForPath(), ManagementAction, normalizePath(), getPortalRole(), isAdminPortalPath() (+10 more)

### Community 33 - "ExpenseReviewList.tsx"
Cohesion: 0.11
Nodes (26): Column, ExpenseList(), ExpenseListProps, ExpenseStatusFilter, parseError(), toCategoryLabel(), toStatusVariant(), EXPENSE_REVIEW_FILTER_CONTROL_CLASS (+18 more)

### Community 34 - "SyncProvider.tsx"
Cohesion: 0.13
Nodes (18): readOnlineStatus(), SyncContext, SyncContextValue, SyncProvider(), SyncState, ConflictResolutionStrategy, createSyncConflictFromQueueItem(), db (+10 more)

### Community 35 - "Application Package Dependencies"
Cohesion: 0.08
Nodes (24): scripts, build, clean:next, dev, dev:fresh, lint, prebuild, predev (+16 more)

### Community 36 - "types/index.ts"
Cohesion: 0.08
Nodes (27): DashboardTicketRow, getNextPossibleStatuses(), isValidTransition(), FIELD_STATUS_TRANSITIONS, FieldStatusTransition, getFieldStatusTransition(), isFieldStatusFlowStep(), CapturedPhoto (+19 more)

### Community 37 - "Application Package Dependencies"
Cohesion: 0.09
Nodes (23): devDependencies, agentation, dotenv, eslint, eslint-config-next, jsdom, @playwright/test, shadcn (+15 more)

### Community 38 - "Verify Grid2 Schema"
Cohesion: 0.16
Nodes (21): buildSqlRunner(), CC_CORE_TABLES, checkCeoRole(), CheckContext, checkContractorNaming(), checkCoreTables(), checkGrid2Tables(), checkRlsEnabled() (+13 more)

### Community 39 - "buildReportExportArtifact"
Cohesion: 0.22
Nodes (8): buildDashboardMetrics(), buildReportExportArtifact(), buildSimplePdf(), escapeCsvValue(), escapePdfText(), formatDatePart(), rowsToCsv(), rowsToTabSeparated()

### Community 40 - "expenseProcessingService.ts"
Cohesion: 0.13
Nodes (17): ExpenseFormProps, createExpenseProcessingService(), defaultDependencies, ExpenseProcessingDependencies, expenseProcessingService, ExpenseReviewDecision, ExpenseReviewFilters, mapReviewedReport() (+9 more)

### Community 41 - "Assessment Catalog Service"
Cohesion: 0.13
Nodes (16): EquipmentSelectProps, WireSizeSelectProps, AssessmentCatalogDependencies, createAssessmentCatalogService(), defaultDependencies, EquipmentTypeOption, fetchEquipmentTypes(), fetchWireSizes() (+8 more)

### Community 42 - "assessmentReviewService.test.ts"
Cohesion: 0.29
Nodes (4): composeReviewNotes(), createAssessmentReviewService(), ReviewedAssessment, reviewRemoteAssessment()

### Community 43 - "Photo Upload Queue"
Cohesion: 0.13
Nodes (15): PhotoCaptureProps, PhotoGalleryProps, getPendingPhotos(), LocalPhoto, AssessmentPhotoMetadataInput, createPhotoUploadQueue(), defaultDependencies, inferExtensionFromMimeType() (+7 more)

### Community 44 - "ActiveTimer.tsx"
Cohesion: 0.25
Nodes (16): ActiveTimer(), ActiveTimerProps, APP_CONFIG, formatDuration(), calculateBillableAmount(), calculateBillableMinutes(), calculateElapsedMinutes(), calculateElapsedSeconds() (+8 more)

### Community 45 - "Time Entry Service"
Cohesion: 0.13
Nodes (18): LocalSyncStatus, buildClockInEntry(), ClockLocation, createEntryId(), createTimeEntryService(), defaultDependencies, fetchRemoteActiveEntry(), insertRemoteEntry() (+10 more)

### Community 46 - "timeEntryManagementService.ts"
Cohesion: 0.15
Nodes (17): defaultDependencies, entryMatchesFilters(), fetchContractorNames(), fetchRemoteEntries(), fetchTicketNumbers(), getLocalEntries(), mapLocalEntryToListItem(), mapRemoteRowToTimeEntry() (+9 more)

### Community 47 - "Components Components"
Cohesion: 0.10
Nodes (19): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+11 more)

### Community 48 - "assessmentSubmissionService.ts"
Cohesion: 0.17
Nodes (18): LocalAssessment, AssessmentEquipmentInput, composeEquipmentDescription(), createId(), createLocalAssessment(), createRemoteAssessment(), defaultDependencies, mapLocalAssessment() (+10 more)

### Community 49 - "Tsconfig Components"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 50 - "appConfig.ts"
Cohesion: 0.13
Nodes (15): WORK_TYPE_OPTIONS, WorkTypeOption, WorkTypeSelectorProps, EQUIPMENT_CONDITIONS, EXPENSE_CATEGORIES, EXPENSE_STATUS, INVOICE_STATUS, NOTIFICATION_TYPES (+7 more)

### Community 51 - "Time Expense Tables Schema"
Cohesion: 0.19
Nodes (17): expense_items, expense_policies, expense_reports, idx_expense_item_category, idx_expense_item_date, idx_expense_item_report, idx_expense_report_contractor, idx_expense_report_period (+9 more)

### Community 52 - "useNavigationSignals.ts"
Cohesion: 0.19
Nodes (17): SyncSnapshot, buildAdminRoleSignalCounts(), buildContractorRoleSignalCounts(), buildNavigationSignals(), clampCount(), loadContractorTicketsByAssignee(), loadRoleSignalCounts(), LoadRoleSignalCountsOptions (+9 more)

### Community 53 - "expenseProcessing.ts"
Cohesion: 0.20
Nodes (16): ProcessedCreateInput, calculateMileageExpense(), ExpenseDuplicateCandidate, ExpensePolicyValidationInput, ExpensePolicyValidationResult, extractLargestCurrencyAmount(), hasDuplicateExpense(), MileageCalculationInput (+8 more)

### Community 54 - "Storm Contractor Auth Alignment Schema"
Cohesion: 0.12
Nodes (5): private.active_profile_role(), protect_contractor_eligibility, protect_profile_authorization, provision_contractor_auth_profile, sync_contractor_managed_role

### Community 55 - "AuthProvider.tsx"
Cohesion: 0.14
Nodes (13): @testing-library/react, zustand, AuthContext, AuthContextType, DEV_BYPASS_AUTH, DEV_MOCK_USER, PUBLIC_ROUTES, mocks (+5 more)

### Community 56 - "stormEventService.ts"
Cohesion: 0.08
Nodes (21): remote, UtilityTicketDetails(), CLOSED_TICKET_STATUSES, CreateStormEventInput, mapStormEventRow(), normalizeStormEventStatus(), normalizeUtilityClientValue(), RemoteStormEventRow (+13 more)

### Community 57 - "AssessmentForm.tsx"
Cohesion: 0.22
Nodes (15): AssessmentForm(), AssessmentFormProps, parseOptionalNumber(), toHumanPhotoType(), validateAssessmentDraft(), createAssessmentDraftId(), createDefaultDamageClassification(), createDefaultSafetyObservations() (+7 more)

### Community 58 - "Time Entry Management Service"
Cohesion: 0.14
Nodes (11): TimeEntryCardProps, LocalTimeEntry, SyncQueueOperation, createTimeEntryManagementService(), TimeEntryListItem, TimeEntryManagementDependencies, timeEntryManagementService, ClockOutRequest (+3 more)

### Community 59 - "Core Tables Schema"
Cohesion: 0.23
Nodes (12): contractor_banking, contractor_rates, contractors, idx_contractors_eligible, idx_contractors_profile, idx_contractors_status, idx_profiles_active, idx_profiles_email (+4 more)

### Community 60 - "assessmentPhotos.ts"
Cohesion: 0.06
Nodes (43): browser-image-compression, exifreader, assertPhotoMimeTypeAllowed(), buildPhotoPreviewUrl(), countPhotosByType(), DEFAULT_REQUIRED_PHOTO_TYPES, PHOTO_MIME_TYPES, prepareCapturedPhoto() (+35 more)

### Community 61 - "Button"
Cohesion: 0.12
Nodes (20): react-day-picker, AdminError(), AdminErrorProps, AuthConfirmInner(), AuthConfirmPage(), ConfirmSkeleton(), Status, ContractorError() (+12 more)

### Community 62 - "validators.ts"
Cohesion: 0.10
Nodes (24): GPSValidationState, GPSValidationStatus, UseGPSValidationOptions, GPSWorkflowReading, GPSWorkflowTarget, GPSWorkflowValidationResult, validateGPSWorkflow(), assessmentSchema (+16 more)

### Community 64 - "generate-utility-config.cjs"
Cohesion: 0.10
Nodes (17): cleanNextDuplicates(), CleanResult, TARGET_DIRECTORIES, cache, { createRequire }, fs, json(), load() (+9 more)

### Community 65 - "Sw Components"
Cohesion: 0.13
Nodes (4): CACHE_NAMES, STATIC_ASSETS, sw, SyncEvent

### Community 66 - "TimeEntryList.tsx"
Cohesion: 0.15
Nodes (17): AdminTimeReviewPage(), isGpsReadyForClockAction(), TimeClock(), WORK_TYPE_DEFAULT_RATES, getTimeReviewLayoutMode(), parseError(), ReviewDecision, StatusFilterValue (+9 more)

### Community 68 - "ExpenseForm.tsx"
Cohesion: 0.24
Nodes (11): createInitialDraft(), ExpenseForm(), mapTicketsToOptions(), parseOptionalNumber(), toDateInputValue(), ExpenseItemDraft, ExpenseTicketOption, ACCEPTED_RECEIPT_TYPES (+3 more)

### Community 69 - "buildDashboardReport"
Cohesion: 0.22
Nodes (9): buildDashboardReport(), getBucketLabel(), getBuckets(), getBucketStart(), normalizeNumber(), parseDateOrNull(), resolveContractorName(), roundCurrency() (+1 more)

### Community 72 - "Ticket Templates Ocr Scaffold Schema"
Cohesion: 0.26
Nodes (10): idx_ticket_attachments_storm_event, idx_ticket_attachments_ticket_id, idx_ticket_extraction_sessions_status, idx_ticket_extraction_sessions_storm_event, idx_ticket_payloads_payload_gin, public.enforce_ticket_storm_utility_match(), public.ticket_attachments, public.ticket_extraction_sessions (+2 more)

### Community 73 - "Add Storm Scope To Financial"
Cohesion: 0.20
Nodes (6): idx_contractor_invoices_storm_event_id, idx_expense_reports_storm_event_id, idx_time_entries_storm_event_id, tr_enforce_expense_report_storm_scope, tr_enforce_invoice_storm_scope, tr_enforce_time_entry_storm_scope

### Community 74 - "Seed Via Api"
Cohesion: 0.15
Nodes (7): @supabase/supabase-js, {createClient}, supabase, { createClient }, supabase, admin, anonymous

### Community 75 - "Media Audit Tables Schema"
Cohesion: 0.26
Nodes (12): audit_logs, idx_audit_action, idx_audit_created, idx_audit_entity, idx_audit_user, idx_media_entity, idx_media_uploader, idx_sync_status (+4 more)

### Community 76 - "Storm Event Utility Template Preload"
Cohesion: 0.21
Nodes (7): idx_storm_events_ticket_template_key, idx_ticket_templates_utility_client, public.set_storm_event_ticket_template_key(), public.ticket_templates, tr_inherit_ticket_template_key, tr_set_storm_event_ticket_template_key, ux_ticket_templates_one_default_per_utility

### Community 77 - "Sw Components"
Cohesion: 0.17
Nodes (3): BACKGROUND_SYNC_TAG_TO_MESSAGE, CACHE_NAMES, STATIC_ASSETS

### Community 78 - "Receipt Ocr Service"
Cohesion: 0.20
Nodes (9): tesseract.js, createReceiptOcrService(), defaultDependencies, defaultRecognize(), loadRecognizer(), OcrRecognitionResult, OcrRecognizer, ReceiptOcrDependencies (+1 more)

### Community 80 - "createDashboardReportingService"
Cohesion: 0.20
Nodes (10): createDashboardReportingService(), fetchAllTickets(), fetchContractorNames(), fetchPendingAssessments(), fetchPendingExpenseReports(), fetchPendingTimeEntries(), fetchReportExpenseReports(), fetchReportTickets() (+2 more)

### Community 82 - "Storm Event Sop Master Codes"
Cohesion: 0.27
Nodes (9): idx_customers_active, idx_storm_events_city_code, idx_storm_events_customer_id, idx_storm_events_event_date, idx_storm_events_utility_id, idx_utilities_active, idx_utilities_client_key, public.customers (+1 more)

### Community 83 - "Ticket Tables Schema"
Cohesion: 0.35
Nodes (10): idx_status_history_changed, idx_status_history_ticket, idx_tickets_assigned, idx_tickets_client, idx_tickets_coordinates, idx_tickets_priority, idx_tickets_scheduled, idx_tickets_status (+2 more)

### Community 84 - "Thumbnail Components"
Cohesion: 0.27
Nodes (9): generatePreview(), buildThumbnailFile(), calculateThumbnailDimensions(), fallbackResult(), generateImageThumbnail(), loadImageBitmap(), ThumbnailDimensions, ThumbnailGenerationResult (+1 more)

### Community 88 - "Create Storm Events Root Workflow"
Cohesion: 0.29
Nodes (7): idx_storm_events_created_at, idx_storm_events_event_code, idx_storm_events_status, idx_storm_events_utility_client, idx_tickets_storm_event, public.storm_events, update_storm_events_updated_at

### Community 90 - "Triggers Schema"
Cohesion: 0.20
Nodes (6): ticket_number_trigger, ticket_status_change_trigger, update_contractors_updated_at, update_profiles_updated_at, update_tickets_updated_at, update_time_entries_updated_at

### Community 91 - "PriorityLevel"
Cohesion: 0.27
Nodes (10): DamageClassificationDraft, DamageClassificationProps, TicketFiltersState, AssessmentReviewFilters, AssessmentReviewListItem, AssessmentDamageClassificationInput, RemoteDamageAssessmentInsert, PriorityLevel (+2 more)

### Community 92 - "SafetyChecklist.tsx"
Cohesion: 0.19
Nodes (9): SAFETY_FIELDS, SafetyChecklistProps, SafetyFieldConfig, updateField(), CreateAssessmentInput, createAssessmentSubmissionService(), RemoteDamageAssessmentRow, SAFETY_OBSERVATIONS (+1 more)

### Community 96 - "Test Connection"
Cohesion: 0.29
Nodes (4): dotenv, __dirname, __filename, supabase

### Community 97 - "Seed Db"
Cohesion: 0.29
Nodes (3): { createClient }, path, supabase

### Community 99 - "Assessment Tables Schema"
Cohesion: 0.39
Nodes (7): damage_assessments, equipment_assessments, equipment_types, hazard_categories, idx_assessment_contractor, idx_assessment_ticket, wire_sizes

### Community 100 - "contractor/map/page.tsx"
Cohesion: 0.32
Nodes (10): sonner, AdminMapPage(), getTicketCenter(), toMapTicket(), ContractorMapPage(), getTicketCenter(), toMapTicket(), isValidLngLat() (+2 more)

### Community 101 - "Navigation Config"
Cohesion: 0.32
Nodes (6): ADMIN_BOTTOM_NAV_ITEMS, ADMIN_SIDEBAR_NAV_ITEMS, CONTRACTOR_BOTTOM_NAV_ITEMS, CONTRACTOR_SIDEBAR_NAV_ITEMS, NavigationSignalKey, NavLinkItem

### Community 103 - "routeOptimizationService.ts"
Cohesion: 0.15
Nodes (13): isSessionExpired(), MAX_INACTIVITY_MS, SESSION_ACTIVITY_COOKIE, buildEntergySpecialInstructions(), buildEntergyWorkDescription(), countLine(), EntergyTicketFormatInput, haversineDistanceMeters() (+5 more)

### Community 104 - "Add Ceo Role And Lock"
Cohesion: 0.39
Nodes (5): idx_profiles_single_ceo, idx_profiles_single_super_admin, public.is_admin(), public.is_super_admin(), trg_enforce_fixed_executive_roles

### Community 105 - "Financial Tables Schema"
Cohesion: 0.48
Nodes (6): contractor_invoices, idx_invoice_contractor, idx_invoice_period, idx_invoice_status, invoice_line_items, tax_1099_tracking

### Community 108 - "Test Supabase Connection"
Cohesion: 0.40
Nodes (5): colors, { createClient }, log(), supabase, testConnection()

### Community 116 - "Fix Profiles Policy Recursion Schema"
Cohesion: 0.60
Nodes (3): public.current_user_role(), public.is_admin(), public.is_super_admin()

### Community 117 - "Eslint Components"
Cohesion: 0.50
Nodes (3): eslintConfig, eslint, eslint-config-next

## Knowledge Gaps
- **528 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+523 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 761 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **50 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `react`, `Types Components`, `PhotoCapture.tsx`, `MapView.tsx`, `tickets/[id]/page.tsx`, `ticketService.ts`, `package.json`, `StatusUpdater.tsx`, `User Provisioning`, `ocr-extract/route.ts`, `app/layout.tsx`, `AssessmentReviewList.tsx`, `Photo Storage Service`, `ticket-new-client-page.tsx`, `ExpenseReviewList.tsx`, `SyncProvider.tsx`, `types/index.ts`, `buildReportExportArtifact`, `expenseProcessingService.ts`, `Assessment Catalog Service`, `assessmentReviewService.test.ts`, `Photo Upload Queue`, `ActiveTimer.tsx`, `appConfig.ts`, `useNavigationSignals.ts`, `expenseProcessing.ts`, `AuthProvider.tsx`, `stormEventService.ts`, `Time Entry Management Service`, `assessmentPhotos.ts`, `validators.ts`, `generate-utility-config.cjs`, `TimeEntryList.tsx`, `Receipt Ocr Service`, `Thumbnail Components`, `SafetyChecklist.tsx`, `contractorService.test.ts`, `Seed Db`, `Navigation Config`, `routeOptimizationService.ts`, `Expense Submission Service`?**
  _High betweenness centrality (0.148) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `SelectContent`, `cn`, `PhotoCapture.tsx`, `MapView.tsx`, `tickets/[id]/page.tsx`, `TicketFormRenderer.tsx`, `Sidebar.tsx`, `ticketService.ts`, `Card`, `dropdown-menu.tsx`, `lucide-react`, `package.json`, `StatusUpdater.tsx`, `app/layout.tsx`, `AssessmentReviewList.tsx`, `ticket-new-client-page.tsx`, `vitest`, `ExpenseReviewList.tsx`, `SyncProvider.tsx`, `ActiveTimer.tsx`, `useNavigationSignals.ts`, `AuthProvider.tsx`, `stormEventService.ts`, `AssessmentForm.tsx`, `Button`, `validators.ts`, `TimeEntryList.tsx`, `ExpenseForm.tsx`, `@tanstack/react-query`, `contractor/map/page.tsx`?**
  _High betweenness centrality (0.128) - this node is a cross-community bridge._
- **Why does `cn()` connect `cn` to `SelectContent`, `react`, `PhotoCapture.tsx`, `MapView.tsx`, `tickets/[id]/page.tsx`, `TicketFormRenderer.tsx`, `Sidebar.tsx`, `Card`, `dropdown-menu.tsx`, `StatusUpdater.tsx`, `Button`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _528 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `SelectContent` be split into smaller, more focused modules?**
  _Cohesion score 0.137155297532656 - nodes in this community are weakly interconnected._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.08821548821548822 - nodes in this community are weakly interconnected._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.12303422756706753 - nodes in this community are weakly interconnected._