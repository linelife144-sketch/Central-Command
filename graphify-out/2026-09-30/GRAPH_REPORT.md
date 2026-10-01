# Graph Report - Central Command  (2026-09-30)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2297 nodes · 6248 edges · 160 communities (103 shown, 57 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 61 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b650e8be`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- MapView.tsx
- ActiveTimer.tsx
- SelectContent
- StatusUpdater.tsx
- react
- 20261001033725_storm_first_workflow.sql
- cn
- contractorService.ts
- dexie.ts
- photoStorageService.ts
- InvoiceList.tsx
- localTestStore.ts
- tickets/[id]/page.tsx
- types/index.ts
- timeEntryService.ts
- assessmentReviewService.ts
- TimeClock.tsx
- package.json
- dependencies
- userProvisioning.ts
- 20260218102000_storm_sop_workflow_tables.sql
- ocr-extract/route.ts
- templates/registry.ts
- expenseSubmissionService.ts
- app/layout.tsx
- ocr/registry.ts
- createRemoteAssessment
- invoiceGenerationService.ts
- stormEventService.test.ts
- ticket-new-client-page.tsx
- TicketFormRenderer.tsx
- Input
- next
- SyncProvider.tsx
- timeEntryManagementService.ts
- scripts
- devDependencies
- verify-grid2-schema.ts
- client.ts
- assessmentCatalogService.ts
- assessmentFormTypes.ts
- expenseProcessingService.ts
- components.json
- stormEventService.ts
- AssessmentReviewList.tsx
- compilerOptions
- portalAccess.ts
- AssessmentDecisionSheet.tsx
- 04_time_expense_tables.sql
- TimeEntryList.tsx
- roleGuards.ts
- Button
- useNavigationSignals.ts
- expenseProcessing.ts
- ticketIntakeService.ts
- profiles
- Card
- appConfig.ts
- validators.ts
- sw.ts
- routeOptimizationService.ts
- 20261001033742_storm_contractor_auth_alignment.sql
- vitest
- assessmentReviewService.test.ts
- photoUploadQueue.ts
- templates/entergy.ts
- 20260217181000_ticket_templates_ocr_scaffold.sql
- 20260218103000_add_storm_scope_to_financial_ops.sql
- generate-utility-config.cjs
- 07_media_audit_tables.sql
- 20260218001000_storm_event_utility_template_preload.sql
- sw.js
- ExpenseReviewList.tsx
- Ticket
- TimeEntry
- 20260218100000_storm_event_sop_master_codes.sql
- receiptOcrService.ts
- tickets
- assessmentPhotos.ts
- 20260214194000_create_storm_events_root_workflow.sql
- database.ts
- 09_triggers.sql
- supabase/middleware.ts
- fetchGenerationCandidates
- ExpenseForm.tsx
- @supabase/supabase-js
- DashboardMetrics.tsx
- time-tracking/index.ts
- 05_assessment_tables.sql
- navigationConfig.ts
- supabase-ssr.d.ts
- 20260219193000_add_ceo_role_and_lock_executive_profiles.sql
- test-connection.mjs
- seed-db.js
- contractor_invoices
- test-supabase-connection.js
- sessionTimeout.ts
- entergyTicketFormat.ts
- 20260218101000_storm_event_code_trigger.sql
- expenseSubmissionService.test.ts
- 20260215001000_fix_profiles_policy_recursion.sql
- eslint.config.mjs
- 20260214182500_allow_two_super_admins_and_promote_jeanie.sql
- 20260219060000_add_ceo_role_and_promote_profile.sql
- postcss.config.mjs
- thumbnail.ts
- assessmentSubmissionService.ts
- dashboardReportingService.ts
- authorization.ts
- utilityClients.ts

## God Nodes (most connected - your core abstractions)
1. `cn()` - 134 edges
2. `Button()` - 117 edges
3. `react` - 99 edges
4. `Card()` - 91 edges
5. `CardContent()` - 90 edges
6. `CardHeader()` - 68 edges
7. `CardTitle()` - 66 edges
8. `vitest` - 64 edges
9. `lucide-react` - 64 edges
10. `Input()` - 50 edges

## Surprising Connections (you probably didn't know these)
- `fetchProfilesByIds()` --calls--> `isAuthOrPermissionError()`  [EXTRACTED]
  src/lib/services/contractorService.ts → src/lib/utils/errorHandling.ts
- `fetchTicketRows()` --calls--> `isAuthOrPermissionError()`  [EXTRACTED]
  src/lib/services/contractorService.ts → src/lib/utils/errorHandling.ts
