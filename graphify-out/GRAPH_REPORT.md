# Graph Report - Central Command  (2026-10-01)

## Corpus Check
- 355 files · ~134,069 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: (none) 10, .log 1, .csv 1)

## Summary
- 2315 nodes · 6274 edges · 178 communities (108 shown, 70 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 61 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Expense Review List
- Command Components
- Equipment Assessment
- Types Components
- Map View
- Status Badge
- Auth Provider
- Sheet Components
- Contractor Service
- Dexie Components
- Local Test Store
- Card Components
- Storm First Workflow Schema
- Dropdown Menu
- Dashboard Reporting Service
- Application Package Dependencies
- Application Package Dependencies
- Dialog Components
- User Provisioning
- Live Database Types
- Storm Sop Workflow Tables Schema
- Expense Submission Service
- Service Worker
- Entergy Components
- Invoice Generation Service
- Assessment Review Service
- Photo Storage Service
- File Intake
- Form Components
- Portal Access
- Invoice List
- Dexie Components
- Application Package Dependencies
- Shared Application Models
- Application Package Dependencies
- Verify Grid2 Schema
- Dashboard Metrics
- Expense Processing Service
- Assessment Catalog Service
- Formatters Components
- Photo Upload Queue
- Time Tracking
- Time Entry Service
- Time Entry Management Service
- Components Components
- Assessment Submission Service
- Tsconfig Components
- App Config
- Time Expense Tables Schema
- Use Navigation Signals
- Expense Processing
- Storm Contractor Auth Alignment Schema
- Storm Event Service
- Assessment Form
- Time Entry Management Service
- Core Tables Schema
- Exif Components
- Middleware Components
- Validators Components
- Clean Next Duplicates
- Sw Components
- Assessment Review Decision
- Assessment Review List
- Expense Form
- Dashboard Reporting Service
- Invoice Generation Service
- Generate Utility Config
- Ticket Templates Ocr Scaffold Schema
- Add Storm Scope To Financial
- Seed Via Api
- Media Audit Tables Schema
- Storm Event Utility Template Preload
- Sw Components
- Receipt Ocr Service
- Gps Workflow
- Dashboard Reporting Service
- Status Update Flow
- Storm Event Sop Master Codes
- Ticket Tables Schema
- Thumbnail Components
- Assessment Photos
- Photo Validation
- Create Storm Events Root Workflow
- Image Compression
- Triggers Schema
- Shared Application Models
- Assessment Submission Service
- Invoice Generation Service
- Next Components
- Expense Submission Service
- Test Connection
- Seed Db
- Hash Components
- Assessment Tables Schema
- Contractor Map Screens
- Navigation Config
- Invoice Generation Service
- Route Optimization Service
- Add Ceo Role And Lock
- Financial Tables Schema
- Assessment Review Service
- Expenses Components
- Test Supabase Connection
- Session Timeout
- Entergy Ticket Format
- Invoice Generation Service
- Storm Event Code Trigger Schema
- Ticket Assignment Picker Schema
- Auth Confirm Screens
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
3. `react` - 100 edges
4. `Card()` - 91 edges
5. `CardContent()` - 90 edges
6. `CardHeader()` - 68 edges
7. `vitest` - 66 edges
8. `CardTitle()` - 66 edges
9. `lucide-react` - 64 edges
10. `next` - 51 edges

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

## Communities (178 total, 70 thin omitted)

### Community 0 - "Expense Review List"
Cohesion: 0.08
Nodes (58): columns, Contractor, ContractorsListPage(), mockContractors, CreateStormEventPage(), STATE_NAMES, STORM_EVENT_STATUS_OPTIONS, UTILITY_CLIENT_OPTIONS (+50 more)

### Community 1 - "Command Components"
Cohesion: 0.09
Nodes (43): cmdk, radix-ui, DataTable(), DataTableProps, amountToPercent(), buildDefaultDates(), downloadArtifact(), ReportsDashboard() (+35 more)

### Community 2 - "Equipment Assessment"
Cohesion: 0.12
Nodes (37): addEquipmentItem(), CONDITION_OPTIONS, EquipmentAssessment(), removeEquipmentItem(), updateEquipmentItem(), EquipmentSelect(), toEquipmentLabel(), toWireSizeLabel() (+29 more)

### Community 3 - "Types Components"
Cohesion: 0.07
Nodes (36): TicketFormRendererProps, CreateUtilityTicketInput, CENTERPOINT_TEMPLATE, centerpointPayloadSchema, DUKE_TEMPLATE, dukePayloadSchema, ENTERGY_TEMPLATE, entergyPayloadSchema (+28 more)

### Community 6 - "Map View"
Cohesion: 0.11
Nodes (35): mapbox-gl, buildGeofenceFeatureCollection(), buildGeofencePolygon(), GeofenceCircle(), GeofenceCircleProps, GeofenceFeatureCollection, isRenderableGeofence(), removeGeofenceLayers() (+27 more)

### Community 7 - "Status Badge"
Cohesion: 0.11
Nodes (34): date-fns, sonner, ContractorApprovalPage(), mockPending, PendingContractor, ContractorDetailPage(), mockContractor, TicketDetailPage() (+26 more)

### Community 8 - "Auth Provider"
Cohesion: 0.13
Nodes (29): AdminAccountPage(), AdminAssessmentReviewPage(), ContractorInvitePage(), AdminExpenseReviewPage(), StormEventsPage(), AdminTimeReviewPage(), ContractorAccountPage(), AssessmentCreateInner() (+21 more)

### Community 9 - "Sheet Components"
Cohesion: 0.11
Nodes (29): lucide-react, AdminError(), AdminErrorProps, ContractorError(), ContractorErrorProps, GlobalError(), GlobalErrorProps, NotFound() (+21 more)

### Community 10 - "Contractor Service"
Cohesion: 0.08
Nodes (29): onSubmit(), AssignableContractor, buildActiveTicketCountByContractor(), buildYtdEarningsByContractor(), ContractorDetail, ContractorListFilters, ContractorListItem, fetchProfilesByIds() (+21 more)

### Community 11 - "Dexie Components"
Cohesion: 0.11
Nodes (32): addToSyncQueue(), CachedTicketFilters, cacheTicket(), cacheTickets(), createId(), createSyncConflict(), deriveSyncStatus(), getCachedTickets() (+24 more)

### Community 12 - "Local Test Store"
Cohesion: 0.12
Nodes (24): StormPage(), StormWorkspace(), StatusUpdateFlowProps, StatusUpdaterProps, contractorService, dashboardTicketService, StormEventSummary, StormRosterMember (+16 more)

### Community 13 - "Card Components"
Cohesion: 0.14
Nodes (26): class-variance-authority, AdminMapPage(), getTicketCenter(), toMapTicket(), ForgotPasswordPage(), metadata, LoginPage(), metadata (+18 more)

### Community 14 - "Storm First Workflow Schema"
Cohesion: 0.07
Nodes (16): expense_item_storm_scope, invoice_line_storm_scope, invoice_storm_immutable, public.assign_contractor_to_storm(), public.create_storm_ticket(), public.enforce_expense_item_storm(), public.enforce_storm_payload(), public.enforce_ticket_roster_assignment() (+8 more)

### Community 15 - "Dropdown Menu"
Cohesion: 0.10
Nodes (23): AdminLayout(), ContractorLayout(), StormLayout(), AppShell(), AppShellProps, adminNavItems, BottomNav(), BottomNavProps (+15 more)

### Community 17 - "Dashboard Reporting Service"
Cohesion: 0.07
Nodes (32): buildReportExportArtifact(), buildSimplePdf(), CLOSED_TICKET_STATUSES, CountEqClient, CountInClient, CountIsNotClient, DashboardExpenseReportRow, DashboardInvoiceRow (+24 more)

### Community 18 - "Application Package Dependencies"
Cohesion: 0.06
Nodes (32): name, private, version, clsx, crypto-js, date-fns-tz, dexie, dexie-react-hooks (+24 more)

### Community 19 - "Application Package Dependencies"
Cohesion: 0.06
Nodes (33): dependencies, browser-image-compression, class-variance-authority, clsx, cmdk, crypto-js, date-fns, date-fns-tz (+25 more)

### Community 20 - "Dialog Components"
Cohesion: 0.17
Nodes (22): react, formatPayloadPreview(), formatTimestamp(), SyncStatus(), statusButtonConfig, StatusUpdater(), mocks, TicketAssign() (+14 more)

### Community 21 - "User Provisioning"
Cohesion: 0.09
Nodes (28): AuthUserSummary, AuthUserUpsertInput, ContractorUpsertInput, ExistingSuperAdmin, isRoleAliasWarning(), normalizeEmail(), normalizeHeader(), normalizeRole() (+20 more)

### Community 22 - "Live Database Types"
Cohesion: 0.12
Nodes (25): GET(), normalizeProfile(), PATCH(), ProfileRow, resolveAuthenticatedUser(), remote, extractError(), extractOcrText() (+17 more)

### Community 23 - "Storm Sop Workflow Tables Schema"
Cohesion: 0.13
Nodes (26): idx_auth_logs_authorized_at, idx_auth_logs_storm_event, idx_logistics_phase_category, idx_logistics_status, idx_logistics_storm_event, idx_phase_steps_phase_status, idx_phase_steps_storm_event, idx_roster_members_contractor (+18 more)

### Community 24 - "Expense Submission Service"
Cohesion: 0.12
Nodes (29): LocalExpenseItem, LocalExpenseReport, createRemote(), defaultDependencies, ExpenseStatusFilter, ExpenseSubmissionDependencies, ExpenseSyncStatus, fetchContractorNames() (+21 more)

### Community 25 - "Service Worker"
Cohesion: 0.10
Nodes (26): agentation, next-themes, @testing-library/react, metadata, RootLayout(), OfflineBanner(), readOnlineStatus(), shouldRenderOfflineBanner() (+18 more)

### Community 26 - "Entergy Components"
Cohesion: 0.26
Nodes (9): confidence(), extractEntergyFields(), extractMatch(), EXTRACTORS, stubUtilityExtractor(), TicketOcrExtractionResult, TicketOcrExtractor, TicketOcrRequest (+1 more)

### Community 27 - "Invoice Generation Service"
Cohesion: 0.08
Nodes (27): InvoicePDFViewerProps, CreateInvoiceLineItemInput, defaultDependencies, GeneratedInvoiceResult, GenerateInvoicesInput, GenerateInvoicesResult, InsertInvoiceInput, InvoiceDetails (+19 more)

### Community 28 - "Assessment Review Service"
Cohesion: 0.12
Nodes (27): LocalAssessment, applyFilters(), AssessmentReviewDependencies, assessmentReviewService, AssessmentReviewState, defaultDependencies, fetchContractorNames(), fetchEquipmentCounts() (+19 more)

### Community 29 - "Photo Storage Service"
Cohesion: 0.11
Nodes (22): AuthClient, buildPhotoStoragePath(), ContractorsTableClient, getDefaultClient(), getFileExtension(), MediaAssetsTableClient, PHOTO_STORAGE_AUTH_ERROR, PHOTO_STORAGE_BUCKET (+14 more)

### Community 30 - "File Intake"
Cohesion: 0.16
Nodes (15): TicketNewPage(), TicketNewPageProps, TicketNewClientPage(), TicketNewClientPageProps, notifyTicketsChanged(), detectTicketOcrSourceType(), getNormalizedExtension(), TICKET_OCR_ACCEPT_ATTRIBUTE (+7 more)

### Community 31 - "Form Components"
Cohesion: 0.15
Nodes (23): @hookform/resolvers, react-hook-form, zod, TicketForm(), ticketFormSchema, TicketFormValues, applyFieldFormatting(), getFieldDefault() (+15 more)

### Community 32 - "Portal Access"
Cohesion: 0.17
Nodes (17): TicketsLayout(), canPerformManagementAction(), getManagementActionForPath(), ManagementAction, normalizePath(), getPortalRole(), isAdminPortalPath(), isContractorPortalPath() (+9 more)

### Community 33 - "Invoice List"
Cohesion: 0.17
Nodes (20): getDefaultPeriod(), InvoiceGenerator(), InvoiceGeneratorProps, parseError(), toDateInputValue(), InvoiceList(), InvoiceListProps, parseError() (+12 more)

### Community 34 - "Dexie Components"
Cohesion: 0.13
Nodes (19): readOnlineStatus(), SyncContext, SyncContextValue, SyncProvider(), SyncSnapshot, SyncState, ConflictResolutionStrategy, createSyncConflictFromQueueItem() (+11 more)

### Community 35 - "Application Package Dependencies"
Cohesion: 0.08
Nodes (24): scripts, build, clean:next, dev, dev:fresh, lint, prebuild, predev (+16 more)

### Community 36 - "Shared Application Models"
Cohesion: 0.09
Nodes (22): zustand, AuthContextType, AuthState, useAuthStore, CapturedPhoto, Contractor, ContractorCredential, CredentialStatus (+14 more)

### Community 37 - "Application Package Dependencies"
Cohesion: 0.09
Nodes (23): devDependencies, agentation, dotenv, eslint, eslint-config-next, jsdom, @playwright/test, shadcn (+15 more)

### Community 38 - "Verify Grid2 Schema"
Cohesion: 0.16
Nodes (21): buildSqlRunner(), CC_CORE_TABLES, checkCeoRole(), CheckContext, checkContractorNaming(), checkCoreTables(), checkGrid2Tables(), checkRlsEnabled() (+13 more)

### Community 39 - "Dashboard Metrics"
Cohesion: 0.18
Nodes (15): AdminDashboardPage(), AdminReportsPage(), MetricCard(), MetricCardProps, variantStyles, DashboardMetrics(), DashboardMetricsProps, formatSignedTrend() (+7 more)

### Community 40 - "Expense Processing Service"
Cohesion: 0.13
Nodes (17): ExpenseFormProps, createExpenseProcessingService(), defaultDependencies, ExpenseProcessingDependencies, expenseProcessingService, ExpenseReviewDecision, ExpenseReviewFilters, mapReviewedReport() (+9 more)

### Community 41 - "Assessment Catalog Service"
Cohesion: 0.13
Nodes (16): EquipmentSelectProps, WireSizeSelectProps, AssessmentCatalogDependencies, createAssessmentCatalogService(), defaultDependencies, EquipmentTypeOption, fetchEquipmentTypes(), fetchWireSizes() (+8 more)

### Community 42 - "Formatters Components"
Cohesion: 0.15
Nodes (9): ALL_PHOTO_TYPES, formatPhotoType(), PhotoCapture(), PhotoGallery(), renderGpsStatus(), formatCoordinates(), formatDateTime(), formatFileSize() (+1 more)

### Community 43 - "Photo Upload Queue"
Cohesion: 0.13
Nodes (15): PhotoCaptureProps, PhotoGalleryProps, getPendingPhotos(), LocalPhoto, AssessmentPhotoMetadataInput, createPhotoUploadQueue(), defaultDependencies, inferExtensionFromMimeType() (+7 more)

### Community 44 - "Time Tracking"
Cohesion: 0.25
Nodes (17): ActiveTimer(), ActiveTimerProps, TimeEntryCard(), toWorkTypeLabel(), formatDuration(), calculateBillableAmount(), calculateBillableMinutes(), calculateElapsedMinutes() (+9 more)

### Community 45 - "Time Entry Service"
Cohesion: 0.13
Nodes (18): LocalSyncStatus, buildClockInEntry(), ClockLocation, createEntryId(), createTimeEntryService(), defaultDependencies, fetchRemoteActiveEntry(), insertRemoteEntry() (+10 more)

### Community 46 - "Time Entry Management Service"
Cohesion: 0.14
Nodes (19): defaultDependencies, entryMatchesFilters(), fetchContractorNames(), fetchRemoteEntries(), fetchTicketNumbers(), getLocalEntries(), mapLocalEntryToListItem(), mapRemoteRowToTimeEntry() (+11 more)

### Community 47 - "Components Components"
Cohesion: 0.10
Nodes (19): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+11 more)

