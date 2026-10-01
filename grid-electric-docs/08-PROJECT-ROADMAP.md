# Central Command — PROJECT ROADMAP

## Development Timeline & Milestones

**Version:** 1.0  
**Date:** February 4, 2026  
**Project Duration:** 16 Weeks (MVP)

---

## TABLE OF CONTENTS

1. [Phase Overview](#1-phase-overview)
2. [Phase 1: Foundation (Weeks 1-4)](#phase-1-foundation-weeks-1-4)
3. [Phase 2: Core Features (Weeks 5-8)](#phase-2-core-features-weeks-5-8)
4. [Phase 3: Operations (Weeks 9-12)](#phase-3-operations-weeks-9-12)
5. [Phase 4: Polish & Launch (Weeks 13-16)](#phase-4-polish--launch-weeks-13-16)
6. [Post-MVP Roadmap](#post-mvp-roadmap)
7. [Resource Requirements](#resource-requirements)

---

## 1. PHASE OVERVIEW

```dart
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MVP DEVELOPMENT TIMELINE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  WEEKS 1-4              WEEKS 5-8              WEEKS 9-12            WEEKS   │
│  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐       13-16   │
│  │             │       │             │       │             │       ┌────┐  │
│  │  PHASE 1    │──────►│  PHASE 2    │──────►│  PHASE 3    │──────►│PHASE│  │
│  │  FOUNDATION │       │  CORE       │       │  OPERATIONS │       │  4  │  │
│  │             │       │  FEATURES   │       │             │       │     │  │
│  └─────────────┘       └─────────────┘       └─────────────┘       └────┘  │
│                                                                              │
│  • Project setup       • Ticket system       • Time tracking      • Testing│
│  • Database schema     • GPS workflow        • Expenses           • Bug fixes│
│  • Auth system         • Photo capture       • Invoicing          • Deploy  │
│  • UI framework        • Offline storage     • Reporting          • Training│
│  • Onboarding flow     • Assessment forms    • Analytics          • Launch  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## PHASE 1: FOUNDATION (Weeks 1-4)

### Week 1: Project Setup & Infrastructure

| Day | Task | Deliverable |
|-----|------|-------------|
| 1 | Initialize Next.js project with shadcn/ui | Project repo ready |
| 1 | Configure Tailwind with brand colors | Custom theme |
| 2 | Set up Supabase project | Database instance |
| 2 | Configure RLS policies | Security rules |
| 3 | Set up Mapbox account & API keys | Map integration ready |
| 3 | Configure environment variables | .env files |
| 4 | Set up CI/CD pipeline | GitHub Actions |
| 4 | Configure ESLint & Prettier | Code standards |
| 5 | Create base layout components | App shell |

**Week 1 Deliverables:**

- [ ] GitHub repository with project structure
- [ ] Supabase project configured
- [ ] Local development environment working
- [ ] Base UI components (Button, Input, Card)
- [ ] App shell with navigation placeholders

### Week 2: Authentication & Database

| Day | Task | Deliverable |
|-----|------|-------------|
| 1 | Implement login page | Login UI |
| 1 | Integrate Supabase Auth | Auth flow |
| 2 | Create forgot password flow | Password reset |
| 2 | Implement magic link login | Passwordless auth |
| 3 | Create database schema (SQL) | Tables created |
| 3 | Set up database triggers | Auto-functions |
| 4 | Create TypeScript types | Type definitions |
| 4 | Implement RLS policies | Row security |
| 5 | Create auth hooks | useAuth, useUser |

**Week 2 Deliverables:**

- [ ] Complete authentication system
- [ ] All database tables created
- [ ] RLS policies implemented
- [ ] Auth hooks working
- [ ] Protected routes functional

### Week 3: Onboarding Flow

| Day | Task | Deliverable |
|-----|------|-------------|
| 1 | Create onboarding layout | Step wizard |
| 1 | Implement Personal Info step | Form + validation |
| 2 | Implement Business Info step | Form + validation |
| 2 | Create document upload component | File upload |
| 3 | Implement Insurance step | Multi-file upload |
| 3 | Implement Credentials step | License forms |
| 4 | Implement Banking step | Secure form |
| 4 | Create rate agreement component | Rate display |
| 5 | Implement e-signature | Signature pad |

**Week 3 Deliverables:**

- [ ] 8-step onboarding wizard
- [ ] Document upload with preview
- [ ] Form validation on all steps
- [ ] Progress indicator
- [ ] Draft save functionality

### Week 4: Onboarding Completion & Admin Setup

| Day | Task | Deliverable |
|-----|------|-------------|
| 1 | Implement training video player | Video component |
| 1 | Add video completion tracking | Progress tracking |
| 2 | Implement profile photo capture | Camera integration |
| 2 | Create review & submit step | Summary view |
| 3 | Create pending approval screen | Status page |
| 3 | Build admin approval interface | Review queue |
| 4 | Create admin dashboard shell | Dashboard layout |
| 4 | Implement contractor list | Data table |
| 5 | Build contractor detail view | Profile view |

**Week 4 Deliverables:**

- [ ] Complete onboarding flow (11 steps)
- [ ] Admin approval workflow
- [ ] Contractor management UI
- [ ] Dashboard framework

**Phase 1 Completion Criteria:**

- ✅ New contractor can complete full onboarding
- ✅ Admin can review and approve applications
- ✅ All data persists to database
- ✅ Authentication works end-to-end

---

## PHASE 2: CORE FEATURES (Weeks 5-8)

### Week 5: Ticket System

| Day | Task | Deliverable |
|-----|------|-------------|
| 1 | Create ticket list view | Ticket table |
| 1 | Implement ticket filters | Filter bar |
| 2 | Build ticket detail view | Detail page |
| 2 | Create ticket create form | Admin form |
| 3 | Implement ticket assignment | Assign UI |
| 3 | Add status badge components | Status indicators |
| 4 | Build ticket card component | Mobile card |
| 4 | Implement ticket search | Search bar |
| 5 | Create ticket status history | Timeline view |

**Week 5 Deliverables:**

- [ ] Complete ticket CRUD
- [ ] Ticket assignment workflow
- [ ] Status tracking
- [ ] Mobile-responsive list

### Week 6: GPS Workflow & Maps

| Day | Task | Deliverable |
|-----|------|-------------|
| 1 | Integrate Mapbox | Map component |
| 1 | Create ticket markers | Marker display |
| 2 | Implement geofencing | 500m radius circles |
| 2 | Add route optimization | Multi-stop routing |
| 3 | Build status update flow | Status transitions |
| 3 | Implement GPS validation | Location check |
| 4 | Create route view | Turn-by-turn UI |
| 4 | Add location picker | Map click-to-set |
| 5 | Build mobile map view | Full-screen map |

**Week 6 Deliverables:**

- [ ] Interactive map with tickets
- [ ] Geofence validation
- [ ] Route optimization
- [ ] 3-status workflow (In Route/On Site/Complete)

### Week 7: Photo Capture & Storage

| Day | Task | Deliverable |
|-----|------|-------------|
| 1 | Create photo capture component | Camera UI |
| 1 | Implement EXIF extraction | GPS from photos |
| 2 | Build photo gallery | Grid view |
| 2 | Add photo categorization | Type selector |
| 3 | Integrate Supabase Storage | Upload pipeline |
| 3 | Implement image compression | Resize/optimize |
| 4 | Create thumbnail generation | Preview images |
| 4 | Build photo review interface | Admin review |
| 5 | Add photo checksum validation | Integrity check |

**Week 7 Deliverables:**

- [ ] Photo capture with GPS
- [ ] EXIF data extraction
- [ ] Cloud storage integration
- [ ] Photo gallery component

### Week 8: Offline Storage Foundation

| Day | Task | Deliverable |
|-----|------|-------------|
| 1 | Set up Dexie.js | IndexedDB wrapper |
| 1 | Create offline schema | Local tables |
| 2 | Implement ticket caching | Local storage |
| 2 | Add sync queue | Pending operations |
| 3 | Create service worker | SW boilerplate |
| 3 | Implement cache strategies | Caching rules |
| 4 | Build offline banner | Status indicator |
| 4 | Add sync status component | Sync UI |
| 5 | Test offline functionality | Offline testing |

**Week 8 Deliverables:**

- [ ] IndexedDB with Dexie.js
- [ ] Service worker caching
- [ ] Offline data access
- [ ] Sync queue implementation

**Phase 2 Completion Criteria:**

- ✅ Admin can create and assign tickets
- ✅ Contractor can view tickets on map
- ✅ GPS validation works
- ✅ Photos capture with GPS and upload
- ✅ App works offline for viewing tickets

---

## PHASE 3: OPERATIONS (Weeks 9-12)

### Week 9: Time Tracking

| Day | Task | Deliverable |
|-----|------|-------------|
| 1 | Create time clock component | Clock in/out UI |
| 1 | Implement GPS-verified clock | Location check |
| 2 | Build active timer display | Running timer |
| 2 | Add work type selector | Work type picker |
| 3 | Create time entry list | History view |
| 3 | Implement time calculations | Hours/amounts |
| 4 | Build time review interface | Admin approval |
| 4 | Add time entry filters | Filter by status |
| 5 | Create time reports | Summary views |

**Week 9 Deliverables:**

- [ ] GPS-verified time clock
- [ ] Time entry management
- [ ] Admin approval workflow
- [ ] Time calculations

### Week 10: Expense Management

| Day | Task | Deliverable |
|-----|------|-------------|
| 1 | Create expense report list | Report list |
| 1 | Build expense create form | Expense form |
| 2 | Implement mileage calculator | Auto-calculation |
| 2 | Add receipt capture | Camera upload |
| 3 | Create expense categories | Category picker |
| 3 | Implement policy validation | Auto-flagging |
| 4 | Build expense review UI | Admin approval |
| 4 | Add per diem tracking | Auto-calculation |
| 5 | Create expense export | CSV/PDF export |

**Week 10 Deliverables:**

- [ ] Expense submission
- [ ] Receipt upload with OCR
- [ ] Policy enforcement
- [ ] Admin approval workflow

### Week 11: Damage Assessments

| Day | Task | Deliverable |
|-----|------|-------------|
| 1 | Create assessment form | Multi-step form |
| 1 | Implement safety checklist | Hazard toggles |
| 2 | Build equipment assessment | Equipment picker |
| 2 | Add damage classification | Severity selector |
| 3 | Create photo requirement validation | Min 4 photos |
| 3 | Implement digital signature | Signature pad |
| 4 | Build assessment review UI | Admin review |
| 4 | Add equipment catalog | Pre-populated list |
| 5 | Create assessment PDF export | PDF generation |

**Week 11 Deliverables:**

- [ ] Complete assessment form
- [ ] Safety checklist
- [ ] Equipment catalog
- [ ] Digital signatures

### Week 12: Invoicing & Reporting

| Day | Task | Deliverable |
|-----|------|-------------|
| 1 | Create invoice generator | Auto-generation |
| 1 | Build invoice list view | Invoice table |
| 2 | Implement invoice PDF | PDF template |
| 2 | Add payment tracking | Status updates |
| 3 | Create 1099 tracking | YTD totals |
| 3 | Build dashboard metrics | KPI cards |
| 4 | Create reports interface | Report builder |
| 4 | Add data visualization | Charts/graphs |
| 5 | Implement export functions | CSV/Excel/PDF |

**Week 12 Deliverables:**

- [ ] Automated invoice generation
- [ ] PDF invoice export
- [ ] 1099 tracking
- [ ] Dashboard with metrics

**Phase 3 Completion Criteria:**

- ✅ Contractor can clock in/out with GPS
- ✅ Expenses can be submitted with receipts
- ✅ Damage assessments can be completed
- ✅ Invoices auto-generate from approved entries
- ✅ Admin dashboard shows key metrics

---

## PHASE 4: POLISH & LAUNCH (Weeks 13-16)

### Week 13: Testing & QA

| Day | Task | Deliverable |
|-----|------|-------------|
| 1 | Write unit tests | Component tests |
| 1 | Add integration tests | API tests |
| 2 | Perform end-to-end testing | E2E suite |
| 2 | Test offline functionality | Offline tests |
| 3 | Conduct security audit | Security review |
| 3 | Performance optimization | Speed improvements |
| 4 | Cross-browser testing | Browser compatibility |
| 4 | Mobile device testing | Responsive testing |
| 5 | Bug fixes | Issue resolution |

**Week 13 Deliverables:**

- [ ] Test coverage > 70%
- [ ] All critical paths tested
- [ ] Performance budget met
- [ ] Security issues resolved

### Week 14: Background Sync & Polish

| Day | Task | Deliverable |
|-----|------|-------------|
| 1 | Implement background sync | Auto-sync |
| 1 | Add sync retry logic | Retry mechanism |
| 2 | Create conflict resolution | Merge UI |
| 2 | Add push notifications | Notification service |
| 3 | Implement email notifications | Email templates |
| 3 | Add SMS notifications | SMS service |
| 4 | Polish UI animations | Micro-interactions |
| 4 | Add loading states | Skeletons/spinners |
| 5 | Create error boundaries | Error handling |

**Week 14 Deliverables:**

- [ ] Background sync working
- [ ] Push notifications
- [ ] Email notifications
- [ ] Polished UI/UX

### Week 15: Documentation & Training

| Day | Task | Deliverable |
|-----|------|-------------|
| 1 | Write user documentation | User guide |
| 1 | Create admin documentation | Admin guide |
| 2 | Record training videos | Video tutorials |
| 2 | Create quick start guide | Onboarding doc |
| 3 | Write API documentation | API docs |
| 3 | Create troubleshooting guide | FAQ document |
| 4 | Prepare training materials | Slide deck |
| 4 | Schedule training sessions | Training plan |
| 5 | Conduct internal training | Team training |

**Week 15 Deliverables:**

- [ ] Complete documentation
- [ ] Training videos
- [ ] Quick start guide
- [ ] Team trained

### Week 16: Deployment & Launch

| Day | Task | Deliverable |
|-----|------|-------------|
| 1 | Set up production environment | Prod deployment |
| 1 | Configure domain & SSL | Custom domain |
| 2 | Deploy to production | Live site |
| 2 | Set up monitoring | Error tracking |
| 3 | Configure backups | Backup system |
| 3 | Load testing | Performance test |
| 4 | Soft launch with beta users | Beta testing |
| 4 | Collect feedback | Feedback review |
| 5 | Official launch | Public release |

**Week 16 Deliverables:**

- [ ] Production deployment
- [ ] Monitoring active
- [ ] Backups configured
- [ ] Official launch

**Phase 4 Completion Criteria:**

- ✅ All tests passing
- ✅ Production deployment live
- ✅ Documentation complete
- ✅ Team trained
- ✅ Users onboarded

---

## POST-MVP ROADMAP

### Q2 2026 (Months 5-6)

| Feature | Priority | Description |
|---------|----------|-------------|
| Real-time Tracking | High | Live location dots on map |
| Advanced Analytics | High | Predictive reporting |
| Utility Integrations | Medium | Duke, FPL API connections |
| Mobile Native Apps | Medium | iOS/Android wrappers |
| Multi-language | Low | Spanish support |

### Q3 2026 (Months 7-9)

| Feature | Priority | Description |
|---------|----------|-------------|
| AI Route Optimization | High | ML-powered routing |
| Damage Prediction | Medium | ML damage assessment |
| Client Portal | Medium | Utility client access |
| API for Partners | Medium | Third-party integrations |
| Advanced Permissions | Low | Granular role controls |

### Q4 2026 (Months 10-12)

| Feature | Priority | Description |
|---------|----------|-------------|
| White-label Option | Medium | Rebrand for other contractors |
| International | Low | Canada/Mexico expansion |
| IoT Integration | Low | Sensor data integration |
| Drone Support | Low | Drone photo integration |

---

## RESOURCE REQUIREMENTS

### Development Team

| Role | Count | Duration |
|------|-------|----------|
| Tech Lead / Full-Stack | 1 | Full project |
| Frontend Developer | 2 | Weeks 1-16 |
| Backend Developer | 1 | Weeks 1-12 |
| UI/UX Designer | 1 | Weeks 1-8 |
| QA Engineer | 1 | Weeks 9-16 |
| DevOps Engineer | 0.5 | Weeks 1, 13-16 |

### Infrastructure Costs (Monthly)

| Service | Cost |
|---------|------|
| Supabase (Pro Plan) | $25 |
| Mapbox (10k loads/month) | $50 |
| Vercel (Pro Plan) | $20 |
| AWS S3 (Storage) | $10 |
| SendGrid (Emails) | $20 |
| **Total Monthly** | **~$125** |

### Third-Party Services

| Service | Purpose | Cost |
|---------|---------|------|
| Supabase Auth | Authentication | Included |
| Supabase Database | PostgreSQL | Included |
| Supabase Storage | File storage | Included |
| Mapbox | Maps & routing | $50/mo |
| Vercel | Hosting | $20/mo |

---

**END OF PROJECT ROADMAP**
