# Graph Report - Central Command  (2026-10-01)

## Corpus Check
- 360 files · ~133,788 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: (none) 10, .log 1, .csv 1)

## Summary
- 2294 nodes · 6284 edges · 153 communities (103 shown, 50 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 60 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b2f8ef81`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ExpenseReviewList.tsx
- cn
- Button
- Types Components
- approval/page.tsx
- MapView.tsx
- react
- AppShell.tsx
- AssessmentDecisionSheet.tsx
- useAuth
- Dexie Components
- ticketService.ts
- Card
- Storm First Workflow Schema
- dropdown-menu.tsx
- SyncStatus.tsx
- dashboardReportingService.ts
- package.json
- Application Package Dependencies
- StatusUpdater.tsx
- User Provisioning
- ocr-extract/route.ts
- Storm Sop Workflow Tables Schema
- expenseSubmissionService.ts
- app/layout.tsx
- Entergy Components
- invoiceGenerationService.ts
- assessmentReviewService.ts
- Photo Storage Service
- ticket-new-client-page.tsx
- time-tracking/index.ts
- vitest
- ReportsDashboard.tsx
- Dexie Components
- Application Package Dependencies
- types/index.ts
- Application Package Dependencies
- Verify Grid2 Schema
- buildReportExportArtifact
- expenseProcessingService.ts
- Assessment Catalog Service
- formatters.ts
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
- User
- stormEventService.ts
- AssessmentForm.tsx
- Time Entry Management Service
- Core Tables Schema
- Exif Components
- calendar.tsx
- Validators Components
- TicketAssessments.test.tsx
- generate-utility-config.cjs
- Sw Components
- TimeEntryList.tsx
- EquipmentCondition
- ExpenseList.tsx
- buildDashboardReport
- client.ts
- ContractorInvoice
- Ticket Templates Ocr Scaffold Schema
- Add Storm Scope To Financial
- Seed Via Api
- Media Audit Tables Schema
- Storm Event Utility Template Preload
- Sw Components
- Receipt Ocr Service
- Gps Workflow
- Dashboard Reporting Service
- @tanstack/react-query
- Storm Event Sop Master Codes
- Ticket Tables Schema
- Thumbnail Components
- Assessment Photos
- Photo Validation
- Create Storm Events Root Workflow
- Image Compression
- Triggers Schema
- assessmentFormTypes.ts
- Assessment Submission Service
- fetchGenerationCandidates
- contractorService.test.ts
- Test Connection
- Seed Db
- Hash Components
- Assessment Tables Schema
- contractor/map/page.tsx
- Navigation Config
- routeOptimizationService.ts
- Add Ceo Role And Lock
- Financial Tables Schema
- Test Supabase Connection
- invoiceGenerationService.test.ts
- Storm Event Code Trigger Schema
- Ticket Assignment Picker Schema
- Expense Submission Service
- Fix Profiles Policy Recursion Schema
- Eslint Components
- Tickets Create Screens
- Allow Two Super Admins And
- Add Ceo Role And Promote
- Postcss Components

## God Nodes (most connected - your core abstractions)
1. `cn()` - 134 edges
2. `Button()` - 117 edges
3. `react` - 101 edges
4. `Card()` - 89 edges
5. `CardContent()` - 88 edges
6. `vitest` - 69 edges
7. `CardHeader()` - 66 edges
8. `CardTitle()` - 64 edges
9. `lucide-react` - 61 edges
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

## Communities (153 total, 50 thin omitted)

### Community 0 - "ExpenseReviewList.tsx"
Cohesion: 0.05
Nodes (99): zod, columns, ContractorsListPage(), exportCsv(), statusOf(), CreateStormEventPage(), STATE_NAMES, STORM_EVENT_STATUS_OPTIONS (+91 more)

### Community 1 - "cn"
Cohesion: 0.10
Nodes (26): cmdk, radix-ui, @radix-ui/react-progress, AlertTitle, AvatarBadge(), AvatarGroup(), AvatarGroupCount(), AvatarImage() (+18 more)

### Community 2 - "Button"
Cohesion: 0.07
Nodes (51): class-variance-authority, @hookform/resolvers, lucide-react, react-hook-form, AdminDashboardPage(), AdminError(), AdminErrorProps, AuthConfirmInner() (+43 more)

### Community 3 - "Types Components"
Cohesion: 0.07
Nodes (36): TicketFormRendererProps, CreateUtilityTicketInput, CENTERPOINT_TEMPLATE, centerpointPayloadSchema, DUKE_TEMPLATE, dukePayloadSchema, ENTERGY_TEMPLATE, entergyPayloadSchema (+28 more)

### Community 5 - "approval/page.tsx"
Cohesion: 0.23
Nodes (12): ContractorApprovalPage(), mockPending, PendingContractor, TicketPriorityBadgeProps, Avatar(), Badge(), badgeVariants, Tabs() (+4 more)

### Community 6 - "MapView.tsx"
Cohesion: 0.11
Nodes (34): mapbox-gl, buildGeofenceFeatureCollection(), buildGeofencePolygon(), GeofenceCircle(), GeofenceCircleProps, GeofenceFeatureCollection, isRenderableGeofence(), removeGeofenceLayers() (+26 more)

### Community 7 - "react"
Cohesion: 0.16
Nodes (19): react, TicketDetailPage(), TicketDetailSkeleton(), dotStyles, getVariantFromStatus(), sizeStyles, StatusBadge(), StatusBadgeProps (+11 more)

### Community 8 - "AppShell.tsx"
Cohesion: 0.23
Nodes (9): AdminLayout(), ContractorLayout(), StormLayout(), AppShell(), AppShellProps, adminNavItems, BottomNav(), BottomNavProps (+1 more)

### Community 9 - "AssessmentDecisionSheet.tsx"
Cohesion: 0.17
Nodes (17): adminNavItems, contractorNavItems, Sidebar(), SidebarProps, AssessmentDecisionSheet(), AssessmentDecisionSheetProps, Sheet(), SheetContent() (+9 more)

### Community 10 - "useAuth"
Cohesion: 0.06
Nodes (55): AdminAssessmentReviewPage(), AdminExpenseReviewPage(), AdminReportsPage(), onSubmit(), AdminTimeReviewPage(), AssessmentCreateInner(), AssessmentCreateSkeleton(), AssignedAssessmentTickets() (+47 more)

### Community 11 - "Dexie Components"
Cohesion: 0.11
Nodes (32): addToSyncQueue(), CachedTicketFilters, cacheTicket(), cacheTickets(), createId(), createSyncConflict(), deriveSyncStatus(), getCachedTickets() (+24 more)

### Community 12 - "ticketService.ts"
Cohesion: 0.12
Nodes (23): StormPage(), StormWorkspace(), StatusUpdateFlowProps, StatusUpdaterProps, TicketCardProps, contractorService, dashboardTicketService, StormEventSummary (+15 more)

### Community 13 - "Card"
Cohesion: 0.12
Nodes (37): nextConfig, next, AdminAccountPage(), ContractorDetailPage(), ContractorInvitePage(), StormEventsPage(), ForgotPasswordPage(), metadata (+29 more)

### Community 14 - "Storm First Workflow Schema"
Cohesion: 0.07
Nodes (16): expense_item_storm_scope, invoice_line_storm_scope, invoice_storm_immutable, public.assign_contractor_to_storm(), public.create_storm_ticket(), public.enforce_expense_item_storm(), public.enforce_storm_payload(), public.enforce_ticket_roster_assignment() (+8 more)

### Community 15 - "dropdown-menu.tsx"
Cohesion: 0.16
Nodes (15): SidebarTrigger(), TopBar(), TopBarProps, AvatarFallback(), DropdownMenu(), DropdownMenuCheckboxItem(), DropdownMenuContent(), DropdownMenuItem() (+7 more)

### Community 16 - "SyncStatus.tsx"
Cohesion: 0.35
Nodes (8): formatPayloadPreview(), formatTimestamp(), SyncStatus(), useSync(), DialogTrigger(), ScrollArea(), ScrollBar(), Separator()

### Community 17 - "dashboardReportingService.ts"
Cohesion: 0.07
Nodes (25): CLOSED_TICKET_STATUSES, CountEqClient, CountInClient, CountIsNotClient, DashboardExpenseReportRow, DashboardInvoiceRow, DashboardMetricsBuildInput, DashboardReportBuildInput (+17 more)

### Community 18 - "package.json"
Cohesion: 0.07
Nodes (28): name, private, version, clsx, crypto-js, date-fns-tz, dexie, dexie-react-hooks (+20 more)

### Community 19 - "Application Package Dependencies"
Cohesion: 0.06
Nodes (33): dependencies, browser-image-compression, class-variance-authority, clsx, cmdk, crypto-js, date-fns, date-fns-tz (+25 more)

### Community 20 - "StatusUpdater.tsx"
Cohesion: 0.29
Nodes (14): statusButtonConfig, StatusUpdater(), mocks, TicketAssign(), TicketAssignProps, CommandDialog(), Dialog(), DialogContent() (+6 more)

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
Cohesion: 0.11
Nodes (37): LocalExpenseItem, LocalExpenseReport, createId(), createLocal(), createRemote(), defaultDependencies, ExpenseStatusFilter, ExpenseSubmissionDependencies (+29 more)

### Community 25 - "app/layout.tsx"
Cohesion: 0.10
Nodes (25): agentation, next-themes, metadata, RootLayout(), OfflineBanner(), readOnlineStatus(), shouldRenderOfflineBanner(), Agentation (+17 more)

### Community 26 - "Entergy Components"
Cohesion: 0.26
Nodes (9): confidence(), extractEntergyFields(), extractMatch(), EXTRACTORS, stubUtilityExtractor(), TicketOcrExtractionResult, TicketOcrExtractor, TicketOcrRequest (+1 more)

### Community 27 - "invoiceGenerationService.ts"
Cohesion: 0.09
Nodes (23): CreateInvoiceLineItemInput, defaultDependencies, GeneratedInvoiceResult, GenerateInvoicesInput, GenerateInvoicesResult, getInvoiceYearForPeriodEnd(), InsertInvoiceInput, InvoiceGenerationExpenseReport (+15 more)

### Community 28 - "assessmentReviewService.ts"
Cohesion: 0.09
Nodes (31): LocalAssessment, applyFilters(), AssessmentReviewDependencies, assessmentReviewService, AssessmentReviewState, composeReviewNotes(), createAssessmentReviewService(), defaultDependencies (+23 more)

### Community 29 - "Photo Storage Service"
Cohesion: 0.11
Nodes (22): AuthClient, buildPhotoStoragePath(), ContractorsTableClient, getDefaultClient(), getFileExtension(), MediaAssetsTableClient, PHOTO_STORAGE_AUTH_ERROR, PHOTO_STORAGE_BUCKET (+14 more)

### Community 30 - "ticket-new-client-page.tsx"
Cohesion: 0.17
Nodes (15): TicketNewPage(), TicketNewPageProps, TicketNewClientPage(), TicketNewClientPageProps, notifyTicketsChanged(), detectTicketOcrSourceType(), getNormalizedExtension(), TICKET_OCR_ACCEPT_ATTRIBUTE (+7 more)

### Community 31 - "time-tracking/index.ts"
Cohesion: 0.31
Nodes (6): WORK_TYPE_OPTIONS, WorkTypeOption, WorkTypeSelectorProps, WORK_TYPES, ClockInRequest, WorkType

### Community 32 - "vitest"
Cohesion: 0.17
Nodes (18): vitest, TicketsLayout(), canPerformManagementAction(), getManagementActionForPath(), ManagementAction, normalizePath(), getPortalRole(), isAdminPortalPath() (+10 more)

### Community 33 - "ReportsDashboard.tsx"
Cohesion: 0.14
Nodes (33): DataTable(), DataTableProps, amountToPercent(), buildDefaultDates(), downloadArtifact(), ReportsDashboard(), toDateInputValue(), toErrorMessage() (+25 more)

### Community 34 - "Dexie Components"
Cohesion: 0.13
Nodes (19): readOnlineStatus(), SyncContext, SyncContextValue, SyncProvider(), SyncSnapshot, SyncState, ConflictResolutionStrategy, createSyncConflictFromQueueItem() (+11 more)

### Community 35 - "Application Package Dependencies"
Cohesion: 0.08
Nodes (24): scripts, build, clean:next, dev, dev:fresh, lint, prebuild, predev (+16 more)

### Community 36 - "types/index.ts"
Cohesion: 0.09
Nodes (25): DashboardTicketRow, getNextPossibleStatuses(), isValidTransition(), FIELD_STATUS_TRANSITIONS, FieldStatusTransition, isFieldStatusFlowStep(), CapturedPhoto, Contractor (+17 more)

### Community 37 - "Application Package Dependencies"
Cohesion: 0.09
Nodes (23): devDependencies, agentation, dotenv, eslint, eslint-config-next, jsdom, @playwright/test, shadcn (+15 more)

### Community 38 - "Verify Grid2 Schema"
Cohesion: 0.16
Nodes (21): buildSqlRunner(), CC_CORE_TABLES, checkCeoRole(), CheckContext, checkContractorNaming(), checkCoreTables(), checkGrid2Tables(), checkRlsEnabled() (+13 more)

### Community 39 - "buildReportExportArtifact"
Cohesion: 0.25
Nodes (7): buildReportExportArtifact(), buildSimplePdf(), escapeCsvValue(), escapePdfText(), formatDatePart(), rowsToCsv(), rowsToTabSeparated()

### Community 40 - "expenseProcessingService.ts"
Cohesion: 0.14
Nodes (16): ExpenseFormProps, createExpenseProcessingService(), defaultDependencies, ExpenseProcessingDependencies, expenseProcessingService, ExpenseReviewDecision, ExpenseReviewFilters, mapReviewedReport() (+8 more)

### Community 41 - "Assessment Catalog Service"
Cohesion: 0.13
Nodes (16): EquipmentSelectProps, WireSizeSelectProps, AssessmentCatalogDependencies, createAssessmentCatalogService(), defaultDependencies, EquipmentTypeOption, fetchEquipmentTypes(), fetchWireSizes() (+8 more)

### Community 42 - "formatters.ts"
Cohesion: 0.12
Nodes (14): date-fns, PhotoGallery(), renderGpsStatus(), isGpsReadyForClockAction(), TimeClock(), WORK_TYPE_DEFAULT_RATES, TimeEntryCard(), toWorkTypeLabel() (+6 more)

### Community 43 - "Photo Upload Queue"
Cohesion: 0.13
Nodes (15): PhotoCaptureProps, PhotoGalleryProps, getPendingPhotos(), LocalPhoto, AssessmentPhotoMetadataInput, createPhotoUploadQueue(), defaultDependencies, inferExtensionFromMimeType() (+7 more)

### Community 44 - "ActiveTimer.tsx"
Cohesion: 0.26
Nodes (15): ActiveTimer(), ActiveTimerProps, formatDuration(), calculateBillableAmount(), calculateBillableMinutes(), calculateElapsedMinutes(), calculateElapsedSeconds(), calculateTimeEntrySummary() (+7 more)

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
Nodes (18): AssessmentFormProps, AssessmentSubmissionDependencies, assessmentSubmissionService, composeEquipmentDescription(), createId(), createLocalAssessment(), createRemoteAssessment(), defaultDependencies (+10 more)

### Community 49 - "Tsconfig Components"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 50 - "appConfig.ts"
Cohesion: 0.18
Nodes (10): APP_CONFIG, EQUIPMENT_CONDITIONS, EXPENSE_CATEGORIES, EXPENSE_STATUS, INVOICE_STATUS, NOTIFICATION_TYPES, PRIORITY_LEVELS, SYNC_STATUS (+2 more)

### Community 51 - "Time Expense Tables Schema"
Cohesion: 0.19
Nodes (17): expense_items, expense_policies, expense_reports, idx_expense_item_category, idx_expense_item_date, idx_expense_item_report, idx_expense_report_contractor, idx_expense_report_period (+9 more)

### Community 52 - "useNavigationSignals.ts"
Cohesion: 0.22
Nodes (15): buildAdminRoleSignalCounts(), buildContractorRoleSignalCounts(), buildNavigationSignals(), clampCount(), loadContractorTicketsByAssignee(), loadRoleSignalCounts(), LoadRoleSignalCountsOptions, NavigationSignalKey (+7 more)

### Community 53 - "expenseProcessing.ts"
Cohesion: 0.19
Nodes (17): ProcessedCreateInput, validateCreateInput(), calculateMileageExpense(), ExpenseDuplicateCandidate, ExpensePolicyValidationInput, ExpensePolicyValidationResult, extractLargestCurrencyAmount(), hasDuplicateExpense() (+9 more)

### Community 54 - "Storm Contractor Auth Alignment Schema"
Cohesion: 0.12
Nodes (5): private.active_profile_role(), protect_contractor_eligibility, protect_profile_authorization, provision_contractor_auth_profile, sync_contractor_managed_role

### Community 55 - "User"
Cohesion: 0.40
Nodes (5): zustand, AuthContextType, AuthState, useAuthStore, User

### Community 56 - "stormEventService.ts"
Cohesion: 0.08
Nodes (21): remote, UtilityTicketDetails(), CLOSED_TICKET_STATUSES, CreateStormEventInput, mapStormEventRow(), normalizeStormEventStatus(), normalizeUtilityClientValue(), RemoteStormEventRow (+13 more)

### Community 57 - "AssessmentForm.tsx"
Cohesion: 0.32
Nodes (11): sonner, AssessmentForm(), parseOptionalNumber(), toHumanPhotoType(), validateAssessmentDraft(), createDefaultDamageClassification(), createDefaultSafetyObservations(), ALL_PHOTO_TYPES (+3 more)

### Community 58 - "Time Entry Management Service"
Cohesion: 0.14
Nodes (11): TimeEntryCardProps, LocalTimeEntry, SyncQueueOperation, createTimeEntryManagementService(), TimeEntryListItem, TimeEntryManagementDependencies, timeEntryManagementService, ClockOutRequest (+3 more)

### Community 59 - "Core Tables Schema"
Cohesion: 0.23
Nodes (12): contractor_banking, contractor_rates, contractors, idx_contractors_eligible, idx_contractors_profile, idx_contractors_status, idx_profiles_active, idx_profiles_email (+4 more)

### Community 60 - "Exif Components"
Cohesion: 0.22
Nodes (14): exifreader, dmsToDecimal(), ExifTagLike, ExifTagMap, extractExifMetadataFromArrayBuffer(), extractExifMetadataFromFile(), extractExifMetadataFromTags(), normalizeNumericValue() (+6 more)

### Community 61 - "calendar.tsx"
Cohesion: 0.60
Nodes (4): react-day-picker, buttonVariants, Calendar(), CalendarDayButton()

### Community 62 - "Validators Components"
Cohesion: 0.12
Nodes (15): assessmentSchema, einSchema, emailSchema, expenseItemSchema, FileValidationResult, GPSValidationResult, latitudeSchema, longitudeSchema (+7 more)

### Community 63 - "TicketAssessments.test.tsx"
Cohesion: 0.40
Nodes (3): react-dom, @testing-library/react, remote

### Community 64 - "generate-utility-config.cjs"
Cohesion: 0.10
Nodes (17): cleanNextDuplicates(), CleanResult, TARGET_DIRECTORIES, cache, { createRequire }, fs, json(), load() (+9 more)

### Community 65 - "Sw Components"
Cohesion: 0.13
Nodes (4): CACHE_NAMES, STATIC_ASSETS, sw, SyncEvent

### Community 66 - "TimeEntryList.tsx"
Cohesion: 0.22
Nodes (12): getTimeReviewLayoutMode(), parseError(), ReviewDecision, StatusFilterValue, TIME_REVIEW_FILTER_CONTROL_CLASS, TimeEntryList(), TimeEntryListProps, toEndOfDayIso() (+4 more)

### Community 67 - "EquipmentCondition"
Cohesion: 0.40
Nodes (5): EquipmentAssessmentDraft, EquipmentAssessmentProps, AssessmentEquipmentInput, RemoteEquipmentAssessmentInsert, EquipmentCondition

### Community 68 - "ExpenseList.tsx"
Cohesion: 0.21
Nodes (14): createInitialDraft(), ExpenseForm(), mapTicketsToOptions(), parseOptionalNumber(), toDateInputValue(), ExpenseItemDraft, ExpenseTicketOption, ExpenseList() (+6 more)

### Community 69 - "buildDashboardReport"
Cohesion: 0.19
Nodes (13): buildDashboardMetrics(), buildDashboardReport(), formatTrendPercent(), getBucketLabel(), getBuckets(), getBucketStart(), getPreviousMtdWindow(), isInvoiceRevenueStatus() (+5 more)

### Community 70 - "client.ts"
Cohesion: 0.14
Nodes (14): fetchContractorNames(), fetchExistingInvoiceCount(), fetchInvoiceDetails(), fetchInvoices(), fetchLineItemCountByInvoiceId(), insertInvoice(), insertInvoiceLineItems(), linkExpenseReportsToInvoice() (+6 more)

### Community 71 - "ContractorInvoice"
Cohesion: 0.40
Nodes (5): InvoicePDFViewerProps, InvoiceDetails, InvoiceGenerationDependencies, InvoiceListItem, ContractorInvoice

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

### Community 79 - "Gps Workflow"
Cohesion: 0.29
Nodes (9): GPSValidationState, GPSValidationStatus, UseGPSValidationOptions, GPSWorkflowReading, GPSWorkflowTarget, GPSWorkflowValidationResult, validateGPSWorkflow(), validateGeofence() (+1 more)

### Community 80 - "Dashboard Reporting Service"
Cohesion: 0.17
Nodes (12): createDashboardReportingService(), fetchAllTickets(), fetchContractorNames(), fetchInvoicesByCreatedRange(), fetchPendingAssessments(), fetchPendingExpenseReports(), fetchPendingTimeEntries(), fetchReportExpenseReports() (+4 more)

### Community 82 - "Storm Event Sop Master Codes"
Cohesion: 0.27
Nodes (9): idx_customers_active, idx_storm_events_city_code, idx_storm_events_customer_id, idx_storm_events_event_date, idx_storm_events_utility_id, idx_utilities_active, idx_utilities_client_key, public.customers (+1 more)

### Community 83 - "Ticket Tables Schema"
Cohesion: 0.35
Nodes (10): idx_status_history_changed, idx_status_history_ticket, idx_tickets_assigned, idx_tickets_client, idx_tickets_coordinates, idx_tickets_priority, idx_tickets_scheduled, idx_tickets_status (+2 more)

### Community 84 - "Thumbnail Components"
Cohesion: 0.27
Nodes (9): generatePreview(), buildThumbnailFile(), calculateThumbnailDimensions(), fallbackResult(), generateImageThumbnail(), loadImageBitmap(), ThumbnailDimensions, ThumbnailGenerationResult (+1 more)

### Community 85 - "Assessment Photos"
Cohesion: 0.25
Nodes (8): assertPhotoMimeTypeAllowed(), buildPhotoPreviewUrl(), countPhotosByType(), DEFAULT_REQUIRED_PHOTO_TYPES, PHOTO_MIME_TYPES, prepareCapturedPhoto(), revokeCapturedPhotoPreview(), revokePhotoPreviewUrl()

### Community 86 - "Photo Validation"
Cohesion: 0.24
Nodes (8): PhotoExifMetadata, validatePhotoFile(), ExistingPhotoChecksum, hasGps(), PHOTO_MIME_TYPES, PhotoValidationOptions, PhotoValidationResult, validateAssessmentPhoto()

### Community 88 - "Create Storm Events Root Workflow"
Cohesion: 0.29
Nodes (7): idx_storm_events_created_at, idx_storm_events_event_code, idx_storm_events_status, idx_storm_events_utility_client, idx_tickets_storm_event, public.storm_events, update_storm_events_updated_at

### Community 89 - "Image Compression"
Cohesion: 0.27
Nodes (7): browser-image-compression, compressImageFile(), getImageCompressionOptions(), ImageCompressionLibraryOptions, ImageCompressionOptions, ImageCompressionResult, toFile()

### Community 90 - "Triggers Schema"
Cohesion: 0.20
Nodes (6): ticket_number_trigger, ticket_status_change_trigger, update_contractors_updated_at, update_profiles_updated_at, update_tickets_updated_at, update_time_entries_updated_at

### Community 91 - "assessmentFormTypes.ts"
Cohesion: 0.23
Nodes (12): createAssessmentDraftId(), createEmptyEquipmentAssessment(), DamageClassificationDraft, DamageClassificationProps, TicketFiltersState, AssessmentReviewFilters, AssessmentReviewListItem, AssessmentDamageClassificationInput (+4 more)

### Community 92 - "Assessment Submission Service"
Cohesion: 0.22
Nodes (7): SafetyChecklistProps, SafetyFieldConfig, CreateAssessmentInput, createAssessmentSubmissionService(), RemoteDamageAssessmentRow, SAFETY_OBSERVATIONS, SafetyObservations

### Community 93 - "fetchGenerationCandidates"
Cohesion: 0.38
Nodes (7): buildExpenseReportLineItems(), buildTimeEntryLineItems(), calculateTimeEntryAmount(), fetchGenerationCandidates(), fetchTicketNumbers(), roundToCurrency(), toDateOnly()

### Community 96 - "Test Connection"
Cohesion: 0.29
Nodes (4): dotenv, __dirname, __filename, supabase

### Community 97 - "Seed Db"
Cohesion: 0.29
Nodes (3): { createClient }, path, supabase

### Community 98 - "Hash Components"
Cohesion: 0.39
Nodes (7): bufferToHex(), calculateSHA256Hash(), getSubtleCrypto(), HashSubtle, isArrayBuffer(), readBlobWithFileReader(), toArrayBuffer()

### Community 99 - "Assessment Tables Schema"
Cohesion: 0.39
Nodes (7): damage_assessments, equipment_assessments, equipment_types, hazard_categories, idx_assessment_contractor, idx_assessment_ticket, wire_sizes

### Community 100 - "contractor/map/page.tsx"
Cohesion: 0.31
Nodes (10): AdminMapPage(), getTicketCenter(), toMapTicket(), ContractorMapPage(), getTicketCenter(), toMapTicket(), isValidLngLat(), formatWorkflowStatus() (+2 more)

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
- **547 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+542 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 782 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **50 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `ExpenseReviewList.tsx`, `Types Components`, `approval/page.tsx`, `MapView.tsx`, `AssessmentDecisionSheet.tsx`, `useAuth`, `ticketService.ts`, `package.json`, `StatusUpdater.tsx`, `User Provisioning`, `ocr-extract/route.ts`, `app/layout.tsx`, `assessmentReviewService.ts`, `Photo Storage Service`, `ticket-new-client-page.tsx`, `time-tracking/index.ts`, `Dexie Components`, `types/index.ts`, `buildReportExportArtifact`, `expenseProcessingService.ts`, `Assessment Catalog Service`, `formatters.ts`, `Photo Upload Queue`, `ActiveTimer.tsx`, `useNavigationSignals.ts`, `expenseProcessing.ts`, `stormEventService.ts`, `Time Entry Management Service`, `Exif Components`, `TicketAssessments.test.tsx`, `generate-utility-config.cjs`, `TimeEntryList.tsx`, `Receipt Ocr Service`, `Gps Workflow`, `Thumbnail Components`, `Assessment Photos`, `Photo Validation`, `Image Compression`, `Assessment Submission Service`, `contractorService.test.ts`, `Seed Db`, `Hash Components`, `Navigation Config`, `routeOptimizationService.ts`, `invoiceGenerationService.test.ts`, `Expense Submission Service`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `ExpenseReviewList.tsx`, `cn`, `Button`, `approval/page.tsx`, `MapView.tsx`, `AppShell.tsx`, `AssessmentDecisionSheet.tsx`, `useAuth`, `ticketService.ts`, `Card`, `dropdown-menu.tsx`, `SyncStatus.tsx`, `package.json`, `StatusUpdater.tsx`, `app/layout.tsx`, `ticket-new-client-page.tsx`, `vitest`, `ReportsDashboard.tsx`, `Dexie Components`, `formatters.ts`, `ActiveTimer.tsx`, `useNavigationSignals.ts`, `stormEventService.ts`, `AssessmentForm.tsx`, `calendar.tsx`, `TicketAssessments.test.tsx`, `TimeEntryList.tsx`, `ExpenseList.tsx`, `Gps Workflow`, `@tanstack/react-query`, `contractor/map/page.tsx`, `Tickets Create Screens`?**
  _High betweenness centrality (0.113) - this node is a cross-community bridge._
- **Why does `cn()` connect `cn` to `ExpenseReviewList.tsx`, `ReportsDashboard.tsx`, `Button`, `approval/page.tsx`, `MapView.tsx`, `react`, `AppShell.tsx`, `AssessmentDecisionSheet.tsx`, `formatters.ts`, `useAuth`, `Card`, `dropdown-menu.tsx`, `SyncStatus.tsx`, `StatusUpdater.tsx`, `calendar.tsx`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _547 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ExpenseReviewList.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05068574836016696 - nodes in this community are weakly interconnected._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.0953058321479374 - nodes in this community are weakly interconnected._
- **Should `Button` be split into smaller, more focused modules?**
  _Cohesion score 0.0733099209833187 - nodes in this community are weakly interconnected._