### Community 48 - "Assessment Submission Service"
Cohesion: 0.18
Nodes (17): AssessmentEquipmentInput, composeEquipmentDescription(), createId(), createLocalAssessment(), createRemoteAssessment(), defaultDependencies, mapLocalAssessment(), mapRemoteAssessment() (+9 more)

### Community 49 - "Tsconfig Components"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 50 - "App Config"
Cohesion: 0.13
Nodes (15): WORK_TYPE_OPTIONS, WorkTypeOption, WorkTypeSelectorProps, EQUIPMENT_CONDITIONS, EXPENSE_CATEGORIES, EXPENSE_STATUS, INVOICE_STATUS, NOTIFICATION_TYPES (+7 more)

### Community 51 - "Time Expense Tables Schema"
Cohesion: 0.19
Nodes (17): expense_items, expense_policies, expense_reports, idx_expense_item_category, idx_expense_item_date, idx_expense_item_report, idx_expense_report_contractor, idx_expense_report_period (+9 more)

### Community 52 - "Use Navigation Signals"
Cohesion: 0.21
Nodes (16): useSync(), buildAdminRoleSignalCounts(), buildContractorRoleSignalCounts(), buildNavigationSignals(), clampCount(), loadContractorTicketsByAssignee(), loadRoleSignalCounts(), LoadRoleSignalCountsOptions (+8 more)

