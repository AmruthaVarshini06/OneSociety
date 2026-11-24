\# OneSociety: project brief (read this at the start of every session)



\## What we are building

A mobile app for apartment societies, built in modules. One app, role-based screens. Roles: resident, president, security guard (watchman), supplier, service provider (internal or external), delivery partner.

Modules, in build order: (0) Foundation, (1) Group Buying, (2) Share and Rent, (3) ServiceHub, (4) Smart Complaint Handling, (5) Society Help, (6) Demo polish (Festival Mode deferred per user instruction).

The detailed spec for each module is given to you when we start that module. Build only what the spec says. Do not add features or modules on your own.



\## Tech stack (do not change or add paid services without asking)

\- Mobile app: React Native with Expo (Expo Router) and TypeScript. Use React Query for server data, one UI kit (React Native Paper), expo-camera for QR scanning and live photo capture, expo-image-manipulator to compress images before upload, expo-notifications for push, socket.io-client for live updates.

\- Backend: Node.js with TypeScript and Express. One folder per module under src/modules. Validate every request body with zod.

\- Database: MongoDB Atlas free cluster, using Mongoose. Use a separate dev database. Never run destructive commands on a shared database.

\- Auth: JWT (short-lived access token plus refresh token), passwords hashed with argon2 or bcrypt, role stored on the user. A role-check middleware on EVERY route (no row-level security exists, so the API is the only protection).

\- File storage: Cloudinary free tier (or Firebase Storage). Only URLs are stored in MongoDB, never image bytes. Provider ID documents go in private/authenticated storage and are shown only through short-lived signed URLs.

\- Realtime: Socket.IO on the Node server (group buy progress bar, chat, gate dashboard). Do not poll the database for live updates.

\- Scheduled jobs: Agenda (stored in MongoDB) for deadlines, payment windows, 24-hour issue windows, reminders, and auto-closing.

\- Push notifications: Firebase Cloud Messaging. WhatsApp/SMS is mocked behind an adapter that only logs the message.

\- AI: Claude API, model claude-haiku-5-5. Always ask for JSON, validate it with zod on the server, and keep a rule-based fallback so the app works if the AI call fails or the key is missing. Keep prompts short to keep cost low.

\- Payments: an internal escrow ledger plus Razorpay in TEST MODE only. No real money.

\- Text: i18next with English, Hindi, and Telugu files. No hard-coded user-facing text.



\## Free-tier constraints

\- MongoDB free cluster: 0.5 GB of data and about 100 operations per second. Keep documents small, add indexes for common queries, avoid polling, avoid storing large arrays that grow without limit.

\- Compress images on the phone before upload.

\- Mock these behind adapters: GST verification, WhatsApp/SMS, real payouts, real OTP login (use username/password or email login for demo accounts).



\## MongoDB rules (important)

\- Transactions: every change that touches money (escrow HOLD, RELEASE, REFUND, payouts, maintenance ledger entries) and every change that must update several documents together runs inside a MongoDB multi-document transaction. Transactions need a replica set: Atlas has one. For local development use Atlas, or a local replica set, and say which you chose.

\- No foreign keys exist: store references by ID and check that the referenced document exists before saving. Use unique indexes to enforce rules like "one commitment per flat per group order".

\- Concurrency: use atomic conditional updates (findOneAndUpdate with a condition, $inc with a limit) for anything with a cap, such as group-order quantity limits and double-booking a rental slot.

\- Every collection has a Mongoose schema with validation, timestamps, and indexes defined in code.

\- Never edit data by hand in a way the app cannot reproduce. Seed data comes from a seed script.



\## Engineering rules

\- Money is stored as integers in paise. Never floats.

\- Dates and deadlines use server time (UTC), shown in the user's local time.

\- All status changes go through server-side state machines. Invalid transitions are rejected and covered by tests.

\- Payments, QR scans, and other actions that must not run twice need idempotency (a unique request key).

\- Shared services are used by all modules and changed only when the task says so: auth and roles, notifications, uploads, realtime, scheduled jobs, escrow ledger, maintenance ledger, QR token service, audit log.

\- QR codes carry a signed token (id, type, expiry), never plain data. Tokens are verified on the server.

\- Write pure functions with unit tests for: group-buy tier pricing, rental charge calculation, complaint priority scoring.

\- Backend tests use Jest with an in-memory MongoDB replica set (MongoMemoryReplSet) so transactions are tested.

\- Every mobile screen has loading, empty, and error states.

\- Secrets live in .env, never in the repo. Keep an up-to-date .env.example.

\- Personal documents (ID proofs) are sensitive: private storage, access only for the president and the owner of the document, and every access is written to the audit log.

\- Seed data: follow docs/SEED_DATA.md. The seed script is built in stages, one section per module, only when I ask. The society has 4 blocks and 24 flats (this replaces any earlier mention of 20 flats).



\## Cross-module links (design shared services so these work later)