- `CommandGroup()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/command.tsx → src/lib/utils.ts
- `CommandInput()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/command.tsx → src/lib/utils.ts
- `CommandItem()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/command.tsx → src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (160 total, 57 thin omitted)

### Community 0 - "MapView.tsx"
Cohesion: 0.11
Nodes (34): mapbox-gl, buildGeofenceFeatureCollection(), buildGeofencePolygon(), GeofenceCircle(), GeofenceCircleProps, GeofenceFeatureCollection, isRenderableGeofence(), removeGeofenceLayers() (+26 more)

### Community 1 - "ActiveTimer.tsx"
Cohesion: 0.26
Nodes (15): ActiveTimer(), ActiveTimerProps, formatDuration(), calculateBillableAmount(), calculateBillableMinutes(), calculateElapsedMinutes(), calculateElapsedSeconds(), calculateTimeEntrySummary() (+7 more)

### Community 2 - "SelectContent"
Cohesion: 0.17
Nodes (34): ContractorsListPage(), CreateStormEventPage(), STATE_NAMES, STORM_EVENT_STATUS_OPTIONS, UTILITY_CLIENT_OPTIONS, DAMAGE_CAUSE_OPTIONS, DamageClassification(), PRIORITY_OPTIONS (+26 more)

### Community 3 - "StatusUpdater.tsx"
Cohesion: 0.13
Nodes (29): cmdk, formatPayloadPreview(), formatTimestamp(), SyncStatus(), statusButtonConfig, StatusUpdater(), mocks, TicketAssign() (+21 more)

### Community 4 - "react"
Cohesion: 0.09
Nodes (33): react, AdminAssessmentReviewPage(), columns, Contractor, mockContractors, AdminExpenseReviewPage(), AdminReportsPage(), StormPage() (+25 more)

### Community 5 - "20261001033725_storm_first_workflow.sql"
Cohesion: 0.07
Nodes (17): expense_item_storm_scope, invoice_line_storm_scope, invoice_storm_immutable, public.assign_contractor_to_storm(), public.create_storm_ticket(), public.enforce_expense_item_storm(), public.enforce_storm_payload(), public.enforce_ticket_roster_assignment() (+9 more)

### Community 6 - "cn"
Cohesion: 0.10
Nodes (37): radix-ui, @radix-ui/react-progress, DataTable(), DataTableProps, amountToPercent(), buildDefaultDates(), downloadArtifact(), ReportsDashboard() (+29 more)

### Community 7 - "contractorService.ts"
Cohesion: 0.08
Nodes (17): AssignableContractor, buildActiveTicketCountByContractor(), buildYtdEarningsByContractor(), ContractorDetail, ContractorListFilters, ContractorListItem, fetchProfilesByIds(), fetchTicketRows() (+9 more)

### Community 8 - "dexie.ts"
Cohesion: 0.11
Nodes (32): addToSyncQueue(), CachedTicketFilters, cacheTicket(), cacheTickets(), createId(), createSyncConflict(), deriveSyncStatus(), getCachedTickets() (+24 more)

### Community 9 - "photoStorageService.ts"
Cohesion: 0.11
Nodes (22): AuthClient, buildPhotoStoragePath(), ContractorsTableClient, getDefaultClient(), getFileExtension(), MediaAssetsTableClient, PHOTO_STORAGE_AUTH_ERROR, PHOTO_STORAGE_BUCKET (+14 more)

### Community 10 - "InvoiceList.tsx"
Cohesion: 0.12
Nodes (20): date-fns, getDefaultPeriod(), InvoiceGenerator(), InvoiceGeneratorProps, parseError(), toDateInputValue(), InvoiceList(), InvoiceListProps (+12 more)

### Community 11 - "localTestStore.ts"
Cohesion: 0.18
Nodes (8): StormEventSummary, LOCAL_TEST_STORAGE_KEY, LocalHistoryEntry, LocalTestData, readData(), requireLocalTesting(), saveData(), TicketStatusHistory

### Community 12 - "tickets/[id]/page.tsx"
Cohesion: 0.15
Nodes (26): ContractorApprovalPage(), mockPending, PendingContractor, ContractorDetailPage(), mockContractor, TicketDetailPage(), TicketDetailSkeleton(), dotStyles (+18 more)

### Community 13 - "types/index.ts"
Cohesion: 0.09
Nodes (25): zustand, AuthContextType, getNextPossibleStatuses(), isValidTransition(), AuthState, useAuthStore, CapturedPhoto, Contractor (+17 more)

### Community 14 - "timeEntryService.ts"
Cohesion: 0.13
Nodes (18): LocalSyncStatus, buildClockInEntry(), ClockLocation, createEntryId(), createTimeEntryService(), defaultDependencies, fetchRemoteActiveEntry(), insertRemoteEntry() (+10 more)

### Community 15 - "assessmentReviewService.ts"
Cohesion: 0.12
Nodes (27): LocalAssessment, applyFilters(), AssessmentReviewDependencies, assessmentReviewService, AssessmentReviewState, defaultDependencies, fetchContractorNames(), fetchEquipmentCounts() (+19 more)

### Community 17 - "TimeClock.tsx"
Cohesion: 0.16
Nodes (18): sonner, AdminMapPage(), getTicketCenter(), toMapTicket(), ContractorMapPage(), getTicketCenter(), toMapTicket(), ACCEPTED_RECEIPT_TYPES (+10 more)

### Community 18 - "package.json"
Cohesion: 0.06
Nodes (31): name, private, version, clsx, crypto-js, date-fns-tz, dexie, dexie-react-hooks (+23 more)

### Community 19 - "dependencies"
Cohesion: 0.06
Nodes (33): dependencies, browser-image-compression, class-variance-authority, clsx, cmdk, crypto-js, date-fns, date-fns-tz (+25 more)

### Community 20 - "userProvisioning.ts"
Cohesion: 0.09
Nodes (28): AuthUserSummary, AuthUserUpsertInput, ContractorUpsertInput, ExistingSuperAdmin, isRoleAliasWarning(), normalizeEmail(), normalizeHeader(), normalizeRole() (+20 more)

### Community 21 - "20260218102000_storm_sop_workflow_tables.sql"
Cohesion: 0.13
Nodes (26): idx_auth_logs_authorized_at, idx_auth_logs_storm_event, idx_logistics_phase_category, idx_logistics_status, idx_logistics_storm_event, idx_phase_steps_phase_status, idx_phase_steps_storm_event, idx_roster_members_contractor (+18 more)

### Community 22 - "ocr-extract/route.ts"
Cohesion: 0.20
Nodes (16): GET(), normalizeProfile(), PATCH(), ProfileRow, resolveAuthenticatedUser(), remote, extractError(), extractOcrText() (+8 more)

### Community 23 - "templates/registry.ts"
Cohesion: 0.12
Nodes (22): zod, TicketFormRendererProps, CENTERPOINT_TEMPLATE, centerpointPayloadSchema, DUKE_TEMPLATE, dukePayloadSchema, FPL_TEMPLATE, fplPayloadSchema (+14 more)

### Community 24 - "expenseSubmissionService.ts"
Cohesion: 0.11
Nodes (38): LocalExpenseItem, LocalExpenseReport, createId(), createLocal(), createRemote(), defaultDependencies, ExpenseStatusFilter, ExpenseSubmissionDependencies (+30 more)

### Community 25 - "app/layout.tsx"
Cohesion: 0.12
Nodes (23): agentation, next-themes, metadata, RootLayout(), OfflineBanner(), readOnlineStatus(), shouldRenderOfflineBanner(), AuthProvider() (+15 more)

### Community 26 - "ocr/registry.ts"
Cohesion: 0.23
Nodes (10): confidence(), extractEntergyFields(), extractMatch(), EXTRACTORS, runUtilityOcrExtraction(), stubUtilityExtractor(), TicketOcrExtractionResult, TicketOcrExtractor (+2 more)

### Community 27 - "createRemoteAssessment"
Cohesion: 0.21
Nodes (12): composeEquipmentDescription(), createId(), createLocalAssessment(), createRemoteAssessment(), mapLocalAssessment(), mapRemoteAssessment(), normalizeOptionalText(), resolveContractorId() (+4 more)

### Community 28 - "invoiceGenerationService.ts"
Cohesion: 0.07
Nodes (30): InvoicePDFViewerProps, createInvoiceGenerationService(), CreateInvoiceLineItemInput, defaultDependencies, GeneratedInvoiceResult, GenerateInvoicesInput, GenerateInvoicesResult, InsertInvoiceInput (+22 more)

### Community 30 - "ticket-new-client-page.tsx"
Cohesion: 0.13
Nodes (17): TicketNewPage(), TicketNewPageProps, TicketNewClientPage(), TicketNewClientPageProps, notifyTicketsChanged(), detectTicketOcrSourceType(), getNormalizedExtension(), TICKET_OCR_ACCEPT_ATTRIBUTE (+9 more)

### Community 31 - "TicketFormRenderer.tsx"
Cohesion: 0.15
Nodes (21): @hookform/resolvers, react-hook-form, TicketForm(), ticketFormSchema, TicketFormValues, applyFieldFormatting(), getFieldDefault(), StormHeaderSummary (+13 more)

### Community 32 - "Input"
Cohesion: 0.12
Nodes (23): ForgotPasswordForm(), ForgotPasswordFormData, forgotPasswordSchema, LoginForm(), LoginFormData, loginSchema, EmailFormData, emailSchema (+15 more)

### Community 33 - "next"
Cohesion: 0.13
Nodes (8): nextConfig, next, AuthConfirmInner(), AuthConfirmPage(), ConfirmSkeleton(), Status, BrandMarkProps, BrandMarkVariant

### Community 34 - "SyncProvider.tsx"
Cohesion: 0.13
Nodes (19): readOnlineStatus(), SyncContext, SyncContextValue, SyncProvider(), SyncSnapshot, SyncState, ConflictResolutionStrategy, createSyncConflictFromQueueItem() (+11 more)

### Community 35 - "timeEntryManagementService.ts"
Cohesion: 0.14
Nodes (19): defaultDependencies, entryMatchesFilters(), fetchContractorNames(), fetchRemoteEntries(), fetchTicketNumbers(), getLocalEntries(), mapLocalEntryToListItem(), mapRemoteRowToTimeEntry() (+11 more)

### Community 36 - "scripts"
Cohesion: 0.08
Nodes (24): scripts, build, clean:next, dev, dev:fresh, lint, prebuild, predev (+16 more)

### Community 37 - "devDependencies"
Cohesion: 0.09
Nodes (23): devDependencies, agentation, dotenv, eslint, eslint-config-next, jsdom, @playwright/test, shadcn (+15 more)

### Community 38 - "verify-grid2-schema.ts"
Cohesion: 0.16
Nodes (21): buildSqlRunner(), CC_CORE_TABLES, checkCeoRole(), CheckContext, checkContractorNaming(), checkCoreTables(), checkGrid2Tables(), checkRlsEnabled() (+13 more)

### Community 39 - "client.ts"
Cohesion: 0.12
Nodes (18): fetchContractorNames(), fetchExistingInvoiceCount(), fetchInvoiceDetails(), fetchInvoices(), fetchLineItemCountByInvoiceId(), fetchTax1099Tracking(), fetchTaxTrackingRowsForYear(), insertInvoice() (+10 more)

### Community 40 - "assessmentCatalogService.ts"
Cohesion: 0.13
Nodes (16): EquipmentSelectProps, WireSizeSelectProps, AssessmentCatalogDependencies, createAssessmentCatalogService(), defaultDependencies, EquipmentTypeOption, fetchEquipmentTypes(), fetchWireSizes() (+8 more)

### Community 41 - "assessmentFormTypes.ts"
Cohesion: 0.17
Nodes (15): createAssessmentDraftId(), createEmptyEquipmentAssessment(), DamageClassificationDraft, EquipmentAssessmentDraft, DamageClassificationProps, EquipmentAssessmentProps, TicketFiltersState, AssessmentReviewFilters (+7 more)

### Community 42 - "expenseProcessingService.ts"
Cohesion: 0.13
Nodes (17): ExpenseFormProps, createExpenseProcessingService(), defaultDependencies, ExpenseProcessingDependencies, expenseProcessingService, ExpenseReviewDecision, ExpenseReviewFilters, mapReviewedReport() (+9 more)

### Community 43 - "components.json"
Cohesion: 0.10
Nodes (19): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+11 more)

### Community 44 - "stormEventService.ts"
Cohesion: 0.14
Nodes (19): onSubmit(), CLOSED_TICKET_STATUSES, CreateStormEventInput, getActiveTicketCountByEventId(), isActiveTicketStatus(), mapStormEventRow(), normalizeStormEventStatus(), RemoteStormEventRow (+11 more)

### Community 45 - "AssessmentReviewList.tsx"
Cohesion: 0.18
Nodes (15): ASSESSMENT_REVIEW_FILTER_CONTROL_CLASS, ASSESSMENT_REVIEW_LAYOUT_MODE, AssessmentReviewList(), AssessmentReviewListProps, DecisionFilterValue, DecisionSheetState, parseError(), PriorityFilterValue (+7 more)

### Community 46 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 47 - "portalAccess.ts"
Cohesion: 0.44
Nodes (6): getPortalRole(), isAdminPortalPath(), isContractorPortalPath(), isPortalPathAllowed(), normalizePath(), PortalRole

### Community 48 - "AssessmentDecisionSheet.tsx"
Cohesion: 0.06
Nodes (42): AdminLayout(), ContractorLayout(), StormLayout(), AppShell(), AppShellProps, adminNavItems, BottomNav(), BottomNavProps (+34 more)

### Community 49 - "04_time_expense_tables.sql"
Cohesion: 0.19
Nodes (17): expense_items, expense_policies, expense_reports, idx_expense_item_category, idx_expense_item_date, idx_expense_item_report, idx_expense_report_contractor, idx_expense_report_period (+9 more)

### Community 50 - "TimeEntryList.tsx"
Cohesion: 0.20
Nodes (16): TimeEntryCard(), TimeEntryCardProps, toWorkTypeLabel(), getTimeReviewLayoutMode(), parseError(), ReviewDecision, StatusFilterValue, TIME_REVIEW_FILTER_CONTROL_CLASS (+8 more)

### Community 51 - "roleGuards.ts"
Cohesion: 0.36
Nodes (5): TicketsLayout(), ADMIN_CLASS_ROLES, isAdminClassRole(), SUPER_ADMIN_CLASS_ROLES, getLandingPathForRole()

### Community 52 - "Button"
Cohesion: 0.10
Nodes (35): class-variance-authority, lucide-react, AdminError(), AdminErrorProps, ContractorError(), ContractorErrorProps, GlobalError(), GlobalErrorProps (+27 more)

### Community 53 - "useNavigationSignals.ts"
Cohesion: 0.22
Nodes (15): buildAdminRoleSignalCounts(), buildContractorRoleSignalCounts(), buildNavigationSignals(), clampCount(), loadContractorTicketsByAssignee(), loadRoleSignalCounts(), LoadRoleSignalCountsOptions, NavigationSignalKey (+7 more)

### Community 54 - "expenseProcessing.ts"
Cohesion: 0.21
Nodes (15): ProcessedCreateInput, ExpenseDuplicateCandidate, ExpensePolicyValidationInput, ExpensePolicyValidationResult, extractLargestCurrencyAmount(), hasDuplicateExpense(), MileageCalculationInput, MileageCalculationResult (+7 more)

### Community 56 - "ticketIntakeService.ts"
Cohesion: 0.12
Nodes (11): @testing-library/react, remote, assertAllowed(), CreateUtilityTicketInput, getCurrentProfileRole(), TicketInsertResult, ticketIntakeService, createTemplateSnapshot() (+3 more)

### Community 57 - "profiles"
Cohesion: 0.23
Nodes (12): contractor_banking, contractor_rates, contractors, idx_contractors_eligible, idx_contractors_profile, idx_contractors_status, idx_profiles_active, idx_profiles_email (+4 more)

### Community 58 - "Card"
Cohesion: 0.18
Nodes (31): AdminAccountPage(), ContractorInvitePage(), AdminDashboardPage(), StormEventsPage(), ForgotPasswordPage(), metadata, LoginPage(), metadata (+23 more)

### Community 59 - "appConfig.ts"
Cohesion: 0.22
Nodes (8): EQUIPMENT_CONDITIONS, EXPENSE_STATUS, INVOICE_STATUS, NOTIFICATION_TYPES, PRIORITY_LEVELS, SYNC_STATUS, TICKET_STATUSES, USER_ROLES

### Community 60 - "validators.ts"
Cohesion: 0.10
Nodes (24): GPSValidationState, GPSValidationStatus, UseGPSValidationOptions, GPSWorkflowReading, GPSWorkflowTarget, GPSWorkflowValidationResult, validateGPSWorkflow(), assessmentSchema (+16 more)

### Community 61 - "sw.ts"
Cohesion: 0.13
Nodes (4): CACHE_NAMES, STATIC_ASSETS, sw, SyncEvent

### Community 62 - "routeOptimizationService.ts"
Cohesion: 0.50
Nodes (6): haversineDistanceMeters(), isValidRouteStop(), OptimizedRouteResult, optimizeRoute(), RouteStop, toRadians()

### Community 63 - "20261001033742_storm_contractor_auth_alignment.sql"
Cohesion: 0.12
Nodes (5): private.active_profile_role(), protect_contractor_eligibility, protect_profile_authorization, provision_contractor_auth_profile, sync_contractor_managed_role

### Community 64 - "vitest"
Cohesion: 0.17
Nodes (8): vitest, cleanNextDuplicates(), CleanResult, TARGET_DIRECTORIES, COMMON_DIR, RETOKENED_FILES, globalsCss, formatTime()

### Community 65 - "assessmentReviewService.test.ts"
Cohesion: 0.29
Nodes (4): composeReviewNotes(), createAssessmentReviewService(), ReviewedAssessment, reviewRemoteAssessment()

### Community 66 - "photoUploadQueue.ts"
Cohesion: 0.13
Nodes (15): PhotoCaptureProps, PhotoGalleryProps, getPendingPhotos(), LocalPhoto, AssessmentPhotoMetadataInput, createPhotoUploadQueue(), defaultDependencies, inferExtensionFromMimeType() (+7 more)

### Community 68 - "templates/entergy.ts"
Cohesion: 0.24
Nodes (10): ENTERGY_TEMPLATE, entergyPayloadSchema, incidentTypes, normalizeOptionalString(), optionalMilitaryDateTimeSchema, optionalUppercaseSchema, basePayload, DATE_TIME_LOCAL_24H_PATTERN (+2 more)

### Community 69 - "20260217181000_ticket_templates_ocr_scaffold.sql"
Cohesion: 0.26
Nodes (10): idx_ticket_attachments_storm_event, idx_ticket_attachments_ticket_id, idx_ticket_extraction_sessions_status, idx_ticket_extraction_sessions_storm_event, idx_ticket_payloads_payload_gin, public.enforce_ticket_storm_utility_match(), public.ticket_attachments, public.ticket_extraction_sessions (+2 more)

### Community 70 - "20260218103000_add_storm_scope_to_financial_ops.sql"
Cohesion: 0.20
Nodes (6): idx_contractor_invoices_storm_event_id, idx_expense_reports_storm_event_id, idx_time_entries_storm_event_id, tr_enforce_expense_report_storm_scope, tr_enforce_invoice_storm_scope, tr_enforce_time_entry_storm_scope

### Community 71 - "generate-utility-config.cjs"
Cohesion: 0.18
Nodes (11): cache, { createRequire }, fs, json(), load(), path, quote(), requireApp (+3 more)

### Community 72 - "07_media_audit_tables.sql"
Cohesion: 0.26
Nodes (12): audit_logs, idx_audit_action, idx_audit_created, idx_audit_entity, idx_audit_user, idx_media_entity, idx_media_uploader, idx_sync_status (+4 more)

### Community 73 - "20260218001000_storm_event_utility_template_preload.sql"
Cohesion: 0.21
Nodes (7): idx_storm_events_ticket_template_key, idx_ticket_templates_utility_client, public.set_storm_event_ticket_template_key(), public.ticket_templates, tr_inherit_ticket_template_key, tr_set_storm_event_ticket_template_key, ux_ticket_templates_one_default_per_utility

### Community 74 - "sw.js"
Cohesion: 0.17
Nodes (3): BACKGROUND_SYNC_TAG_TO_MESSAGE, CACHE_NAMES, STATIC_ASSETS

### Community 75 - "ExpenseReviewList.tsx"
Cohesion: 0.11
Nodes (25): Column, ExpenseList(), ExpenseListProps, ExpenseStatusFilter, parseError(), toCategoryLabel(), toStatusVariant(), EXPENSE_REVIEW_FILTER_CONTROL_CLASS (+17 more)

### Community 76 - "Ticket"
Cohesion: 0.25
Nodes (9): StatusUpdateFlowProps, StatusUpdaterProps, TicketCardProps, FIELD_STATUS_TRANSITIONS, FieldStatusTransition, getFieldStatusTransition(), isFieldStatusFlowStep(), Ticket (+1 more)

### Community 77 - "TimeEntry"
Cohesion: 0.16
Nodes (9): LocalTimeEntry, SyncQueueOperation, createTimeEntryManagementService(), TimeEntryManagementDependencies, timeEntryManagementService, ClockOutRequest, timeEntryService, TimeEntryServiceDependencies (+1 more)

### Community 78 - "20260218100000_storm_event_sop_master_codes.sql"
Cohesion: 0.27
Nodes (9): idx_customers_active, idx_storm_events_city_code, idx_storm_events_customer_id, idx_storm_events_event_date, idx_storm_events_utility_id, idx_utilities_active, idx_utilities_client_key, public.customers (+1 more)

### Community 79 - "receiptOcrService.ts"
Cohesion: 0.22
Nodes (9): tesseract.js, createReceiptOcrService(), defaultDependencies, defaultRecognize(), loadRecognizer(), OcrRecognitionResult, OcrRecognizer, ReceiptOcrDependencies (+1 more)

### Community 80 - "tickets"
Cohesion: 0.35
Nodes (10): idx_status_history_changed, idx_status_history_ticket, idx_tickets_assigned, idx_tickets_client, idx_tickets_coordinates, idx_tickets_priority, idx_tickets_scheduled, idx_tickets_status (+2 more)

### Community 81 - "assessmentPhotos.ts"
Cohesion: 0.06
Nodes (43): browser-image-compression, exifreader, assertPhotoMimeTypeAllowed(), buildPhotoPreviewUrl(), countPhotosByType(), DEFAULT_REQUIRED_PHOTO_TYPES, PHOTO_MIME_TYPES, prepareCapturedPhoto() (+35 more)

### Community 82 - "20260214194000_create_storm_events_root_workflow.sql"
Cohesion: 0.29
Nodes (7): idx_storm_events_created_at, idx_storm_events_event_code, idx_storm_events_status, idx_storm_events_utility_client, idx_tickets_storm_event, public.storm_events, update_storm_events_updated_at

### Community 83 - "database.ts"
Cohesion: 0.20
Nodes (9): CompositeTypes, Constants, DatabaseWithoutInternals, DefaultSchema, Enums, Json, Tables, TablesInsert (+1 more)

### Community 84 - "09_triggers.sql"
Cohesion: 0.20
Nodes (6): ticket_number_trigger, ticket_status_change_trigger, update_contractors_updated_at, update_profiles_updated_at, update_tickets_updated_at, update_time_entries_updated_at

### Community 85 - "supabase/middleware.ts"
Cohesion: 0.28
Nodes (8): @supabase/ssr, isPasswordResetAllowedPath(), shouldEnforcePasswordReset(), isPublicRoute(), PUBLIC_ROUTE_PREFIXES, updateSession(), config, middleware()

### Community 86 - "fetchGenerationCandidates"
Cohesion: 0.27
Nodes (10): buildExpenseReportLineItems(), buildTimeEntryLineItems(), calculateTimeEntryAmount(), fetchGenerationCandidates(), fetchTicketNumbers(), getTaxYearForPeriodEnd(), parseIsoDate(), roundToCurrency() (+2 more)

### Community 88 - "ExpenseForm.tsx"
Cohesion: 0.26
Nodes (14): createInitialDraft(), ExpenseForm(), mapTicketsToOptions(), parseOptionalNumber(), toDateInputValue(), CATEGORY_OPTIONS, ExpenseItemDraft, ExpenseItemForm() (+6 more)

### Community 89 - "@supabase/supabase-js"
Cohesion: 0.22
Nodes (5): @supabase/supabase-js, {createClient}, supabase, { createClient }, supabase

### Community 90 - "DashboardMetrics.tsx"
Cohesion: 0.16
Nodes (16): DashboardMetrics(), DashboardMetricsProps, formatSignedTrend(), toErrorMessage(), columns, contractorService, DashboardTicketRow, dashboardTicketService (+8 more)

### Community 91 - "time-tracking/index.ts"
Cohesion: 0.31
Nodes (6): WORK_TYPE_OPTIONS, WorkTypeOption, WorkTypeSelectorProps, WORK_TYPES, ClockInRequest, WorkType

### Community 92 - "05_assessment_tables.sql"
Cohesion: 0.39
Nodes (7): damage_assessments, equipment_assessments, equipment_types, hazard_categories, idx_assessment_contractor, idx_assessment_ticket, wire_sizes

### Community 93 - "navigationConfig.ts"
Cohesion: 0.32
Nodes (6): ADMIN_BOTTOM_NAV_ITEMS, ADMIN_SIDEBAR_NAV_ITEMS, CONTRACTOR_BOTTOM_NAV_ITEMS, CONTRACTOR_SIDEBAR_NAV_ITEMS, NavigationSignalKey, NavLinkItem

### Community 94 - "supabase-ssr.d.ts"
Cohesion: 0.25
Nodes (4): CookieMethods, CookieOptions, CreateServerClientOptions, @supabase/ssr

### Community 95 - "20260219193000_add_ceo_role_and_lock_executive_profiles.sql"
Cohesion: 0.39
Nodes (5): idx_profiles_single_ceo, idx_profiles_single_super_admin, public.is_admin(), public.is_super_admin(), trg_enforce_fixed_executive_roles

### Community 96 - "test-connection.mjs"
Cohesion: 0.29
Nodes (4): dotenv, __dirname, __filename, supabase

### Community 97 - "seed-db.js"
Cohesion: 0.29
Nodes (3): { createClient }, path, supabase

### Community 98 - "contractor_invoices"
Cohesion: 0.48
Nodes (6): contractor_invoices, idx_invoice_contractor, idx_invoice_period, idx_invoice_status, invoice_line_items, tax_1099_tracking

### Community 100 - "test-supabase-connection.js"
Cohesion: 0.40
Nodes (5): colors, { createClient }, log(), supabase, testConnection()

### Community 101 - "sessionTimeout.ts"
Cohesion: 0.47
Nodes (3): isSessionExpired(), MAX_INACTIVITY_MS, SESSION_ACTIVITY_COOKIE

### Community 102 - "entergyTicketFormat.ts"
Cohesion: 0.53
Nodes (4): buildEntergySpecialInstructions(), buildEntergyWorkDescription(), countLine(), EntergyTicketFormatInput

### Community 107 - "20260215001000_fix_profiles_policy_recursion.sql"
Cohesion: 0.60
Nodes (3): public.current_user_role(), public.is_admin(), public.is_super_admin()

### Community 108 - "eslint.config.mjs"
Cohesion: 0.50
Nodes (3): eslintConfig, eslint, eslint-config-next

### Community 145 - "thumbnail.ts"
Cohesion: 0.27
Nodes (9): generatePreview(), buildThumbnailFile(), calculateThumbnailDimensions(), fallbackResult(), generateImageThumbnail(), loadImageBitmap(), ThumbnailDimensions, ThumbnailGenerationResult (+1 more)

### Community 146 - "assessmentSubmissionService.ts"
Cohesion: 0.13
Nodes (17): AssessmentFormProps, SAFETY_FIELDS, SafetyChecklistProps, SafetyFieldConfig, updateField(), AssessmentSubmissionDependencies, assessmentSubmissionService, CreateAssessmentInput (+9 more)

### Community 147 - "dashboardReportingService.ts"
Cohesion: 0.05
Nodes (58): buildDashboardMetrics(), buildDashboardReport(), buildReportExportArtifact(), buildSimplePdf(), CLOSED_TICKET_STATUSES, CountEqClient, CountInClient, CountIsNotClient (+50 more)

### Community 148 - "authorization.ts"
Cohesion: 0.52
Nodes (5): canPerformManagementAction(), getManagementActionForPath(), ManagementAction, normalizePath(), isSuperAdminClassRole()

## Knowledge Gaps
- **553 isolated node(s):** `TicketFeatureCollection`, `TicketMarkersProps`, `OptimizedRouteResult`, `ActiveTimerProps`, `ReviewDecision` (+548 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 795 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **57 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `MapView.tsx`, `ActiveTimer.tsx`, `StatusUpdater.tsx`, `contractorService.ts`, `photoStorageService.ts`, `thumbnail.ts`, `package.json`, `assessmentSubmissionService.ts`, `authorization.ts`, `userProvisioning.ts`, `ocr-extract/route.ts`, `dashboardReportingService.ts`, `app/layout.tsx`, `invoiceGenerationService.ts`, `stormEventService.test.ts`, `ticket-new-client-page.tsx`, `SyncProvider.tsx`, `assessmentCatalogService.ts`, `expenseProcessingService.ts`, `AssessmentReviewList.tsx`, `portalAccess.ts`, `AssessmentDecisionSheet.tsx`, `TimeEntryList.tsx`, `roleGuards.ts`, `Button`, `useNavigationSignals.ts`, `expenseProcessing.ts`, `ticketIntakeService.ts`, `validators.ts`, `routeOptimizationService.ts`, `assessmentReviewService.test.ts`, `photoUploadQueue.ts`, `templates/entergy.ts`, `ExpenseReviewList.tsx`, `Ticket`, `TimeEntry`, `receiptOcrService.ts`, `assessmentPhotos.ts`, `supabase/middleware.ts`, `DashboardMetrics.tsx`, `time-tracking/index.ts`, `navigationConfig.ts`, `seed-db.js`, `sessionTimeout.ts`, `entergyTicketFormat.ts`, `expenseSubmissionService.test.ts`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `MapView.tsx`, `ActiveTimer.tsx`, `SelectContent`, `StatusUpdater.tsx`, `cn`, `InvoiceList.tsx`, `tickets/[id]/page.tsx`, `TimeClock.tsx`, `package.json`, `app/layout.tsx`, `ticket-new-client-page.tsx`, `TicketFormRenderer.tsx`, `Input`, `next`, `SyncProvider.tsx`, `AssessmentReviewList.tsx`, `AssessmentDecisionSheet.tsx`, `TimeEntryList.tsx`, `roleGuards.ts`, `Button`, `useNavigationSignals.ts`, `ticketIntakeService.ts`, `Card`, `validators.ts`, `ExpenseReviewList.tsx`, `ExpenseForm.tsx`, `DashboardMetrics.tsx`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Why does `cn()` connect `cn` to `MapView.tsx`, `Input`, `SelectContent`, `StatusUpdater.tsx`, `next`, `DashboardMetrics.tsx`, `InvoiceList.tsx`, `tickets/[id]/page.tsx`, `AssessmentDecisionSheet.tsx`, `TimeEntryList.tsx`, `Button`, `Card`, `TicketFormRenderer.tsx`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **What connects `TicketFeatureCollection`, `TicketMarkersProps`, `OptimizedRouteResult` to the rest of the system?**
  _553 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `MapView.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11416490486257928 - nodes in this community are weakly interconnected._
- **Should `StatusUpdater.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12955465587044535 - nodes in this community are weakly interconnected._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.09210526315789473 - nodes in this community are weakly interconnected._