### Community 53 - "Expense Processing"
Cohesion: 0.20
Nodes (16): ProcessedCreateInput, calculateMileageExpense(), ExpenseDuplicateCandidate, ExpensePolicyValidationInput, ExpensePolicyValidationResult, extractLargestCurrencyAmount(), hasDuplicateExpense(), MileageCalculationInput (+8 more)

### Community 54 - "Storm Contractor Auth Alignment Schema"
Cohesion: 0.12
Nodes (5): private.active_profile_role(), protect_contractor_eligibility, protect_profile_authorization, provision_contractor_auth_profile, sync_contractor_managed_role

### Community 56 - "Storm Event Service"
Cohesion: 0.08
Nodes (20): remote, UtilityTicketDetails(), CLOSED_TICKET_STATUSES, CreateStormEventInput, mapStormEventRow(), normalizeStormEventStatus(), normalizeUtilityClientValue(), RemoteStormEventRow (+12 more)

### Community 57 - "Assessment Form"
Cohesion: 0.22
Nodes (15): AssessmentForm(), AssessmentFormProps, parseOptionalNumber(), toHumanPhotoType(), validateAssessmentDraft(), createAssessmentDraftId(), createDefaultDamageClassification(), createDefaultSafetyObservations() (+7 more)

### Community 58 - "Time Entry Management Service"
Cohesion: 0.14
Nodes (11): TimeEntryCardProps, LocalTimeEntry, SyncQueueOperation, createTimeEntryManagementService(), TimeEntryListItem, TimeEntryManagementDependencies, timeEntryManagementService, ClockOutRequest (+3 more)