\- Group Buying gate delivery uses the guard role and the QR token service. Society Help later extends the guard screens.

\- Complaints suggest ServiceHub providers as vendors. Complaint payments later create maintenance ledger entries in Society Help.

\- ServiceHub providers get gate QR passes in Society Help and appear in the guard's scan screen with their schedule.

\- Share and Rent, Group Buying, and Society Help use the same notification service, photo upload service, and escrow ledger.



\## Workflow rules (always follow)

1\. Work on ONE module and ONE phase at a time. Before writing code, give a short plan: collections, endpoints, screens, files, what you will reuse. Wait for my approval.

2\. Build only the approved phase. If something in the spec is unclear or two things conflict, ask me before guessing.

3\. Keep commits small. Commit message format: "\[module] phase N: what changed".

4\. After each phase: run all tests, then tell me exactly how to start the backend and the app and how to test the phase by hand on a real phone (happy path plus one failure case).

5\. Update the Progress section below after each phase.

6\. Do not start the next phase until I say so.

7\. If a requested feature needs a paid service, stop and tell me the free alternative.



\## Progress (update after each phase)

| Module | Phase | Status | Known Issues | Mocked |
|--------|-------|--------|-------------|--------|
| 0 — Foundation | P1: Repo & Auth | ✅ Done | None | FCM (FCM_ENABLED=false), WhatsApp/SMS (always logs), Cloudinary (stub), Agenda (stub) |
| 0 — Foundation | P2: Society data | 🔲 Pending | — | — |
| 0 — Foundation | P3: Notifications | 🔲 Pending | — | — |
| 0 — Foundation | P4: Uploads | 🔲 Pending | — | — |
| 0 — Foundation | P5: Realtime & Jobs | 🔲 Pending | — | — |
| 0 — Foundation | P6: Ledger, QR, Audit | 🔲 Pending | — | — |
| 0 — Foundation | P7: i18n | 🔲 Pending | — | — |
| 0 — Foundation | P8: Seed & Tests | 🔲 Pending | — | — |
| 1 — Group Buying | P1: Supplier entity & verification | ✅ Done | None | GST check (pure checksum, no paid API), WhatsApp (logs only) |
| 1 — Group Buying | P2: Demand pooling | ✅ Done | None | — |
| 1 — Group Buying | P3: Supplier offers & selection | ✅ Done | None | — |
| 1 — Group Buying | P4: Payment window & escrow | ✅ Done | None | Razorpay test mode / mock adapter |
| 1 — Group Buying | P5: QR delivery passes & gate delivery | ✅ Done | None | Single-use HMAC QR token, mock OTP fallback |
| 1 — Group Buying | P6: 24h issues, ratings & escrow settlement | ✅ Done | None | Client-side 24h countdown, pro-rata item refunds |
| 1 — Group Buying | P7: Notifications & polish | ✅ Done | None | WhatsApp mock logger, in-app feed, live tab badges |
| 2 — Share and Rent | P1: Catalog, listings & AI price verification | ✅ Done | None | AI price verifier (rule-based sanity engine, zero paid API) |
| 2 — Share and Rent | P2: Item requests, notifications & offers | ✅ Done | None | Priority notification broadcast, transactional offer acceptance |
| 2 — Share and Rent | P3: Bookings, calendar & escrow payment | ✅ Done | None | Razorpay mock adapter (mock_payment) |
| 2 — Share and Rent | P4: Pickup proof, return timer & extensions | ✅ Done | None | Client-side timer, mock camera proof |
| 2 — Share and Rent | P5: Return photo proof & time-based charges | ✅ Done | None | Time-based calculation engine (15m grace, daily cap) |
| 2 — Share and Rent | P6: Settlement, disputes & ratings | ✅ Done | None | Escrow release/refund/deduct |
| 2 — Share and Rent | P7: Notifications, seed data & polish | ✅ Done | None | In-memory Mongo runner, multi-lang i18n |
| 3 — ServiceHub | P1: Complete Skills Marketplace | ✅ Done | None | Zero paid APIs, Mock WhatsApp/SMS, Pure algorithmic conflict detection |
| 4 — Smart Complaints | P1: Complete Smart Complaint Handling | ✅ Done | None | Zero paid APIs, Rule-based AI scope & priority engine, Mock WhatsApp/SMS |

### Smart Complaints P1 details
- **Architecture & Roles**:
  - Resident: Raise common area complaints with 1-5 photos, emergency banner, pre-submit scope check (flat issues blocked with ServiceHub redirect) & similar-issue detection; view timeline, cost & payment breakdown; confirm fixed; reopen solved issues (reason + photo); edit/withdraw own complaint before CONTACTED.
  - President: Exclusive status manager (NEW -> CONTACTED -> IN_PROGRESS -> SOLVED -> CLOSED, REOPENED, OUT_OF_SCOPE), vendor assigner with ServiceHub & Local Vendors directory integration, clash check, batching trade hints, cost breakdown & payment logger with high-cost warnings, priority override, cluster merge/split, and spam moderation.
  - Concurrency: Optimistic concurrency control using cluster `version` checking to eliminate race conditions across multiple devices.
