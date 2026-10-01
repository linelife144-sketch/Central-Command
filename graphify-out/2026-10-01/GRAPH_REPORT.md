# Graph Report - Central Command  (2026-09-30)

## Corpus Check
- 358 files · ~134,157 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: (none) 9, .ico 2, .log 1)

## Summary
- 2297 nodes · 6248 edges · 160 communities (103 shown, 57 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 61 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Map View
- Time Tracking
- Select Components
- Dialog Components
- Auth Provider
- Storm First Workflow Schema
- Table Components
- Contractor Service
- Dexie Components
- Photo Storage Service
- Formatters Components
- Local Test Store
- Status Badge
- Shared Application Models
- Time Entry Service
- Assessment Review Service
- Admin Map Screens
- Application Package Dependencies
- Application Package Dependencies
- User Provisioning
- Storm Sop Workflow Tables Schema
- Route Components
- Types Components
- Expense Submission Service
- Service Worker
- Entergy Components
- Assessment Submission Service
- Invoice Generation Service
- Storm Event Service
- File Intake
- Form Components
- Magic Link Form
- Auth Confirm Screens
- Dexie Components
- Time Entry Management Service
- Application Package Dependencies
- Application Package Dependencies
- Verify Grid2 Schema
- Invoice Generation Service
- Assessment Catalog Service
- Assessment Form Types
- Expense Processing Service
- Components Components
- Storm Event Service
- Assessment Review List
- Tsconfig Components
- Portal Access
- Dropdown Menu
- Time Expense Tables Schema
- Time Entry List
- Role Guards
- Assessment Form
- Use Navigation Signals
- Expense Processing
- Ticket Intake Service
- Core Tables Schema
- Card Components
- App Config
- Validators Components
- Sw Components
- Route Optimization Service
- Storm Contractor Auth Alignment Schema
- Clean Next Duplicates
- Assessment Review Service
- Photo Upload Queue
- Entergy Components
- Ticket Templates Ocr Scaffold Schema
- Add Storm Scope To Financial
- Generate Utility Config
- Media Audit Tables Schema
- Storm Event Utility Template Preload
- Sw Components
- Expense Review List
- Status Update Flow
- Time Entry Management Service
- Storm Event Sop Master Codes
- Receipt Ocr Service
- Ticket Tables Schema
- Exif Components
- Create Storm Events Root Workflow
- Live Database Types
- Triggers Schema
- Middleware Components
- Invoice Generation Service
- Expense Item Form
- Seed Via Api
- Dashboard Metrics
- Work Type Options
- Assessment Tables Schema
- Navigation Config
- Supabase Ssr.D
- Add Ceo Role And Lock
- Test Connection
- Seed Db
- Financial Tables Schema
- Test Supabase Connection
- Session Timeout
- Entergy Ticket Format
- Storm Event Code Trigger Schema
- Expense Submission Service
- Fix Profiles Policy Recursion Schema
- Eslint Components
- Allow Two Super Admins And
- Add Ceo Role And Promote
- Postcss Components
- Thumbnail Components
- Assessment Submission Service
- Dashboard Reporting Service
- Authorization Components
- Utility Clients

## God Nodes (most connected - your core abstractions)
1. `cn()` - 134 edges
2. `Button()` - 117 edges
3. `react` - 99 edges
4. `Card()` - 91 edges
5. `CardContent()` - 90 edges
6. `CardHeader()` - 68 edges
7. `CardTitle()` - 66 edges
8. `lucide-react` - 64 edges
9. `vitest` - 64 edges
10. `Input()` - 50 edges

## Surprising Connections (you probably didn't know these)
- `CommandGroup()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/command.tsx → src/lib/utils.ts
- `CommandInput()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/command.tsx → src/lib/utils.ts
- `CommandItem()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/command.tsx → src/lib/utils.ts
- `CommandList()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/command.tsx → src/lib/utils.ts
- `CommandSeparator()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/command.tsx → src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (160 total, 57 thin omitted)

### Community 0 - "Map View"
Cohesion: 0.11
Nodes (34): mapbox-gl, buildGeofenceFeatureCollection(), buildGeofencePolygon(), GeofenceCircle(), GeofenceCircleProps, GeofenceFeatureCollection, isRenderableGeofence(), removeGeofenceLayers() (+26 more)

### Community 1 - "Time Tracking"
Cohesion: 0.26
Nodes (15): ActiveTimer(), ActiveTimerProps, formatDuration(), calculateBillableAmount(), calculateBillableMinutes(), calculateElapsedMinutes(), calculateElapsedSeconds(), calculateTimeEntrySummary() (+7 more)

### Community 2 - "Select Components"
Cohesion: 0.17
Nodes (34): ContractorsListPage(), CreateStormEventPage(), STATE_NAMES, STORM_EVENT_STATUS_OPTIONS, UTILITY_CLIENT_OPTIONS, DAMAGE_CAUSE_OPTIONS, DamageClassification(), PRIORITY_OPTIONS (+26 more)

### Community 3 - "Dialog Components"
Cohesion: 0.13
Nodes (29): cmdk, formatPayloadPreview(), formatTimestamp(), SyncStatus(), statusButtonConfig, StatusUpdater(), mocks, TicketAssign() (+21 more)

### Community 4 - "Auth Provider"
Cohesion: 0.09
Nodes (33): react, AdminAssessmentReviewPage(), columns, Contractor, mockContractors, AdminExpenseReviewPage(), AdminReportsPage(), StormPage() (+25 more)

### Community 5 - "Storm First Workflow Schema"
Cohesion: 0.07
Nodes (17): expense_item_storm_scope, invoice_line_storm_scope, invoice_storm_immutable, public.assign_contractor_to_storm(), public.create_storm_ticket(), public.enforce_expense_item_storm(), public.enforce_storm_payload(), public.enforce_ticket_roster_assignment() (+9 more)

### Community 6 - "Table Components"
Cohesion: 0.10
Nodes (37): radix-ui, @radix-ui/react-progress, DataTable(), DataTableProps, amountToPercent(), buildDefaultDates(), downloadArtifact(), ReportsDashboard() (+29 more)

### Community 7 - "Contractor Service"
Cohesion: 0.08
Nodes (17): AssignableContractor, buildActiveTicketCountByContractor(), buildYtdEarningsByContractor(), ContractorDetail, ContractorListFilters, ContractorListItem, fetchProfilesByIds(), fetchTicketRows() (+9 more)

### Community 8 - "Dexie Components"
Cohesion: 0.11
Nodes (32): addToSyncQueue(), CachedTicketFilters, cacheTicket(), cacheTickets(), createId(), createSyncConflict(), deriveSyncStatus(), getCachedTickets() (+24 more)

### Community 9 - "Photo Storage Service"
Cohesion: 0.11
Nodes (22): AuthClient, buildPhotoStoragePath(), ContractorsTableClient, getDefaultClient(), getFileExtension(), MediaAssetsTableClient, PHOTO_STORAGE_AUTH_ERROR, PHOTO_STORAGE_BUCKET (+14 more)

### Community 10 - "Formatters Components"
Cohesion: 0.12
Nodes (20): date-fns, getDefaultPeriod(), InvoiceGenerator(), InvoiceGeneratorProps, parseError(), toDateInputValue(), InvoiceList(), InvoiceListProps (+12 more)

### Community 11 - "Local Test Store"
Cohesion: 0.18
Nodes (8): StormEventSummary, LOCAL_TEST_STORAGE_KEY, LocalHistoryEntry, LocalTestData, readData(), requireLocalTesting(), saveData(), TicketStatusHistory

### Community 12 - "Status Badge"
Cohesion: 0.15
Nodes (26): ContractorApprovalPage(), mockPending, PendingContractor, ContractorDetailPage(), mockContractor, TicketDetailPage(), TicketDetailSkeleton(), dotStyles (+18 more)

### Community 13 - "Shared Application Models"
Cohesion: 0.09
Nodes (25): zustand, AuthContextType, getNextPossibleStatuses(), isValidTransition(), AuthState, useAuthStore, CapturedPhoto, Contractor (+17 more)

### Community 14 - "Time Entry Service"
Cohesion: 0.13
Nodes (18): LocalSyncStatus, buildClockInEntry(), ClockLocation, createEntryId(), createTimeEntryService(), defaultDependencies, fetchRemoteActiveEntry(), insertRemoteEntry() (+10 more)

### Community 15 - "Assessment Review Service"
Cohesion: 0.12
Nodes (27): LocalAssessment, applyFilters(), AssessmentReviewDependencies, assessmentReviewService, AssessmentReviewState, defaultDependencies, fetchContractorNames(), fetchEquipmentCounts() (+19 more)

### Community 17 - "Admin Map Screens"
Cohesion: 0.16
Nodes (18): sonner, AdminMapPage(), getTicketCenter(), toMapTicket(), ContractorMapPage(), getTicketCenter(), toMapTicket(), ACCEPTED_RECEIPT_TYPES (+10 more)

### Community 18 - "Application Package Dependencies"
Cohesion: 0.06
Nodes (31): name, private, version, clsx, crypto-js, date-fns-tz, dexie, dexie-react-hooks (+23 more)

### Community 19 - "Application Package Dependencies"
Cohesion: 0.06
Nodes (33): dependencies, browser-image-compression, class-variance-authority, clsx, cmdk, crypto-js, date-fns, date-fns-tz (+25 more)

### Community 20 - "User Provisioning"
Cohesion: 0.09
Nodes (28): AuthUserSummary, AuthUserUpsertInput, ContractorUpsertInput, ExistingSuperAdmin, isRoleAliasWarning(), normalizeEmail(), normalizeHeader(), normalizeRole() (+20 more)

### Community 21 - "Storm Sop Workflow Tables Schema"
Cohesion: 0.13
Nodes (26): idx_auth_logs_authorized_at, idx_auth_logs_storm_event, idx_logistics_phase_category, idx_logistics_status, idx_logistics_storm_event, idx_phase_steps_phase_status, idx_phase_steps_storm_event, idx_roster_members_contractor (+18 more)

### Community 22 - "Route Components"
Cohesion: 0.20
Nodes (16): GET(), normalizeProfile(), PATCH(), ProfileRow, resolveAuthenticatedUser(), remote, extractError(), extractOcrText() (+8 more)

### Community 23 - "Types Components"
Cohesion: 0.12
Nodes (22): zod, TicketFormRendererProps, CENTERPOINT_TEMPLATE, centerpointPayloadSchema, DUKE_TEMPLATE, dukePayloadSchema, FPL_TEMPLATE, fplPayloadSchema (+14 more)

### Community 24 - "Expense Submission Service"
Cohesion: 0.11
Nodes (38): LocalExpenseItem, LocalExpenseReport, createId(), createLocal(), createRemote(), defaultDependencies, ExpenseStatusFilter, ExpenseSubmissionDependencies (+30 more)

### Community 25 - "Service Worker"
Cohesion: 0.12
Nodes (23): agentation, next-themes, metadata, RootLayout(), OfflineBanner(), readOnlineStatus(), shouldRenderOfflineBanner(), AuthProvider() (+15 more)

### Community 26 - "Entergy Components"
Cohesion: 0.23
Nodes (10): confidence(), extractEntergyFields(), extractMatch(), EXTRACTORS, runUtilityOcrExtraction(), stubUtilityExtractor(), TicketOcrExtractionResult, TicketOcrExtractor (+2 more)

### Community 27 - "Assessment Submission Service"
Cohesion: 0.21
Nodes (12): composeEquipmentDescription(), createId(), createLocalAssessment(), createRemoteAssessment(), mapLocalAssessment(), mapRemoteAssessment(), normalizeOptionalText(), resolveContractorId() (+4 more)

### Community 28 - "Invoice Generation Service"
Cohesion: 0.07
Nodes (30): InvoicePDFViewerProps, createInvoiceGenerationService(), CreateInvoiceLineItemInput, defaultDependencies, GeneratedInvoiceResult, GenerateInvoicesInput, GenerateInvoicesResult, InsertInvoiceInput (+22 more)

### Community 30 - "File Intake"
Cohesion: 0.13
Nodes (17): TicketNewPage(), TicketNewPageProps, TicketNewClientPage(), TicketNewClientPageProps, notifyTicketsChanged(), detectTicketOcrSourceType(), getNormalizedExtension(), TICKET_OCR_ACCEPT_ATTRIBUTE (+9 more)

### Community 31 - "Form Components"
Cohesion: 0.15
Nodes (21): @hookform/resolvers, react-hook-form, TicketForm(), ticketFormSchema, TicketFormValues, applyFieldFormatting(), getFieldDefault(), StormHeaderSummary (+13 more)

### Community 32 - "Magic Link Form"
Cohesion: 0.12
Nodes (23): ForgotPasswordForm(), ForgotPasswordFormData, forgotPasswordSchema, LoginForm(), LoginFormData, loginSchema, EmailFormData, emailSchema (+15 more)

### Community 33 - "Auth Confirm Screens"
Cohesion: 0.13
Nodes (8): nextConfig, next, AuthConfirmInner(), AuthConfirmPage(), ConfirmSkeleton(), Status, BrandMarkProps, BrandMarkVariant

### Community 34 - "Dexie Components"
Cohesion: 0.13
Nodes (19): readOnlineStatus(), SyncContext, SyncContextValue, SyncProvider(), SyncSnapshot, SyncState, ConflictResolutionStrategy, createSyncConflictFromQueueItem() (+11 more)

### Community 35 - "Time Entry Management Service"
Cohesion: 0.14
Nodes (19): defaultDependencies, entryMatchesFilters(), fetchContractorNames(), fetchRemoteEntries(), fetchTicketNumbers(), getLocalEntries(), mapLocalEntryToListItem(), mapRemoteRowToTimeEntry() (+11 more)

### Community 36 - "Application Package Dependencies"
Cohesion: 0.08
Nodes (24): scripts, build, clean:next, dev, dev:fresh, lint, prebuild, predev (+16 more)

### Community 37 - "Application Package Dependencies"
Cohesion: 0.09
Nodes (23): devDependencies, agentation, dotenv, eslint, eslint-config-next, jsdom, @playwright/test, shadcn (+15 more)

### Community 38 - "Verify Grid2 Schema"
Cohesion: 0.16
Nodes (21): buildSqlRunner(), CC_CORE_TABLES, checkCeoRole(), CheckContext, checkContractorNaming(), checkCoreTables(), checkGrid2Tables(), checkRlsEnabled() (+13 more)

### Community 39 - "Invoice Generation Service"
Cohesion: 0.12
Nodes (18): fetchContractorNames(), fetchExistingInvoiceCount(), fetchInvoiceDetails(), fetchInvoices(), fetchLineItemCountByInvoiceId(), fetchTax1099Tracking(), fetchTaxTrackingRowsForYear(), insertInvoice() (+10 more)

### Community 40 - "Assessment Catalog Service"
Cohesion: 0.13
Nodes (16): EquipmentSelectProps, WireSizeSelectProps, AssessmentCatalogDependencies, createAssessmentCatalogService(), defaultDependencies, EquipmentTypeOption, fetchEquipmentTypes(), fetchWireSizes() (+8 more)

### Community 41 - "Assessment Form Types"
Cohesion: 0.17
Nodes (15): createAssessmentDraftId(), createEmptyEquipmentAssessment(), DamageClassificationDraft, EquipmentAssessmentDraft, DamageClassificationProps, EquipmentAssessmentProps, TicketFiltersState, AssessmentReviewFilters (+7 more)

### Community 42 - "Expense Processing Service"
Cohesion: 0.13
Nodes (17): ExpenseFormProps, createExpenseProcessingService(), defaultDependencies, ExpenseProcessingDependencies, expenseProcessingService, ExpenseReviewDecision, ExpenseReviewFilters, mapReviewedReport() (+9 more)

### Community 43 - "Components Components"
Cohesion: 0.10
Nodes (19): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+11 more)

### Community 44 - "Storm Event Service"
Cohesion: 0.14
Nodes (19): onSubmit(), CLOSED_TICKET_STATUSES, CreateStormEventInput, getActiveTicketCountByEventId(), isActiveTicketStatus(), mapStormEventRow(), normalizeStormEventStatus(), RemoteStormEventRow (+11 more)

### Community 45 - "Assessment Review List"
Cohesion: 0.18
Nodes (15): ASSESSMENT_REVIEW_FILTER_CONTROL_CLASS, ASSESSMENT_REVIEW_LAYOUT_MODE, AssessmentReviewList(), AssessmentReviewListProps, DecisionFilterValue, DecisionSheetState, parseError(), PriorityFilterValue (+7 more)

### Community 46 - "Tsconfig Components"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 47 - "Portal Access"
Cohesion: 0.44
Nodes (6): getPortalRole(), isAdminPortalPath(), isContractorPortalPath(), isPortalPathAllowed(), normalizePath(), PortalRole

### Community 48 - "Dropdown Menu"
Cohesion: 0.06
Nodes (42): AdminLayout(), ContractorLayout(), StormLayout(), AppShell(), AppShellProps, adminNavItems, BottomNav(), BottomNavProps (+34 more)

### Community 49 - "Time Expense Tables Schema"
Cohesion: 0.19
Nodes (17): expense_items, expense_policies, expense_reports, idx_expense_item_category, idx_expense_item_date, idx_expense_item_report, idx_expense_report_contractor, idx_expense_report_period (+9 more)

### Community 50 - "Time Entry List"
Cohesion: 0.20
Nodes (16): TimeEntryCard(), TimeEntryCardProps, toWorkTypeLabel(), getTimeReviewLayoutMode(), parseError(), ReviewDecision, StatusFilterValue, TIME_REVIEW_FILTER_CONTROL_CLASS (+8 more)

### Community 51 - "Role Guards"
Cohesion: 0.36
Nodes (5): TicketsLayout(), ADMIN_CLASS_ROLES, isAdminClassRole(), SUPER_ADMIN_CLASS_ROLES, getLandingPathForRole()

### Community 52 - "Assessment Form"
Cohesion: 0.10
Nodes (35): class-variance-authority, lucide-react, AdminError(), AdminErrorProps, ContractorError(), ContractorErrorProps, GlobalError(), GlobalErrorProps (+27 more)

### Community 53 - "Use Navigation Signals"
Cohesion: 0.22
Nodes (15): buildAdminRoleSignalCounts(), buildContractorRoleSignalCounts(), buildNavigationSignals(), clampCount(), loadContractorTicketsByAssignee(), loadRoleSignalCounts(), LoadRoleSignalCountsOptions, NavigationSignalKey (+7 more)

### Community 54 - "Expense Processing"
Cohesion: 0.21
Nodes (15): ProcessedCreateInput, ExpenseDuplicateCandidate, ExpensePolicyValidationInput, ExpensePolicyValidationResult, extractLargestCurrencyAmount(), hasDuplicateExpense(), MileageCalculationInput, MileageCalculationResult (+7 more)

### Community 56 - "Ticket Intake Service"
Cohesion: 0.12
Nodes (11): @testing-library/react, remote, assertAllowed(), CreateUtilityTicketInput, getCurrentProfileRole(), TicketInsertResult, ticketIntakeService, createTemplateSnapshot() (+3 more)

### Community 57 - "Core Tables Schema"
Cohesion: 0.23
Nodes (12): contractor_banking, contractor_rates, contractors, idx_contractors_eligible, idx_contractors_profile, idx_contractors_status, idx_profiles_active, idx_profiles_email (+4 more)

### Community 58 - "Card Components"
Cohesion: 0.18
Nodes (31): AdminAccountPage(), ContractorInvitePage(), AdminDashboardPage(), StormEventsPage(), ForgotPasswordPage(), metadata, LoginPage(), metadata (+23 more)

### Community 59 - "App Config"
Cohesion: 0.22
Nodes (8): EQUIPMENT_CONDITIONS, EXPENSE_STATUS, INVOICE_STATUS, NOTIFICATION_TYPES, PRIORITY_LEVELS, SYNC_STATUS, TICKET_STATUSES, USER_ROLES

### Community 60 - "Validators Components"
Cohesion: 0.10
Nodes (24): GPSValidationState, GPSValidationStatus, UseGPSValidationOptions, GPSWorkflowReading, GPSWorkflowTarget, GPSWorkflowValidationResult, validateGPSWorkflow(), assessmentSchema (+16 more)

### Community 61 - "Sw Components"
Cohesion: 0.13
Nodes (4): CACHE_NAMES, STATIC_ASSETS, sw, SyncEvent

### Community 62 - "Route Optimization Service"
Cohesion: 0.50
Nodes (6): haversineDistanceMeters(), isValidRouteStop(), OptimizedRouteResult, optimizeRoute(), RouteStop, toRadians()

### Community 63 - "Storm Contractor Auth Alignment Schema"
Cohesion: 0.12
Nodes (5): private.active_profile_role(), protect_contractor_eligibility, protect_profile_authorization, provision_contractor_auth_profile, sync_contractor_managed_role

### Community 64 - "Clean Next Duplicates"
Cohesion: 0.17
Nodes (8): vitest, cleanNextDuplicates(), CleanResult, TARGET_DIRECTORIES, COMMON_DIR, RETOKENED_FILES, globalsCss, formatTime()

### Community 65 - "Assessment Review Service"
Cohesion: 0.29
Nodes (4): composeReviewNotes(), createAssessmentReviewService(), ReviewedAssessment, reviewRemoteAssessment()

### Community 66 - "Photo Upload Queue"
Cohesion: 0.13
Nodes (15): PhotoCaptureProps, PhotoGalleryProps, getPendingPhotos(), LocalPhoto, AssessmentPhotoMetadataInput, createPhotoUploadQueue(), defaultDependencies, inferExtensionFromMimeType() (+7 more)

### Community 68 - "Entergy Components"
Cohesion: 0.24
Nodes (10): ENTERGY_TEMPLATE, entergyPayloadSchema, incidentTypes, normalizeOptionalString(), optionalMilitaryDateTimeSchema, optionalUppercaseSchema, basePayload, DATE_TIME_LOCAL_24H_PATTERN (+2 more)

### Community 69 - "Ticket Templates Ocr Scaffold Schema"
Cohesion: 0.26
Nodes (10): idx_ticket_attachments_storm_event, idx_ticket_attachments_ticket_id, idx_ticket_extraction_sessions_status, idx_ticket_extraction_sessions_storm_event, idx_ticket_payloads_payload_gin, public.enforce_ticket_storm_utility_match(), public.ticket_attachments, public.ticket_extraction_sessions (+2 more)

### Community 70 - "Add Storm Scope To Financial"
Cohesion: 0.20
Nodes (6): idx_contractor_invoices_storm_event_id, idx_expense_reports_storm_event_id, idx_time_entries_storm_event_id, tr_enforce_expense_report_storm_scope, tr_enforce_invoice_storm_scope, tr_enforce_time_entry_storm_scope

### Community 71 - "Generate Utility Config"
Cohesion: 0.18
Nodes (11): cache, { createRequire }, fs, json(), load(), path, quote(), requireApp (+3 more)

### Community 72 - "Media Audit Tables Schema"
Cohesion: 0.26
Nodes (12): audit_logs, idx_audit_action, idx_audit_created, idx_audit_entity, idx_audit_user, idx_media_entity, idx_media_uploader, idx_sync_status (+4 more)

### Community 73 - "Storm Event Utility Template Preload"
Cohesion: 0.21
Nodes (7): idx_storm_events_ticket_template_key, idx_ticket_templates_utility_client, public.set_storm_event_ticket_template_key(), public.ticket_templates, tr_inherit_ticket_template_key, tr_set_storm_event_ticket_template_key, ux_ticket_templates_one_default_per_utility

### Community 74 - "Sw Components"
Cohesion: 0.17
Nodes (3): BACKGROUND_SYNC_TAG_TO_MESSAGE, CACHE_NAMES, STATIC_ASSETS

### Community 75 - "Expense Review List"
Cohesion: 0.11
Nodes (25): Column, ExpenseList(), ExpenseListProps, ExpenseStatusFilter, parseError(), toCategoryLabel(), toStatusVariant(), EXPENSE_REVIEW_FILTER_CONTROL_CLASS (+17 more)

### Community 76 - "Status Update Flow"
Cohesion: 0.25
Nodes (9): StatusUpdateFlowProps, StatusUpdaterProps, TicketCardProps, FIELD_STATUS_TRANSITIONS, FieldStatusTransition, getFieldStatusTransition(), isFieldStatusFlowStep(), Ticket (+1 more)

### Community 77 - "Time Entry Management Service"
Cohesion: 0.16
Nodes (9): LocalTimeEntry, SyncQueueOperation, createTimeEntryManagementService(), TimeEntryManagementDependencies, timeEntryManagementService, ClockOutRequest, timeEntryService, TimeEntryServiceDependencies (+1 more)

### Community 78 - "Storm Event Sop Master Codes"
Cohesion: 0.27
Nodes (9): idx_customers_active, idx_storm_events_city_code, idx_storm_events_customer_id, idx_storm_events_event_date, idx_storm_events_utility_id, idx_utilities_active, idx_utilities_client_key, public.customers (+1 more)

### Community 79 - "Receipt Ocr Service"
Cohesion: 0.22
Nodes (9): tesseract.js, createReceiptOcrService(), defaultDependencies, defaultRecognize(), loadRecognizer(), OcrRecognitionResult, OcrRecognizer, ReceiptOcrDependencies (+1 more)

### Community 80 - "Ticket Tables Schema"
Cohesion: 0.35
Nodes (10): idx_status_history_changed, idx_status_history_ticket, idx_tickets_assigned, idx_tickets_client, idx_tickets_coordinates, idx_tickets_priority, idx_tickets_scheduled, idx_tickets_status (+2 more)

### Community 81 - "Exif Components"
Cohesion: 0.06
Nodes (43): browser-image-compression, exifreader, assertPhotoMimeTypeAllowed(), buildPhotoPreviewUrl(), countPhotosByType(), DEFAULT_REQUIRED_PHOTO_TYPES, PHOTO_MIME_TYPES, prepareCapturedPhoto() (+35 more)

### Community 82 - "Create Storm Events Root Workflow"
Cohesion: 0.29
Nodes (7): idx_storm_events_created_at, idx_storm_events_event_code, idx_storm_events_status, idx_storm_events_utility_client, idx_tickets_storm_event, public.storm_events, update_storm_events_updated_at

### Community 83 - "Live Database Types"
Cohesion: 0.20
Nodes (9): CompositeTypes, Constants, DatabaseWithoutInternals, DefaultSchema, Enums, Json, Tables, TablesInsert (+1 more)

### Community 84 - "Triggers Schema"
Cohesion: 0.20
Nodes (6): ticket_number_trigger, ticket_status_change_trigger, update_contractors_updated_at, update_profiles_updated_at, update_tickets_updated_at, update_time_entries_updated_at

### Community 85 - "Middleware Components"
Cohesion: 0.28
Nodes (8): @supabase/ssr, isPasswordResetAllowedPath(), shouldEnforcePasswordReset(), isPublicRoute(), PUBLIC_ROUTE_PREFIXES, updateSession(), config, middleware()

### Community 86 - "Invoice Generation Service"
Cohesion: 0.27
Nodes (10): buildExpenseReportLineItems(), buildTimeEntryLineItems(), calculateTimeEntryAmount(), fetchGenerationCandidates(), fetchTicketNumbers(), getTaxYearForPeriodEnd(), parseIsoDate(), roundToCurrency() (+2 more)

### Community 88 - "Expense Item Form"
Cohesion: 0.26
Nodes (14): createInitialDraft(), ExpenseForm(), mapTicketsToOptions(), parseOptionalNumber(), toDateInputValue(), CATEGORY_OPTIONS, ExpenseItemDraft, ExpenseItemForm() (+6 more)

### Community 89 - "Seed Via Api"
Cohesion: 0.22
Nodes (5): @supabase/supabase-js, {createClient}, supabase, { createClient }, supabase

### Community 90 - "Dashboard Metrics"
Cohesion: 0.16
Nodes (16): DashboardMetrics(), DashboardMetricsProps, formatSignedTrend(), toErrorMessage(), columns, contractorService, DashboardTicketRow, dashboardTicketService (+8 more)

### Community 91 - "Work Type Options"
Cohesion: 0.31
Nodes (6): WORK_TYPE_OPTIONS, WorkTypeOption, WorkTypeSelectorProps, WORK_TYPES, ClockInRequest, WorkType

### Community 92 - "Assessment Tables Schema"
Cohesion: 0.39
Nodes (7): damage_assessments, equipment_assessments, equipment_types, hazard_categories, idx_assessment_contractor, idx_assessment_ticket, wire_sizes

### Community 93 - "Navigation Config"
Cohesion: 0.32
Nodes (6): ADMIN_BOTTOM_NAV_ITEMS, ADMIN_SIDEBAR_NAV_ITEMS, CONTRACTOR_BOTTOM_NAV_ITEMS, CONTRACTOR_SIDEBAR_NAV_ITEMS, NavigationSignalKey, NavLinkItem

### Community 94 - "Supabase Ssr.D"
Cohesion: 0.25
Nodes (4): CookieMethods, CookieOptions, CreateServerClientOptions, @supabase/ssr

### Community 95 - "Add Ceo Role And Lock"
Cohesion: 0.39
Nodes (5): idx_profiles_single_ceo, idx_profiles_single_super_admin, public.is_admin(), public.is_super_admin(), trg_enforce_fixed_executive_roles

### Community 96 - "Test Connection"
Cohesion: 0.29
Nodes (4): dotenv, __dirname, __filename, supabase

### Community 97 - "Seed Db"
Cohesion: 0.29
Nodes (3): { createClient }, path, supabase

### Community 98 - "Financial Tables Schema"
Cohesion: 0.48
Nodes (6): contractor_invoices, idx_invoice_contractor, idx_invoice_period, idx_invoice_status, invoice_line_items, tax_1099_tracking

### Community 100 - "Test Supabase Connection"
Cohesion: 0.40
Nodes (5): colors, { createClient }, log(), supabase, testConnection()

### Community 101 - "Session Timeout"
Cohesion: 0.47
Nodes (3): isSessionExpired(), MAX_INACTIVITY_MS, SESSION_ACTIVITY_COOKIE

### Community 102 - "Entergy Ticket Format"
Cohesion: 0.53
Nodes (4): buildEntergySpecialInstructions(), buildEntergyWorkDescription(), countLine(), EntergyTicketFormatInput

### Community 107 - "Fix Profiles Policy Recursion Schema"
Cohesion: 0.60
Nodes (3): public.current_user_role(), public.is_admin(), public.is_super_admin()

### Community 108 - "Eslint Components"
Cohesion: 0.50
Nodes (3): eslintConfig, eslint, eslint-config-next

### Community 145 - "Thumbnail Components"
Cohesion: 0.27
Nodes (9): generatePreview(), buildThumbnailFile(), calculateThumbnailDimensions(), fallbackResult(), generateImageThumbnail(), loadImageBitmap(), ThumbnailDimensions, ThumbnailGenerationResult (+1 more)

### Community 146 - "Assessment Submission Service"
Cohesion: 0.13
Nodes (17): AssessmentFormProps, SAFETY_FIELDS, SafetyChecklistProps, SafetyFieldConfig, updateField(), AssessmentSubmissionDependencies, assessmentSubmissionService, CreateAssessmentInput (+9 more)

### Community 147 - "Dashboard Reporting Service"
Cohesion: 0.05
Nodes (58): buildDashboardMetrics(), buildDashboardReport(), buildReportExportArtifact(), buildSimplePdf(), CLOSED_TICKET_STATUSES, CountEqClient, CountInClient, CountIsNotClient (+50 more)

### Community 148 - "Authorization Components"
Cohesion: 0.52
Nodes (5): canPerformManagementAction(), getManagementActionForPath(), ManagementAction, normalizePath(), isSuperAdminClassRole()

## Knowledge Gaps
- **553 isolated node(s):** `TicketFeatureCollection`, `TicketMarkersProps`, `ActiveTimerProps`, `DurationState`, `TimeEntrySummary` (+548 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 795 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **57 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Auth Provider` to `Map View`, `Time Tracking`, `Select Components`, `Dialog Components`, `Table Components`, `Formatters Components`, `Status Badge`, `Admin Map Screens`, `Application Package Dependencies`, `Service Worker`, `File Intake`, `Form Components`, `Magic Link Form`, `Auth Confirm Screens`, `Dexie Components`, `Assessment Review List`, `Dropdown Menu`, `Time Entry List`, `Role Guards`, `Assessment Form`, `Use Navigation Signals`, `Ticket Intake Service`, `Card Components`, `Validators Components`, `Expense Review List`, `Expense Item Form`, `Dashboard Metrics`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **Why does `vitest` connect `Clean Next Duplicates` to `Map View`, `Time Tracking`, `Dialog Components`, `Contractor Service`, `Photo Storage Service`, `Thumbnail Components`, `Application Package Dependencies`, `Assessment Submission Service`, `Authorization Components`, `User Provisioning`, `Route Components`, `Dashboard Reporting Service`, `Service Worker`, `Invoice Generation Service`, `Storm Event Service`, `File Intake`, `Dexie Components`, `Assessment Catalog Service`, `Expense Processing Service`, `Assessment Review List`, `Portal Access`, `Dropdown Menu`, `Time Entry List`, `Role Guards`, `Assessment Form`, `Use Navigation Signals`, `Expense Processing`, `Ticket Intake Service`, `Validators Components`, `Route Optimization Service`, `Assessment Review Service`, `Photo Upload Queue`, `Entergy Components`, `Expense Review List`, `Status Update Flow`, `Time Entry Management Service`, `Receipt Ocr Service`, `Exif Components`, `Middleware Components`, `Dashboard Metrics`, `Work Type Options`, `Navigation Config`, `Seed Db`, `Session Timeout`, `Entergy Ticket Format`, `Expense Submission Service`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Why does `Button()` connect `Assessment Form` to `Magic Link Form`, `Auth Confirm Screens`, `Select Components`, `Dialog Components`, `Auth Provider`, `Dashboard Metrics`, `Table Components`, `Formatters Components`, `Expense Review List`, `Status Badge`, `Assessment Review List`, `Dropdown Menu`, `Admin Map Screens`, `Time Entry List`, `Expense Item Form`, `Card Components`, `Form Components`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **What connects `TicketFeatureCollection`, `TicketMarkersProps`, `ActiveTimerProps` to the rest of the system?**
  _553 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Map View` be split into smaller, more focused modules?**
  _Cohesion score 0.11416490486257928 - nodes in this community are weakly interconnected._
- **Should `Dialog Components` be split into smaller, more focused modules?**
  _Cohesion score 0.12955465587044535 - nodes in this community are weakly interconnected._
- **Should `Auth Provider` be split into smaller, more focused modules?**
  _Cohesion score 0.09210526315789473 - nodes in this community are weakly interconnected._
## Index Scope

Code and SQL are indexed structurally. Supporting documents and image assets are excluded from this code graph. No LLM extraction tokens were used.