### Community 59 - "Core Tables Schema"
Cohesion: 0.23
Nodes (12): contractor_banking, contractor_rates, contractors, idx_contractors_eligible, idx_contractors_profile, idx_contractors_status, idx_profiles_active, idx_profiles_email (+4 more)

### Community 60 - "Exif Components"
Cohesion: 0.22
Nodes (14): exifreader, dmsToDecimal(), ExifTagLike, ExifTagMap, extractExifMetadataFromArrayBuffer(), extractExifMetadataFromFile(), extractExifMetadataFromTags(), normalizeNumericValue() (+6 more)

### Community 61 - "Middleware Components"
Cohesion: 0.22
Nodes (9): @supabase/ssr, isPasswordResetAllowedPath(), shouldEnforcePasswordReset(), isPublicRoute(), PUBLIC_ROUTE_PREFIXES, mocks, updateSession(), config (+1 more)

### Community 62 - "Validators Components"
Cohesion: 0.12
Nodes (15): assessmentSchema, einSchema, emailSchema, expenseItemSchema, FileValidationResult, GPSValidationResult, latitudeSchema, longitudeSchema (+7 more)

### Community 64 - "Clean Next Duplicates"
Cohesion: 0.20
Nodes (6): cleanNextDuplicates(), CleanResult, TARGET_DIRECTORIES, COMMON_DIR, RETOKENED_FILES, globalsCss