- **AI Scoring & Rules**:
  - Scope check: Blocks flat-internal issues politely and directs to ServiceHub; flags unclear boundary issues for president review.
  - Duplicate clustering: Duplicates are never blocked; each post is preserved with its own photos and description; logarithmic count curve raises cluster priority.
  - Exact formula: `Priority = 100 * (0.40 * Severity/5 + 0.25 * count_score + 0.15 * Scope + 0.10 * Waiting + 0.10 * ReopenFactor)`.
  - Safety override: Severity 5 (life/safety hazard) triggers immediate CRITICAL (100) priority and urgent president notification.
  - SLA Response targets: Critical 4h, High 24h, Medium 3d, Low 7d.
- **Backend & Models**:
  - Mongoose models under `src/modules/complaints/models/`: `Complaint`, `IssueCluster`, `LocalVendor`, `ComplaintConfig`.
  - Services: `complaint.service.ts`, `president-action.service.ts`, `vendor-directory.service.ts`.
  - Controllers & Routers mounted at `/api/v1/complaints`.
  - Agenda Scheduler: `complaints-priority-recalc`, `complaints-target-sla-reminders`, `complaints-work-overdue-reminders`, `complaints-auto-close`.
- **Mobile Frontend**:
  - `complaints/index.tsx`: Feed with emergency banner, search, filters (status, category, priority, block, my complaints), president shortcut.
  - `complaints/new.tsx`: Multi-step report form with emergency notice, AI scope check modal, similar open issue suggestions, photo picker.
  - `complaints/[id].tsx`: Issue details, photo gallery, progress timeline, transparent cost & payment breakdown, confirm fixed, reopen dialog.
  - `complaints/admin/index.tsx`: President control center with metrics, Priority Queue, Kanban Board, and Work Order Batching.
  - `complaints/admin/action/[id].tsx`: Manage issue: contact vendor with clash warning, WIP updates, mark solved, cost line items & payment, priority override, out of scope.
  - `complaints/admin/vendors.tsx`: Reusable Local Vendors directory CRUD.
  - `complaints/admin/reports.tsx`: Analytics on repeat problem areas, category/block breakdown, spend by category/month, vendor performance.
- **Verification & Tests**:
  - 12 passed test suites (91/91 tests green).
  - TypeScript 0 errors on both server and mobile.
  - Seed data: 12 clusters forming 14 complaints across 11 realistic society scenarios.
  - 3-minute demo script in `docs/COMPLAINTS_DEMO.md`.

### ServiceHub P1 details
- **Architecture & Roles**:
  - Resident Seeker: Integrated in resident workspace to browse, filter, negotiate and book verified providers.
  - Internal Provider: Residents offering skills (tutors, fitness, music, repairs) use same credentials with a dual-view switcher; cannot register as domestic help.
  - External Provider: Outsiders (domestic maids, cooks, repairs) have an isolated provider interface with zero access to resident society modules; temporary and permanent credentials.
  - President Tools: Verification queue with document viewer, issuance of temporary credentials, one-way conversion guard to PERMANENT, complaint management and audit reports.
- **Backend & Models**:
  - 10 Mongoose models under `src/modules/service-hub/`: Categories, ProviderProfiles, ProviderDocuments, ServiceRequests, ServiceChat, ServiceAgreements, ServiceVisits, ServicePayments, ServiceReviews, ServiceComplaints.
  - 8 Business Services with state machine guards and audit logging.
  - 10 Express Sub-Routers mounted under `/api/v1/services`.
  - Background Scheduler: Agenda jobs for 24h request expiry, schedule reminders (evening before & 1h prior), payment window alerts & overdue detection, monthly recurring payment window generation, and account/document expiry warnings.
- **Mobile Screens (23 screens)**:
  - Seeker: Home categories, Browse with filters (internal/external, rating, work type, price), Provider profile, Service request multi-step form, Request details, Negotiation Chat with interactive Price Offer cards & payment window rules, Locked agreement view with revision flow, Payments manager, Rate & review.
  - Provider Portal: Today's Schedule home screen, Requests inbox with 1-tap accept/decline, Calendar & daily schedule, Availability configuration, Earnings tracker & offline receipt confirmation, Profile edit with permanent username customization & document upload, Customer reviews.
  - President Admin: Verification queue, Providers directory with one-way permanent conversion guard, Create external accounts with auto-generated credentials, Complaints resolution, Reports & audit.
- **Seed Data & Testing**:
  - 12 verified & pending providers across 6 categories (3 domestic helps, 2 external pros, 7 resident neighbours).
  - 10/10 Jest test suites passing (78 unit/integration tests).
  - 0 TypeScript errors on server & mobile.
  - Complete 3-minute demo script in `docs/SERVICE_HUB_DEMO.md`.

