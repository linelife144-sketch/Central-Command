# Graph Report - Central Command  (2026-10-03)

## Corpus Check
- 360 files · ~130,085 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 20 file(s) not represented in the graph (top: (none) 10, .ttf 7, .log 1)

## Summary
- 2225 nodes · 6080 edges · 153 communities (102 shown, 51 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 50 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `326cfff6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- SelectContent
- ReportsDashboard.tsx
- Alert
- templates/registry.ts
- Badge
- MapView.tsx
- tickets/[id]/page.tsx
- TicketFormRenderer.tsx
- SyncStatus.tsx
- contractorService.ts
- dexie.ts
- ticketService.ts
- cn
- Storm First Workflow Schema
- react
- useAuth
- dashboardReportingService.ts
- package.json
- Application Package Dependencies
- Label
- User Provisioning
- ocr-extract/route.ts
- Storm Sop Workflow Tables Schema
- expenseSubmissionService.ts
- app/layout.tsx
- PhotoCapture.tsx
- AssessmentReviewList.tsx
- assessmentReviewService.ts
- Photo Storage Service
- exif.ts
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
- Input
- photoUploadQueue.ts
- ticket-new-client-page.tsx
- timeEntryService.ts
- timeEntryManagementService.ts
- Components Components
- assessmentSubmissionService.ts
- Tsconfig Components
- TimeEntryList.tsx
- Time Expense Tables Schema
- useNavigationSignals.ts
- expenseProcessing.ts
- Storm Contractor Auth Alignment Schema
- client.ts
- stormEventService.ts
- TopBar.tsx
- AssessmentForm.tsx
- Core Tables Schema
- photoValidation.ts
- Button
- validators.ts
- middleware.ts
- generate-utility-config.cjs
- Sw Components
- contractor/map/page.tsx
- next.config.ts
- Card
- buildDashboardReport
- useGPSValidation.ts
- imageCompression.ts
- Ticket Templates Ocr Scaffold Schema
- Add Storm Scope To Financial
- Seed Via Api
- Media Audit Tables Schema
- Storm Event Utility Template Preload
- Sw Components
- Receipt Ocr Service
- thumbnail.ts
- createDashboardReportingService
- @tanstack/react-query
- Storm Event Sop Master Codes
- Ticket Tables Schema
- sessionTimeout.ts
- entergyTicketFormat.ts
- statusUpdateFlow.ts
- Create Storm Events Root Workflow
- ExpenseForm.tsx
- Triggers Schema
- PriorityLevel
- SafetyChecklist.tsx
- hash.ts
- storms/create/page.tsx
- normalizeTicketForCache
- Test Connection
- Seed Db
- LogoutHandler.tsx
- Assessment Tables Schema
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
1. `cn()` - 136 edges
2. `Button()` - 113 edges
3. `react` - 100 edges
4. `Card()` - 85 edges
5. `CardContent()` - 84 edges
6. `vitest` - 69 edges
7. `CardHeader()` - 66 edges
8. `CardTitle()` - 64 edges
9. `lucide-react` - 62 edges
10. `next` - 56 edges

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

## Communities (153 total, 51 thin omitted)

### Community 0 - "SelectContent"
Cohesion: 0.20
Nodes (27): columns, ContractorsListPage(), exportCsv(), statusOf(), addEquipmentItem(), CONDITION_OPTIONS, EquipmentAssessment(), removeEquipmentItem() (+19 more)

### Community 1 - "ReportsDashboard.tsx"
Cohesion: 0.17
Nodes (21): AdminReportsPage(), DataTable(), DataTableProps, ProtectedRoute(), ProtectedRouteProps, amountToPercent(), buildDefaultDates(), downloadArtifact() (+13 more)

### Community 2 - "Alert"
Cohesion: 0.10
Nodes (37): @hookform/resolvers, react-hook-form, AuthConfirmInner(), AuthConfirmPage(), ConfirmSkeleton(), Status, ForgotPasswordForm(), ForgotPasswordFormData (+29 more)

### Community 3 - "templates/registry.ts"
Cohesion: 0.06
Nodes (44): zod, TicketFormRendererProps, CreateUtilityTicketInput, confidence(), extractEntergyFields(), extractMatch(), EXTRACTORS, stubUtilityExtractor() (+36 more)

### Community 5 - "Badge"
Cohesion: 0.42
Nodes (7): PhotoGallery(), renderGpsStatus(), Badge(), badgeVariants, formatCoordinates(), formatDateTime(), formatFileSize()

### Community 6 - "MapView.tsx"
Cohesion: 0.11
Nodes (34): mapbox-gl, buildGeofenceFeatureCollection(), buildGeofencePolygon(), GeofenceCircle(), GeofenceCircleProps, GeofenceFeatureCollection, isRenderableGeofence(), removeGeofenceLayers() (+26 more)

### Community 7 - "tickets/[id]/page.tsx"
Cohesion: 0.12
Nodes (32): ContractorApprovalPage(), mockPending, PendingContractor, TicketDetailPage(), TicketDetailSkeleton(), dotStyles, getVariantFromStatus(), sizeStyles (+24 more)

### Community 8 - "TicketFormRenderer.tsx"
Cohesion: 0.13
Nodes (20): TicketForm(), ticketFormSchema, TicketFormValues, applyFieldFormatting(), getFieldDefault(), StormHeaderSummary, remote, TicketFormRenderer() (+12 more)

### Community 9 - "SyncStatus.tsx"
Cohesion: 0.17
Nodes (17): radix-ui, formatPayloadPreview(), formatTimestamp(), SyncStatus(), Sidebar(), SidebarProps, useSync(), DialogTrigger() (+9 more)

### Community 10 - "contractorService.ts"
Cohesion: 0.09
Nodes (22): onSubmit(), AssignableContractor, buildActiveTicketCountByContractor(), ContractorDetail, ContractorListFilters, ContractorListItem, fetchProfilesByIds(), fetchTicketRows() (+14 more)

### Community 11 - "dexie.ts"
Cohesion: 0.14
Nodes (26): dexie, addToSyncQueue(), CachedTicketFilters, createId(), createSyncConflict(), getCachedTickets(), getLatestSyncItemForEntity(), GPSLocation (+18 more)

### Community 12 - "ticketService.ts"
Cohesion: 0.12
Nodes (25): StormPage(), StormWorkspace(), StatusUpdateFlowProps, StatusUpdaterProps, TicketCardProps, TicketFiltersState, contractorService, DashboardTicketRow (+17 more)

### Community 13 - "cn"
Cohesion: 0.09
Nodes (24): react-day-picker, AvatarBadge(), AvatarGroup(), AvatarGroupCount(), AvatarImage(), Calendar(), CalendarDayButton(), CardAction() (+16 more)

### Community 14 - "Storm First Workflow Schema"
Cohesion: 0.07
Nodes (16): expense_item_storm_scope, invoice_line_storm_scope, invoice_storm_immutable, public.assign_contractor_to_storm(), public.create_storm_ticket(), public.enforce_expense_item_storm(), public.enforce_storm_payload(), public.enforce_ticket_roster_assignment() (+8 more)

### Community 15 - "react"
Cohesion: 0.24
Nodes (10): react, AdminLayout(), ContractorLayout(), StormLayout(), TicketsLayout(), AppShell(), AppShellProps, adminNavItems (+2 more)

### Community 16 - "useAuth"
Cohesion: 0.15
Nodes (25): AdminAccountPage(), AdminAssessmentReviewPage(), AdminExpenseReviewPage(), AdminTimeReviewPage(), ContractorAccountPage(), AssessmentCreateInner(), AssessmentCreateSkeleton(), AssignedAssessmentTickets() (+17 more)

### Community 17 - "dashboardReportingService.ts"
Cohesion: 0.08
Nodes (24): CLOSED_TICKET_STATUSES, CountEqClient, CountInClient, CountIsNotClient, DashboardExpenseReportRow, DashboardMetricsBuildInput, DashboardReportBuildInput, DashboardReportContractorRow (+16 more)

### Community 18 - "package.json"
Cohesion: 0.06
Nodes (30): name, private, version, clsx, crypto-js, date-fns-tz, dexie-react-hooks, html5-qrcode (+22 more)

### Community 19 - "Application Package Dependencies"
Cohesion: 0.06
Nodes (33): dependencies, browser-image-compression, class-variance-authority, clsx, cmdk, crypto-js, date-fns, date-fns-tz (+25 more)

### Community 20 - "Label"
Cohesion: 0.24
Nodes (17): cmdk, statusButtonConfig, StatusUpdater(), mocks, TicketAssign(), TicketAssignProps, Command(), CommandDialog() (+9 more)

### Community 21 - "User Provisioning"
Cohesion: 0.09
Nodes (28): AuthUserSummary, AuthUserUpsertInput, ContractorUpsertInput, ExistingSuperAdmin, isRoleAliasWarning(), normalizeEmail(), normalizeHeader(), normalizeRole() (+20 more)

### Community 22 - "ocr-extract/route.ts"
Cohesion: 0.22
Nodes (15): GET(), normalizeProfile(), PATCH(), ProfileRow, resolveAuthenticatedUser(), remote, extractError(), extractOcrText() (+7 more)

### Community 23 - "Storm Sop Workflow Tables Schema"
Cohesion: 0.13
Nodes (26): idx_auth_logs_authorized_at, idx_auth_logs_storm_event, idx_logistics_phase_category, idx_logistics_status, idx_logistics_storm_event, idx_phase_steps_phase_status, idx_phase_steps_storm_event, idx_roster_members_contractor (+18 more)

### Community 24 - "expenseSubmissionService.ts"
Cohesion: 0.12
Nodes (29): LocalExpenseItem, LocalExpenseReport, createRemote(), defaultDependencies, ExpenseStatusFilter, ExpenseSubmissionDependencies, ExpenseSyncStatus, fetchContractorNames() (+21 more)

### Community 25 - "app/layout.tsx"
Cohesion: 0.10
Nodes (26): agentation, barlow, manrope, metadata, RootLayout(), OfflineBanner(), readOnlineStatus(), shouldRenderOfflineBanner() (+18 more)

### Community 26 - "PhotoCapture.tsx"
Cohesion: 0.17
Nodes (19): ALL_PHOTO_TYPES, formatPhotoType(), PhotoCapture(), PhotoCaptureProps, PhotoGalleryProps, AssessmentPhotoMetadataInput, photoUploadQueue, assertPhotoMimeTypeAllowed() (+11 more)

### Community 27 - "AssessmentReviewList.tsx"
Cohesion: 0.13
Nodes (23): AssessmentDecisionForm(), AssessmentDecisionSheet(), AssessmentDecisionSheetProps, ASSESSMENT_REVIEW_FILTER_CONTROL_CLASS, ASSESSMENT_REVIEW_LAYOUT_MODE, AssessmentReviewList(), AssessmentReviewListProps, DecisionFilterValue (+15 more)

### Community 28 - "assessmentReviewService.ts"
Cohesion: 0.09
Nodes (32): applyFilters(), AssessmentReviewDependencies, AssessmentReviewListItem, assessmentReviewService, AssessmentReviewState, composeReviewNotes(), createAssessmentReviewService(), defaultDependencies (+24 more)

### Community 29 - "Photo Storage Service"
Cohesion: 0.11
Nodes (22): AuthClient, buildPhotoStoragePath(), ContractorsTableClient, getDefaultClient(), getFileExtension(), MediaAssetsTableClient, PHOTO_STORAGE_AUTH_ERROR, PHOTO_STORAGE_BUCKET (+14 more)

### Community 30 - "exif.ts"
Cohesion: 0.22
Nodes (14): exifreader, dmsToDecimal(), ExifTagLike, ExifTagMap, extractExifMetadataFromArrayBuffer(), extractExifMetadataFromFile(), extractExifMetadataFromTags(), normalizeNumericValue() (+6 more)

### Community 31 - "createLocal"
Cohesion: 0.28
Nodes (9): createId(), createLocal(), getExpenseMonthPeriod(), getOrCreateDraftReport(), normalizeExpenseDate(), processCreateInput(), resolveReceiptOcrText(), toRoundedAmount() (+1 more)

### Community 32 - "vitest"
Cohesion: 0.12
Nodes (19): @testing-library/react, vitest, remote, mocks, State(), canPerformManagementAction(), getManagementActionForPath(), ManagementAction (+11 more)

### Community 33 - "ExpenseReviewList.tsx"
Cohesion: 0.14
Nodes (19): Column, EXPENSE_REVIEW_FILTER_CONTROL_CLASS, ExpenseReviewList(), ExpenseReviewListProps, getExpenseReviewLayoutMode(), parseError(), REVIEWABLE_STATUSES, ReviewDecision (+11 more)

### Community 34 - "SyncProvider.tsx"
Cohesion: 0.13
Nodes (18): readOnlineStatus(), SyncContext, SyncContextValue, SyncProvider(), SyncState, ConflictResolutionStrategy, createSyncConflictFromQueueItem(), db (+10 more)

### Community 35 - "Application Package Dependencies"
Cohesion: 0.08
Nodes (24): scripts, build, clean:next, dev, dev:fresh, lint, prebuild, predev (+16 more)

### Community 36 - "types/index.ts"
Cohesion: 0.08
Nodes (27): zustand, AuthContextType, getNextPossibleStatuses(), isValidTransition(), AuthState, useAuthStore, CapturedPhoto, Contractor (+19 more)

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

### Community 42 - "Input"
Cohesion: 0.15
Nodes (19): CreateStormEventPage(), DAMAGE_CAUSE_OPTIONS, DamageClassification(), PRIORITY_OPTIONS, REPAIR_DECISION_OPTIONS, updateValue(), CATEGORY_OPTIONS, ExpenseItemForm() (+11 more)

### Community 43 - "photoUploadQueue.ts"
Cohesion: 0.19
Nodes (8): getPendingPhotos(), LocalPhoto, createPhotoUploadQueue(), defaultDependencies, inferExtensionFromMimeType(), PhotoUploadProcessResult, PhotoUploadQueueDependencies, toUploadFile()

### Community 44 - "ticket-new-client-page.tsx"
Cohesion: 0.15
Nodes (17): TicketNewPage(), TicketNewPageProps, TicketNewClientPage(), TicketNewClientPageProps, GRID_TICKETS_CHANGED_EVENT, GRID_TICKETS_VERSION_KEY, notifyTicketsChanged(), detectTicketOcrSourceType() (+9 more)

### Community 45 - "timeEntryService.ts"
Cohesion: 0.11
Nodes (22): LocalSyncStatus, LocalTimeEntry, SyncQueueOperation, TimeEntryManagementDependencies, timeEntryManagementService, buildClockInEntry(), ClockLocation, ClockOutRequest (+14 more)

### Community 46 - "timeEntryManagementService.ts"
Cohesion: 0.11
Nodes (20): createTimeEntryManagementService(), defaultDependencies, entryMatchesFilters(), fetchContractorNames(), fetchRemoteEntries(), fetchTicketNumbers(), getLocalEntries(), mapLocalEntryToListItem() (+12 more)

### Community 47 - "Components Components"
Cohesion: 0.10
Nodes (19): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+11 more)

### Community 48 - "assessmentSubmissionService.ts"
Cohesion: 0.17
Nodes (18): LocalAssessment, AssessmentEquipmentInput, composeEquipmentDescription(), createId(), createLocalAssessment(), createRemoteAssessment(), defaultDependencies, mapLocalAssessment() (+10 more)

### Community 49 - "Tsconfig Components"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 50 - "TimeEntryList.tsx"
Cohesion: 0.06
Nodes (49): date-fns, ActiveTimer(), ActiveTimerProps, TimeEntryCard(), TimeEntryCardProps, toWorkTypeLabel(), getTimeReviewLayoutMode(), parseError() (+41 more)

### Community 51 - "Time Expense Tables Schema"
Cohesion: 0.19
Nodes (17): expense_items, expense_policies, expense_reports, idx_expense_item_category, idx_expense_item_date, idx_expense_item_report, idx_expense_report_contractor, idx_expense_report_period (+9 more)

### Community 52 - "useNavigationSignals.ts"
Cohesion: 0.20
Nodes (16): SyncSnapshot, buildAdminRoleSignalCounts(), buildContractorRoleSignalCounts(), buildNavigationSignals(), clampCount(), loadContractorTicketsByAssignee(), loadRoleSignalCounts(), LoadRoleSignalCountsOptions (+8 more)

### Community 53 - "expenseProcessing.ts"
Cohesion: 0.20
Nodes (16): ProcessedCreateInput, calculateMileageExpense(), ExpenseDuplicateCandidate, ExpensePolicyValidationInput, ExpensePolicyValidationResult, extractLargestCurrencyAmount(), hasDuplicateExpense(), MileageCalculationInput (+8 more)

### Community 54 - "Storm Contractor Auth Alignment Schema"
Cohesion: 0.12
Nodes (5): private.active_profile_role(), protect_contractor_eligibility, protect_profile_authorization, provision_contractor_auth_profile, sync_contractor_managed_role

### Community 55 - "client.ts"
Cohesion: 0.12
Nodes (15): @supabase/ssr, fetchRemoteActiveEntry(), insertRemoteEntry(), mapRemoteRowToTimeEntry(), updateRemoteEntry(), CompositeTypes, Constants, Database (+7 more)

### Community 56 - "stormEventService.ts"
Cohesion: 0.07
Nodes (23): CLOSED_TICKET_STATUSES, CreateStormEventInput, getActiveTicketCountByEventId(), isActiveTicketStatus(), mapStormEventRow(), normalizeStormEventStatus(), normalizeUtilityClientValue(), RemoteStormEventRow (+15 more)

### Community 57 - "TopBar.tsx"
Cohesion: 0.20
Nodes (17): NavigationSearch(), adminNavItems, contractorNavItems, SidebarTrigger(), TopBar(), TopBarProps, CommandEmpty(), CommandGroup() (+9 more)

### Community 58 - "AssessmentForm.tsx"
Cohesion: 0.23
Nodes (14): AssessmentForm(), AssessmentFormProps, parseOptionalNumber(), toHumanPhotoType(), validateAssessmentDraft(), createAssessmentDraftId(), createDefaultDamageClassification(), createDefaultSafetyObservations() (+6 more)

### Community 59 - "Core Tables Schema"
Cohesion: 0.23
Nodes (12): contractor_banking, contractor_rates, contractors, idx_contractors_eligible, idx_contractors_profile, idx_contractors_status, idx_profiles_active, idx_profiles_email (+4 more)

### Community 60 - "photoValidation.ts"
Cohesion: 0.24
Nodes (8): PhotoExifMetadata, validatePhotoFile(), ExistingPhotoChecksum, hasGps(), PHOTO_MIME_TYPES, PhotoValidationOptions, PhotoValidationResult, validateAssessmentPhoto()

### Community 61 - "Button"
Cohesion: 0.12
Nodes (20): class-variance-authority, lucide-react, AdminDashboardPage(), quickActions, AdminError(), AdminErrorProps, AuthLayout(), ContractorError() (+12 more)

### Community 62 - "validators.ts"
Cohesion: 0.12
Nodes (15): assessmentSchema, einSchema, emailSchema, expenseItemSchema, FileValidationResult, GPSValidationResult, latitudeSchema, longitudeSchema (+7 more)

### Community 63 - "middleware.ts"
Cohesion: 0.24
Nodes (8): isPasswordResetAllowedPath(), shouldEnforcePasswordReset(), isPublicRoute(), PUBLIC_ROUTE_PREFIXES, mocks, updateSession(), config, proxy()

### Community 64 - "generate-utility-config.cjs"
Cohesion: 0.10
Nodes (17): cleanNextDuplicates(), CleanResult, TARGET_DIRECTORIES, cache, { createRequire }, fs, json(), load() (+9 more)

### Community 65 - "Sw Components"
Cohesion: 0.13
Nodes (4): CACHE_NAMES, STATIC_ASSETS, sw, SyncEvent

### Community 66 - "contractor/map/page.tsx"
Cohesion: 0.27
Nodes (11): sonner, AdminMapPage(), getTicketCenter(), toMapTicket(), ContractorMapPage(), getTicketCenter(), toMapTicket(), isValidLngLat() (+3 more)

### Community 68 - "Card"
Cohesion: 0.15
Nodes (34): next, ContractorDetailPage(), ContractorInvitePage(), StormEventsPage(), ForgotPasswordPage(), metadata, LoginPage(), metadata (+26 more)

### Community 69 - "buildDashboardReport"
Cohesion: 0.22
Nodes (9): buildDashboardReport(), getBucketLabel(), getBuckets(), getBucketStart(), normalizeNumber(), parseDateOrNull(), resolveContractorName(), roundCurrency() (+1 more)

### Community 70 - "useGPSValidation.ts"
Cohesion: 0.29
Nodes (9): GPSValidationState, GPSValidationStatus, UseGPSValidationOptions, GPSWorkflowReading, GPSWorkflowTarget, GPSWorkflowValidationResult, validateGPSWorkflow(), validateGeofence() (+1 more)

### Community 71 - "imageCompression.ts"
Cohesion: 0.27
Nodes (7): browser-image-compression, compressImageFile(), getImageCompressionOptions(), ImageCompressionLibraryOptions, ImageCompressionOptions, ImageCompressionResult, toFile()

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

### Community 79 - "thumbnail.ts"
Cohesion: 0.27
Nodes (9): generatePreview(), buildThumbnailFile(), calculateThumbnailDimensions(), fallbackResult(), generateImageThumbnail(), loadImageBitmap(), ThumbnailDimensions, ThumbnailGenerationResult (+1 more)

### Community 80 - "createDashboardReportingService"
Cohesion: 0.20
Nodes (10): createDashboardReportingService(), fetchAllTickets(), fetchContractorNames(), fetchPendingAssessments(), fetchPendingExpenseReports(), fetchPendingTimeEntries(), fetchReportExpenseReports(), fetchReportTickets() (+2 more)

### Community 82 - "Storm Event Sop Master Codes"
Cohesion: 0.27
Nodes (9): idx_customers_active, idx_storm_events_city_code, idx_storm_events_customer_id, idx_storm_events_event_date, idx_storm_events_utility_id, idx_utilities_active, idx_utilities_client_key, public.customers (+1 more)

### Community 83 - "Ticket Tables Schema"
Cohesion: 0.35
Nodes (10): idx_status_history_changed, idx_status_history_ticket, idx_tickets_assigned, idx_tickets_client, idx_tickets_coordinates, idx_tickets_priority, idx_tickets_scheduled, idx_tickets_status (+2 more)

### Community 84 - "sessionTimeout.ts"
Cohesion: 0.47
Nodes (3): isSessionExpired(), MAX_INACTIVITY_MS, SESSION_ACTIVITY_COOKIE

### Community 85 - "entergyTicketFormat.ts"
Cohesion: 0.53
Nodes (4): buildEntergySpecialInstructions(), buildEntergyWorkDescription(), countLine(), EntergyTicketFormatInput

### Community 86 - "statusUpdateFlow.ts"
Cohesion: 0.47
Nodes (4): FIELD_STATUS_TRANSITIONS, FieldStatusTransition, getFieldStatusTransition(), isFieldStatusFlowStep()

### Community 88 - "Create Storm Events Root Workflow"
Cohesion: 0.29
Nodes (7): idx_storm_events_created_at, idx_storm_events_event_code, idx_storm_events_status, idx_storm_events_utility_client, idx_tickets_storm_event, public.storm_events, update_storm_events_updated_at

### Community 89 - "ExpenseForm.tsx"
Cohesion: 0.42
Nodes (7): createInitialDraft(), ExpenseForm(), mapTicketsToOptions(), parseOptionalNumber(), toDateInputValue(), ExpenseItemDraft, ExpenseTicketOption

### Community 90 - "Triggers Schema"
Cohesion: 0.20
Nodes (6): ticket_number_trigger, ticket_status_change_trigger, update_contractors_updated_at, update_profiles_updated_at, update_tickets_updated_at, update_time_entries_updated_at

### Community 91 - "PriorityLevel"
Cohesion: 0.38
Nodes (7): DamageClassificationDraft, DamageClassificationProps, AssessmentReviewFilters, AssessmentDamageClassificationInput, RemoteDamageAssessmentInsert, PriorityLevel, RepairDecision

### Community 92 - "SafetyChecklist.tsx"
Cohesion: 0.19
Nodes (9): SAFETY_FIELDS, SafetyChecklistProps, SafetyFieldConfig, updateField(), CreateAssessmentInput, createAssessmentSubmissionService(), RemoteDamageAssessmentRow, SAFETY_OBSERVATIONS (+1 more)

### Community 93 - "hash.ts"
Cohesion: 0.39
Nodes (7): bufferToHex(), calculateSHA256Hash(), getSubtleCrypto(), HashSubtle, isArrayBuffer(), readBlobWithFileReader(), toArrayBuffer()

### Community 94 - "storms/create/page.tsx"
Cohesion: 0.29
Nodes (5): STATE_NAMES, STORM_EVENT_STATUS_OPTIONS, UTILITY_CLIENT_OPTIONS, UTILITY_CLIENTS, UtilityClient

### Community 95 - "normalizeTicketForCache"
Cohesion: 0.25
Nodes (7): cacheTicket(), cacheTickets(), deriveSyncStatus(), GridElectricDatabase, normalizeTicketForCache(), replaceTicketCache(), toIsoTimestamp()

### Community 96 - "Test Connection"
Cohesion: 0.29
Nodes (4): dotenv, __dirname, __filename, supabase

### Community 97 - "Seed Db"
Cohesion: 0.29
Nodes (3): { createClient }, path, supabase

### Community 99 - "Assessment Tables Schema"
Cohesion: 0.39
Nodes (7): damage_assessments, equipment_assessments, equipment_types, hazard_categories, idx_assessment_contractor, idx_assessment_ticket, wire_sizes

### Community 101 - "Navigation Config"
Cohesion: 0.32
Nodes (6): ADMIN_BOTTOM_NAV_ITEMS, ADMIN_SIDEBAR_NAV_ITEMS, CONTRACTOR_BOTTOM_NAV_ITEMS, CONTRACTOR_SIDEBAR_NAV_ITEMS, NavigationSignalKey, NavLinkItem

### Community 103 - "routeOptimizationService.ts"
Cohesion: 0.50
Nodes (6): haversineDistanceMeters(), isValidRouteStop(), OptimizedRouteResult, optimizeRoute(), RouteStop, toRadians()

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
- **530 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+525 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 761 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **51 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `Alert`, `templates/registry.ts`, `MapView.tsx`, `TicketFormRenderer.tsx`, `contractorService.ts`, `ticketService.ts`, `package.json`, `Label`, `User Provisioning`, `ocr-extract/route.ts`, `app/layout.tsx`, `PhotoCapture.tsx`, `AssessmentReviewList.tsx`, `assessmentReviewService.ts`, `Photo Storage Service`, `exif.ts`, `ExpenseReviewList.tsx`, `SyncProvider.tsx`, `buildReportExportArtifact`, `expenseProcessingService.ts`, `Assessment Catalog Service`, `photoUploadQueue.ts`, `ticket-new-client-page.tsx`, `timeEntryService.ts`, `timeEntryManagementService.ts`, `TimeEntryList.tsx`, `useNavigationSignals.ts`, `expenseProcessing.ts`, `stormEventService.ts`, `photoValidation.ts`, `Button`, `middleware.ts`, `generate-utility-config.cjs`, `useGPSValidation.ts`, `imageCompression.ts`, `Receipt Ocr Service`, `thumbnail.ts`, `sessionTimeout.ts`, `entergyTicketFormat.ts`, `statusUpdateFlow.ts`, `SafetyChecklist.tsx`, `hash.ts`, `Seed Db`, `LogoutHandler.tsx`, `Navigation Config`, `routeOptimizationService.ts`, `Expense Submission Service`?**
  _High betweenness centrality (0.146) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `SelectContent`, `ReportsDashboard.tsx`, `Alert`, `Badge`, `MapView.tsx`, `tickets/[id]/page.tsx`, `TicketFormRenderer.tsx`, `SyncStatus.tsx`, `ticketService.ts`, `cn`, `useAuth`, `package.json`, `Label`, `app/layout.tsx`, `PhotoCapture.tsx`, `AssessmentReviewList.tsx`, `vitest`, `ExpenseReviewList.tsx`, `SyncProvider.tsx`, `Input`, `ticket-new-client-page.tsx`, `TimeEntryList.tsx`, `useNavigationSignals.ts`, `stormEventService.ts`, `TopBar.tsx`, `AssessmentForm.tsx`, `Button`, `contractor/map/page.tsx`, `Card`, `useGPSValidation.ts`, `@tanstack/react-query`, `ExpenseForm.tsx`, `storms/create/page.tsx`, `LogoutHandler.tsx`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **Why does `cn()` connect `cn` to `SelectContent`, `ReportsDashboard.tsx`, `Alert`, `Card`, `Badge`, `MapView.tsx`, `tickets/[id]/page.tsx`, `TicketFormRenderer.tsx`, `SyncStatus.tsx`, `Input`, `react`, `TimeEntryList.tsx`, `Label`, `TopBar.tsx`, `AssessmentReviewList.tsx`, `Button`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _530 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Alert` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `templates/registry.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.059907834101382486 - nodes in this community are weakly interconnected._
- **Should `MapView.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1101010101010101 - nodes in this community are weakly interconnected._