### Community 65 - "Sw Components"
Cohesion: 0.13
Nodes (4): CACHE_NAMES, STATIC_ASSETS, sw, SyncEvent

### Community 66 - "Assessment Review Decision"
Cohesion: 0.16
Nodes (9): vitest, ASSESSMENT_REVIEW_FILTER_CONTROL_CLASS, ASSESSMENT_REVIEW_LAYOUT_MODE, EXPENSE_REVIEW_FILTER_CONTROL_CLASS, getExpenseReviewLayoutMode(), getTimeReviewLayoutMode(), TIME_REVIEW_FILTER_CONTROL_CLASS, AssessmentDecisionFormValues (+1 more)

### Community 67 - "Assessment Review List"
Cohesion: 0.22
Nodes (13): AssessmentReviewList(), AssessmentReviewListProps, DecisionFilterValue, DecisionSheetState, parseError(), PriorityFilterValue, ReviewedFilterValue, toEndOfDayIso() (+5 more)

### Community 68 - "Expense Form"
Cohesion: 0.23
Nodes (11): createInitialDraft(), ExpenseForm(), mapTicketsToOptions(), parseOptionalNumber(), toDateInputValue(), ExpenseItemDraft, ExpenseTicketOption, ACCEPTED_RECEIPT_TYPES (+3 more)