### Share and Rent P7 details
- **Notifications & Deep-Linking**:
  - Full suite of lifecycle event triggers: `BOOKING_REQUESTED`, `BOOKING_ACCEPTED`, `BOOKING_DECLINED`, `BOOKING_PAID`, `RENTAL_IN_USE`, `EXTENSION_REQUESTED`, `EXTENSION_APPROVED`, `EXTENSION_DECLINED`, `EXTENSION_PAID`, `RENTAL_RETURNED`, `RENTAL_DISPUTE_RAISED`, `DISPUTE_ESCALATED`, `DISPUTE_RESOLVED`, `PRESIDENT_RULING`, `BOOKING_SETTLED`, `OVERTIME_SETTLED`
  - Mobile Notifications Center deep-linking: smart routing directly to rental booking details, catalog items, or President dispute queue based on notification type
- **Localization (i18n)**:
  - English (`en.json`), Hindi (`hi.json`), and Telugu (`te.json`) localized strings for the entire Share and Rent module (`rentals` namespace covering categories, rates, booking states, return photo proof, overtime settlement, dispute arbitration, and ratings)
- **Seed Data (`npm run seed`)**:
  - `apps/server/scripts/seed/section3-sharerent.ts`:
    - 9 Catalog Categories (`tools`, `kitchen`, `event`, `travel`, `electronics`, `outdoor`, `baby-kids`, `cleaning`, `mobility`)
    - 22 realistic rental items with AI price verified badges (`FAIR`), plus 2 unavailable items (`Bluetooth party speaker`, `Wheelchair`) and 1 draft listing rejected as `TOO_HIGH`
    - 6 bookings covering all lifecycle states (`SETTLED`, `IN_USE`, `REQUESTED`, `OVERDUE`, `IN_DISPUTE`, `CANCELLED`)
    - 1 escalated dispute awaiting Society President ruling
    - 1 open item request ("Vacuum cleaner needed Saturday") with 2 neighbor offers
    - 8 reciprocal neighbor reviews and ratings
    - Auto-generated demo credentials in `docs/DEMO_LOGINS.md`
- **Demo Script**:
  - `docs/SHARE_RENT_DEMO.md`: complete 3-minute live walkthrough script covering browsing, AI price verification, escrow booking, dual photo proof, return calculations, and dispute arbitration
- **Tests**: 72/72 tests pass across 9 suites; TypeScript: 0 errors across mobile and server

### Share and Rent P6 details
- **Collections & Models**:
  - `RentalDispute`: `bookingId` (unique), `societyId`, `ownerId`, `renterId`, `claimedAmountPaise`, `issueCategory` (`DAMAGE`, `LATE_RETURN`, `MISSING_ACCESSORY`, `WRONG_ITEM`, `OTHER`), `ownerDescription`, `ownerEvidencePhotos`, `renterResponse` (`PENDING`, `ACCEPTED`, `CONTESTED`), `renterCounterNote`, `status` (`OPEN`, `RESOLVED_MUTUAL`, `ESCALATED`, `RESOLVED_PRESIDENT`), `settlementSplit`, `presidentDecision`, `escalatedAt`, `resolvedAt`
  - `RentalRating`: `bookingId`, `societyId`, `itemId`, `raterId`, `ratedUserId`, `raterRole` (`RENTER`, `OWNER`), `itemRating` (1-5), `communicationRating` (1-5), `punctualityRating` (1-5), `reviewText`, `tags`, unique compound index `{ bookingId: 1, raterId: 1 }`
  - `RentalBooking`: updated with `settledAt`
- **Services & Logic**:
  - `RentalDisputeService`: Dispute creation (freezes escrow), mutual agreement (release to owner + deposit deduction + refund remainder), renter contestation and escalation, president binding arbitration (`ownerAmountPaise` + `renterRefundPaise` split execution)
  - `RentalRatingService`: Reciprocal rating submission with automated rolling updates for `RentalItem.averageRating` and `RentalItem.ratingCount`
  - `RentalBookingService.settleBooking`: Automatic happy-path settlement releasing rental charges to owner and refunding safe deposit + early return refund to renter
- **Tests**: 71/71 tests pass; TypeScript: 0 errors across mobile and server
- **Routes**:
  - `/api/v1/rentals/bookings/:id/settle` (POST)
  - `/api/v1/rentals/disputes` (`POST /`, `POST /:id/respond`, `POST /:id/escalate`, `POST /:id/resolve-president`, `GET /booking/:bookingId`, `GET /admin/pending`)
  - `/api/v1/rentals/ratings` (`POST /`, `GET /booking/:bookingId`, `GET /item/:itemId`)
- **Mobile Screens**:
  - `apps/mobile/app/(app)/rentals/bookings/[id].tsx`:
    - Settlement summary card with "Execute Escrow Settlement"
    - Dispute card with mutual acceptance or contest dialogs
    - Post-settlement reciprocal star ratings & review submission modal
    - Completed reviews card displaying item/renter/owner feedback
  - `apps/mobile/app/(app)/rentals/admin/disputes.tsx`:
    - Society President dispute resolution queue with evidence inspection and binding ruling split dialog
  - `apps/mobile/app/(app)/rentals/[id].tsx`:
    - Neighbor reviews list with average star rating chip

### Society Help (Module 5) details
- **Collections**: `QrPass` (family, president, provider, visitor, event guest passes; periodic refreshing signed tokens), `GateEvent` (direction ENTRY/EXIT, count with +/- selector, headcount tracking), `ManualVisitorLog` (visitor notepad, delivery agents, 1-tap exit, nobody-at-home denial, gate parcel drop), `ShiftHandover` (notes, headcount, guard signatures), `MaintenancePlan` (₹2,500 monthly dues, category budgets), `MaintenanceDue` (receipt `REC-YYYYMM-FLAT`, zero-cost in-app payment), `MaintenanceLedger` (mandatory expense proof photos, category tracking, Module 4 complaint linkage), `ExpenseQuery` (resident inquiries & president answers), `CommunityEvent` (quiet hours past 22:00 enforcement, guest pass generation, over-estimate >115% alerts, presence automation), `EmergencyAlert` (2-step resident trigger, 30s cancellation window, guard acknowledgement "Guard is on the way").
- **Security & Privacy Invariants**: Guard strictly forbidden from creating QR passes (`GuardPassCreationForbiddenError`); guard flat search returns strictly `PRESENT | NOT_PRESENT` with timestamp and NO personal details; exit count <= inside count.
- **Financial Rule**: Zero-cost architecture; all currency in integer paise; mandatory proof photos for all expenses; audit history with no hard deletions.
- **Tests**: 11/11 tests pass in `tests/society-help.test.ts`; TypeScript: 0 errors across mobile and server.
- **Mobile Screens**: Guard portal (`scan.tsx`, `manual-log.tsx`, `currently-inside.tsx`, `gate-dashboard.tsx`, `flat-search.tsx`, `events.tsx`, `handover.tsx`, `salary.tsx`), Resident/President portal (`passes.tsx`, `visitor-link/[code].tsx`, `maintenance/index.tsx`, `maintenance/pay.tsx`, `events/index.tsx`, `events/new.tsx`, `admin/maintenance-control.tsx`, `admin/queries.tsx`), and Home shortcuts on resident, president, guard, and provider dashboards.

### Share and Rent P5 details
- **Schema & State Machine**: `RentalBooking` updated with `returnPhotos` array (url, ISO timestamp, uploadedBy `OWNER|RENTER`, caption), `actualEndAt`, `actualTimeUsedMs`, `billedUnits`, `gracePeriodMinutes`, `finalRentalChargePaise`, `earlyRefundPaise`, `overtimeChargePaise`, `overtimePaymentMethod`, `overtimePaid`, `conditionConfirmedByOwner`, `ownerConditionNotes`, `renterSatisfactionConfirmed`, `renterSatisfactionConfirmedAt`
  - State machine transition: `IN_USE` / `OVERDUE` → `RETURN_PENDING` (requires $\ge 2$ owner return photos) → `RETURNED` (or `IN_DISPUTE` if owner raises issue)
  - Time-based final charge engine: `max(1, ceil((actualTimeUsed - gracePeriod) / unitDuration))` with 15-minute grace period, daily rate capping, early return refunds, and overtime settlement (direct payment or deposit deduction)
- **Tests**: 71/71 tests pass; TypeScript: 0 errors across mobile and server
- **Routes**: `/api/v1/rentals/bookings` (`POST /:id/return-photos`, `GET /:id/return-summary`, `POST /:id/confirm-return`, `POST /:id/pay-overtime`, `POST /:id/renter-confirm`)
- **Mobile Screens**:
  - `apps/mobile/app/(app)/rentals/bookings/[id].tsx`:
    - Return condition photo proof with $\ge 2$ photos requirement for owner
    - Side-by-side photo comparison (Pickup baseline vs Return condition)
    - Owner verdict buttons: "Good Condition" vs "Raise an Issue"
    - Time-Based Final Charge breakdown card with early return refund banner or overtime meter
    - Overtime settlement options for renter ("Pay Directly" or "Deduct from Deposit")
    - Renter satisfaction confirmation button