### Community 69 - "Dashboard Reporting Service"
Cohesion: 0.19
Nodes (13): buildDashboardMetrics(), buildDashboardReport(), formatTrendPercent(), getBucketLabel(), getBuckets(), getBucketStart(), getPreviousMtdWindow(), isInvoiceRevenueStatus() (+5 more)

### Community 70 - "Invoice Generation Service"
Cohesion: 0.18
Nodes (14): fetchContractorNames(), fetchInvoiceDetails(), fetchInvoices(), fetchLineItemCountByInvoiceId(), fetchTax1099Tracking(), fetchTaxTrackingRowsForYear(), insertInvoice(), mapRemoteInvoice() (+6 more)

### Community 71 - "Generate Utility Config"
Cohesion: 0.18
Nodes (11): cache, { createRequire }, fs, json(), load(), path, quote(), requireApp (+3 more)

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

### Community 81 - "Status Update Flow"
Cohesion: 0.26
Nodes (8): DashboardTicketRow, getNextPossibleStatuses(), isValidTransition(), FIELD_STATUS_TRANSITIONS, FieldStatusTransition, getFieldStatusTransition(), isFieldStatusFlowStep(), TicketStatus

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

### Community 91 - "Shared Application Models"
Cohesion: 0.27
Nodes (10): DamageClassificationDraft, DamageClassificationProps, TicketFiltersState, AssessmentReviewFilters, AssessmentReviewListItem, AssessmentDamageClassificationInput, RemoteDamageAssessmentInsert, PriorityLevel (+2 more)