### Share and Rent P4 details
- **Schema & State Machine**: `RentalBooking` updated with `pickupPhotos` array (url, ISO timestamp, uploadedBy `RENTER|OWNER`, caption), `handoverConfirmedAt`, `handoverConfirmedByOwner`, `actualStartAt`, `effectiveEndAt`, and embedded `extension` (requestedUnits, additionalChargePaise, status `NONE|PENDING|APPROVED|DECLINED|PAID`, requestedAt, respondedAt, paidAt, escrowHoldKey)
  - State machine transition: `PICKUP_PENDING` → `IN_USE` (requires $\ge 2$ renter condition photos; clock begins on owner confirmation)
  - Return countdown timer with active threshold alerts (<1 hour remaining, overdue warnings)
  - Extension request flow with schedule conflict validation against future bookings, daily rate cap handling, and supplementary escrow hold
- **Tests**: 71/71 tests pass; TypeScript: 0 errors across mobile and server
- **Routes**: `/api/v1/rentals/bookings` (`POST /:id/pickup-photos`, `POST /:id/confirm-handover`, `POST /:id/request-extension`, `POST /:id/respond-extension`, `POST /:id/pay-extension`)
- **Mobile Screens**:
  - `apps/mobile/app/(app)/rentals/bookings/[id].tsx`:
    - Pickup proof photo gallery with timestamp chips and $\ge 2$ photo requirement indicator
    - Owner handover confirmation card with validation gate
    - Active countdown clock (HH:MM:SS) showing real-time countdown to return deadline
    - Extension request modal for renter with live price preview
    - Extension approval/decline card for owner
    - Extension escrow payment button for renter

### Share and Rent P3 details
- **Collections**: `RentalBooking` (`societyId`, `itemId`, `renterId`, `ownerId`, `renterFlatId`, `ownerFlatId`, `status`, `billingUnit`, `bookedUnits`, `ratePerUnitPaise`, `chargePaise`, `safeDepositPaise`, `totalEscrowPaise`, `escrowHoldId`, `startAt`, `expectedEndAt`, `expiresAt`, `renterNote`, `declineReason`, `cancellationReason`)
  - State machine: `REQUESTED` → `ACCEPTED` → `PAID_IN_ESCROW` → `PICKUP_PENDING` (also `DECLINED`, `CANCELLED`, `EXPIRED`)
  - Conflict detection on active bookings (`ACCEPTED`, `PAID_IN_ESCROW`, `PICKUP_PENDING`, `IN_USE`, `RETURN_PENDING`)
  - 12-hour auto-expiration window for owner response
- **Escrow**: Integrates `escrowService.hold()` using idempotency key `rental-booking-hold-${booking._id}` for charge + safe deposit held in society escrow
- **Tests**: 71/71 tests pass; TypeScript: 0 errors across mobile and server
- **Routes**: `/api/v1/rentals/bookings` (`POST /preview`, `GET /`, `GET /:id`, `POST /`, `POST /:id/respond`, `POST /:id/pay`, `POST /:id/cancel`)
- **Mobile Screens**:
  - `apps/mobile/app/(app)/rentals/book.tsx`: Booking request flow with duration selector, live charge calculation preview card, escrow security details
  - `apps/mobile/app/(app)/rentals/bookings/index.tsx`: Bookings dashboard with filter chips (All, As Renter, As Owner), status color badges
  - `apps/mobile/app/(app)/rentals/bookings/[id].tsx`: Booking detail screen with live action triggers (Owner: Accept/Decline; Renter: Pay into Escrow; Pre-payment: Cancel)
  - `apps/mobile/app/(app)/rentals/_layout.tsx` & `index.tsx`: Integrated sub-navigation and quick-access "Bookings" button

### Share and Rent P2 details
- **Collections**: `RentalItemRequest` (societyId, requesterId, flatId, itemName, category, purpose, neededFrom, durationValue, durationType `HOURS|DAYS`, budgetPaise, status `OPEN|FULFILLED|CANCELLED|EXPIRED`, acceptedOfferId, dismissedBy[], offersCount), `RentalItemOffer` (requestId, offeredById, flatId, existingItemId, itemName, photos, condition, paise rates, safeDepositPaise, message, aiPriceVerification, status `PENDING|ACCEPTED|DECLINED|WITHDRAWN`)
- **Transactions**: `acceptOffer()` uses `mongoose.startSession() + withTransaction()` to atomically mark request FULFILLED, winning offer ACCEPTED, and all competing offers DECLINED
- **Priority Notifications**: On request creation, residents with matching category items listed receive a high-priority "You own this item!" notification; all other society residents receive standard broadcast
- **Tests**: 71/71 tests pass; TypeScript: 0 errors across mobile and server
- **Routes**: `/api/v1/rentals/requests` (`POST /`, `GET /`, `GET /mine`, `GET /:id`, `POST /:id/dismiss`, `POST /:id/cancel`, `POST /:id/offers`, `POST /:id/offers/:offerId/accept`, `DELETE /:id/offers/:offerId`)
- **Mobile Screens**:
  - `apps/mobile/app/(app)/rentals/requests/index.tsx`: Community Wanted Board with Society/My tabs, search, dismiss/cancel/offer quick actions
  - `apps/mobile/app/(app)/rentals/requests/create.tsx`: Request form with quick-pick category chips, duration type toggle, optional budget
  - `apps/mobile/app/(app)/rentals/requests/[id].tsx`: Request detail for requester (see all offers + Accept) and lender (see own offer + "I Have It" offer form with quick-fill from existing listed items), AI price check on every offer
  - `apps/mobile/app/(app)/rentals/index.tsx` updated: "Neighbours Wanted" banner strip linking to Wanted Board + "Requests" action button in header