### Community 92 - "Assessment Submission Service"
Cohesion: 0.22
Nodes (7): SafetyChecklistProps, SafetyFieldConfig, CreateAssessmentInput, createAssessmentSubmissionService(), RemoteDamageAssessmentRow, SAFETY_OBSERVATIONS, SafetyObservations

### Community 93 - "Invoice Generation Service"
Cohesion: 0.27
Nodes (10): buildExpenseReportLineItems(), buildTimeEntryLineItems(), calculateTimeEntryAmount(), fetchGenerationCandidates(), fetchTicketNumbers(), getTaxYearForPeriodEnd(), parseIsoDate(), roundToCurrency() (+2 more)

### Community 95 - "Expense Submission Service"
Cohesion: 0.28
Nodes (9): createId(), createLocal(), getExpenseMonthPeriod(), getOrCreateDraftReport(), normalizeExpenseDate(), processCreateInput(), resolveReceiptOcrText(), toRoundedAmount() (+1 more)

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

### Community 100 - "Contractor Map Screens"
Cohesion: 0.46
Nodes (6): ContractorMapPage(), getTicketCenter(), toMapTicket(), formatWorkflowStatus(), StatusUpdateFlow(), useGPSValidation()

### Community 101 - "Navigation Config"
Cohesion: 0.32
Nodes (6): ADMIN_BOTTOM_NAV_ITEMS, ADMIN_SIDEBAR_NAV_ITEMS, CONTRACTOR_BOTTOM_NAV_ITEMS, CONTRACTOR_SIDEBAR_NAV_ITEMS, NavigationSignalKey, NavLinkItem

### Community 102 - "Invoice Generation Service"
Cohesion: 0.25
Nodes (4): fetchExistingInvoiceCount(), insertInvoiceLineItems(), linkExpenseReportsToInvoice(), linkTimeEntriesToInvoice()

### Community 103 - "Route Optimization Service"
Cohesion: 0.50
Nodes (6): haversineDistanceMeters(), isValidRouteStop(), OptimizedRouteResult, optimizeRoute(), RouteStop, toRadians()

### Community 104 - "Add Ceo Role And Lock"
Cohesion: 0.39
Nodes (5): idx_profiles_single_ceo, idx_profiles_single_super_admin, public.is_admin(), public.is_super_admin(), trg_enforce_fixed_executive_roles

### Community 105 - "Financial Tables Schema"
Cohesion: 0.48
Nodes (6): contractor_invoices, idx_invoice_contractor, idx_invoice_period, idx_invoice_status, invoice_line_items, tax_1099_tracking

### Community 106 - "Assessment Review Service"
Cohesion: 0.29
Nodes (4): composeReviewNotes(), createAssessmentReviewService(), ReviewedAssessment, reviewRemoteAssessment()

### Community 107 - "Expenses Components"
Cohesion: 0.43
Nodes (5): calculateExpenseSummary(), ExpenseSummary, ExpenseSummaryItem, safeAmount(), toMonthKey()

### Community 108 - "Test Supabase Connection"
Cohesion: 0.40
Nodes (5): colors, { createClient }, log(), supabase, testConnection()

### Community 109 - "Session Timeout"
Cohesion: 0.47
Nodes (3): isSessionExpired(), MAX_INACTIVITY_MS, SESSION_ACTIVITY_COOKIE

### Community 110 - "Entergy Ticket Format"
Cohesion: 0.53
Nodes (4): buildEntergySpecialInstructions(), buildEntergyWorkDescription(), countLine(), EntergyTicketFormatInput