### Share and Rent P1 details
- **Collections**: `RentalCatalogCategory` (slug, name, icon, descriptions, suggested price ranges in paise, active order), `RentalItem` (ownerId, flatId, societyId, name, category, description, photos, ageYears, condition, paise rates and deposit, aiPriceVerification, status `DRAFT`|`PUBLISHED`|`PENDING_APPROVAL`|`REJECTED`|`UNAVAILABLE`, isAvailable)
- **AI Price Engine**: `price-verifier.ts` (rule-based AI pricing sanity engine, prohibited keyword regex filter for weapons/drugs/chemicals/liquor, deposit <= replacement value check, daily rate <= 20% value check, condition and age depreciation factors)
- **Tests**: 71/71 tests pass (7 price-verifier tests + 2 notification adapter tests + 5 settlement/rating tests + 4 token tests + 16 GST + 20 pricing + 2 Razorpay adapter + 15 auth); TypeScript: 0 errors across mobile and server
- **Routes**: `/api/v1/rentals/items` (`GET /catalog`, `POST /verify-price`, `GET /`, `POST /`, `GET /my-items`, `GET /pending-reviews`, `POST /:id/review`, `GET /:id`, `PATCH /:id`, `PATCH /:id/availability`, `POST /:id/escalate`, `DELETE /:id`)
- **Mobile Screens**:
  - `apps/mobile/app/(app)/rentals/index.tsx`: Catalog category cards with available counts, search bar, list with "Price verified by AI" badge
  - `apps/mobile/app/(app)/rentals/create.tsx`: Multi-step listing form with live AI price verification, prohibited item banner, condition selector, and deposit calculations
  - `apps/mobile/app/(app)/rentals/[id].tsx`: Item photo, specifications, hourly/daily rates, safe deposit, AI verification reasoning, and owner availability toggle
  - `apps/mobile/app/(app)/rentals/my-items.tsx`: Resident's personal catalog with status chips, one-tap pause/share switch, AI draft review alerts, and President escalation dialog
  - `apps/mobile/app/(app)/rentals/admin/reviews.tsx`: Society President queue for reviewing contested prices with Approve/Reject actions
  - Home entry cards in `resident.tsx` and `president.tsx`

### Group Buying P7 details
- **Collections**: `Notification` (persisted in-app user notifications, unread tracking, `{userId, isRead, createdAt}`, `{societyId, createdAt}`)
- **Notification & Messaging Engine**: `notification.service.ts` (persists in DB, dispatches live Socket.IO events to user & society rooms, calls `whatsapp.mock.ts` with formatted logs)
- **Tests**: 64/64 tests pass (2 notification adapter tests + 5 settlement/rating tests + 4 token tests + 16 GST + 20 pricing + 2 Razorpay adapter + 15 auth); TypeScript: 0 errors
- **Routes**: `/api/v1/notifications` (`GET /`, `PATCH /:id/read`, `PATCH /read-all`)
- **Mobile**: Notification Center screen (`notifications.tsx` with All/Unread filters, relative timestamps, type icons, direct deep links to group orders, mark all read), live unread badge on bottom tab bar across all roles (`_layout.tsx`)

### Group Buying P6 details
- **Collections**: `GroupBuyIssue` (ref to delivery pass & commitment, status machine `OPEN` → `RESOLVED_REFUND`/`RESOLVED_REPLACEMENT`/`CLOSED`, presidential escalation override), `GroupBuyRating` (1–5 stars for product & supplier, unique per flat per order)
- **Settlement & Rating Engine**: `settlement.calc.ts` (pure functions for net supplier payout deduction, pro-rata refund calculations, running average rating)
- **State machine**: `DELIVERED` → `COMPLETED` (uncontested escrow released to supplier via `release()`, refunds returned to resident via `refund()`)
- **Tests**: 62/62 tests pass (5 settlement/rating tests + 4 token tests + 16 GST + 20 pricing + 2 Razorpay adapter + 15 auth); TypeScript: 0 errors
- **Routes**: `/api/v1/group-buying/orders/:orderId` (`/issues`, `/issues/:issueId/respond`, `/issues/:issueId/escalate`, `/issues/:issueId/resolve-president`, `/ratings`, `/ratings/mine`, `/settle`)
- **Mobile**: Resident issue report screen (`issue.tsx` with 24h countdown & escalation button), resident star rating screen (`rate.tsx` with 1–5 star selectors), supplier disputes screen (`supplier-issues.tsx` with approve refund & replace actions), president settlement screen (`settlement.tsx` with net payout breakdown & presidential override)