### Community 111 - "Invoice Generation Service"
Cohesion: 0.33
Nodes (3): createInvoiceGenerationService(), InvoiceGenerationCandidate, Tax1099TrackingSummary

### Community 114 - "Auth Confirm Screens"
Cohesion: 0.60
Nodes (4): AuthConfirmInner(), AuthConfirmPage(), ConfirmSkeleton(), Status

### Community 116 - "Fix Profiles Policy Recursion Schema"
Cohesion: 0.60
Nodes (3): public.current_user_role(), public.is_admin(), public.is_super_admin()

### Community 117 - "Eslint Components"
Cohesion: 0.50
Nodes (3): eslintConfig, eslint, eslint-config-next

## Knowledge Gaps
- **554 isolated node(s):** `Contractor`, `ExpenseItemFormProps`, `ExpenseListProps`, `ExpenseStatusFilter`, `ExpenseReviewListProps` (+549 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 809 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **70 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Dialog Components` to `Expense Review List`, `Command Components`, `Equipment Assessment`, `Map View`, `Status Badge`, `Auth Provider`, `Sheet Components`, `Local Test Store`, `Card Components`, `Dropdown Menu`, `Application Package Dependencies`, `Service Worker`, `File Intake`, `Form Components`, `Portal Access`, `Invoice List`, `Dexie Components`, `Dashboard Metrics`, `Formatters Components`, `Time Tracking`, `Use Navigation Signals`, `Storm Event Service`, `Assessment Form`, `Assessment Review List`, `Expense Form`, `Gps Workflow`, `Contractor Map Screens`, `Auth Confirm Screens`, `Tickets Create Screens`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Why does `vitest` connect `Assessment Review Decision` to `Types Components`, `Map View`, `Contractor Service`, `Local Test Store`, `Application Package Dependencies`, `Dialog Components`, `User Provisioning`, `Live Database Types`, `Service Worker`, `Photo Storage Service`, `File Intake`, `Portal Access`, `Invoice List`, `Dexie Components`, `Expense Processing Service`, `Assessment Catalog Service`, `Formatters Components`, `Photo Upload Queue`, `Time Tracking`, `App Config`, `Use Navigation Signals`, `Expense Processing`, `Storm Event Service`, `Time Entry Management Service`, `Exif Components`, `Middleware Components`, `Clean Next Duplicates`, `Dashboard Reporting Service`, `Receipt Ocr Service`, `Gps Workflow`, `Status Update Flow`, `Thumbnail Components`, `Assessment Photos`, `Photo Validation`, `Image Compression`, `Assessment Submission Service`, `Seed Db`, `Hash Components`, `Navigation Config`, `Route Optimization Service`, `Assessment Review Service`, `Expenses Components`, `Session Timeout`, `Entergy Ticket Format`, `Invoice Generation Service`, `Expense Submission Service`?**
  _High betweenness centrality (0.094) - this node is a cross-community bridge._
- **Why does `cn()` connect `Command Components` to `Expense Review List`, `Invoice List`, `Equipment Assessment`, `Map View`, `Status Badge`, `Dashboard Metrics`, `Sheet Components`, `Auth Provider`, `Card Components`, `Dropdown Menu`, `Dialog Components`, `Form Components`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **What connects `Contractor`, `ExpenseItemFormProps`, `ExpenseListProps` to the rest of the system?**
  _554 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Expense Review List` be split into smaller, more focused modules?**
  _Cohesion score 0.07645875251509054 - nodes in this community are weakly interconnected._
- **Should `Command Components` be split into smaller, more focused modules?**
  _Cohesion score 0.08883693746347165 - nodes in this community are weakly interconnected._
- **Should `Equipment Assessment` be split into smaller, more focused modules?**
  _Cohesion score 0.12074829931972789 - nodes in this community are weakly interconnected._
## Index Scope

Code and SQL are indexed structurally. Supporting documents and image assets are excluded from this code graph. No LLM extraction tokens were used.