### Group Buying P5 details
- **Collections**: `DeliveryPass` (unique `{groupOrderId, flatId}`, unique `{qrToken}`, single-use token tied to flat & expiry), `DeliveryManifest` (unique `{groupOrderId}`, declared vs received package counts, storage location)
- **Token Generator**: `token.ts` pure function — secure HMAC-SHA256 signature, base64url payload with nonce & timestamp, tampering detection
- **State machine**: `DELIVERY_PENDING` → `DISPATCHED` (supplier dispatches & generates passes) → `DELIVERING` (guard accepts manifest at gate, passes become `AT_GATE`) → `DELIVERED` (when all passes verified via QR scan or OTP fallback)
- **Tests**: 57/57 tests pass (4 token tests + 16 GST + 20 pricing + 2 Razorpay adapter + 15 auth); TypeScript: 0 errors
- **Routes**: `/api/v1/group-buying/orders/:orderId/delivery` (`/dispatch`, `/manifest`, `/gate/accept`, `/gate/pickups`, `/pass/mine`, `/verify-qr`, `/request-otp`, `/verify-otp`)
- **Mobile**: Supplier dispatch screen (`dispatch.tsx`), Guard deliveries & pickups screen (`guard/deliveries.tsx` with manifest acceptance, QR scan verification, and OTP fallback override dialog), Resident pickup screen (`pickup.tsx` with item checklist & verification), Guard home dashboard card

### Group Buying P4 details
- **Collections**: `Commitment` (unique `{groupOrderId, flatId}`, indexes for status and userId), `EscrowEntry` (HOLD on payment, REFUND on failure)
- **Payment adapter**: `razorpay.adapter.ts` (Razorpay test mode / mock mode with deterministic IDs `mock_order_<receipt>` & signature verification `MOCK_SIG_*`)
- **State machine**: `SUPPLIER_SELECTED` → `GROUP_ORDER_OPEN` (locks uniform tier price, generates commitments) → `PAYMENT_WINDOW` (auto-close Agenda job) → `DELIVERY_PENDING` (if min met) or `FAILED` (refunds all paid commitments via Escrow)
- **Tests**: 53/53 tests pass (16 GST + 20 pricing + 2 Razorpay adapter + 15 auth); TypeScript 0 errors (server & mobile)
- **Routes**: `/api/v1/group-buying/orders/:orderId/commitments` (`/mine`, `/mine/pay/initiate`, `/mine/pay/confirm`, `/open`, `/open-payment`, `/close-payment`, `/`)
- **Mobile**: Resident payment screen (`payment.tsx` with one-tap simulated Razorpay payment + escrow feedback), President commitment management screen (`commitments.tsx` with real-time stats, open order, open payment window modal, early window close)

### Group Buying P2 details
- **Collections**: `GroupOrder` (10 statuses, full state machine), `DemandItem` (unique per flat×order)
- **Pricing**: `pricing.ts` pure function — `calculateTieredPrice`, `previewPriceWithExtra`, `validateTiers`
- **Tests**: 36/36 pass (16 GST + 20 pricing); TypeScript: 0 errors
- **Agenda job**: `group-buy-demand-close` scheduled at demandCloseAt → transitions DEMAND_OPEN → OFFERS_OPEN
- **Socket.IO**: `grouporder:demand_updated` emitted after every upsert/retract; `grouporder:status_changed` on deadline close
- **Transactions**: upsert/retract demand uses MongoDB session to atomically update DemandItem + GroupOrder.totalDemandedQuantity
- **Routes**: `/api/v1/group-buying/orders` (CRUD + cancel + demand-summary) + `/:orderId/demand` (PUT/GET/DELETE)
- **Mobile**: Group orders list (all roles, with live progress bars), detail screen (live Socket bar + demand input), create form (president)
- **Server**: `src/modules/group-buying/` — Supplier model, Zod schemas, service, controller, router, GST validator
- **Tests**: 16/16 GST unit tests pass (pure function, no DB needed)
- **TypeScript**: 0 errors
- **Mobile**: Supplier queue list, detail + approve/reject modal, create form (president); profile + edit (supplier)
- **Routes**: POST /register, GET /, GET /me, GET /:id, PUT /me/profile, PATCH /:id/verify — all under `/api/v1/group-buying/suppliers`
- **State machine**: PENDING_REVIEW → GST_VERIFIED → APPROVED/REJECTED (invalid transitions return 409)

### P1 details
- **Server**: 15/15 tests pass (`npm test` in `apps/server`)
- **TypeScript**: 0 errors (`npx tsc --noEmit`)
- **MongoDB binary**: cached at `%LOCALAPPDATA%\mongodb-binaries` (downloaded once, ~509 MB)
- **Mobile**: Expo Router v3, all role screens scaffolded, i18n (en/hi/te) wired, Zustand auth store

