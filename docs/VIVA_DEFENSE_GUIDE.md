# OneSociety — Viva Voce & Technical Defense Guide

This guide is designed for defending the OneSociety project in front of technical examiners, evaluators, and project review panels.

---

## 1. Top 10 Technical Questions & Answers

### Q1: Why did you choose MongoDB over a relational database like PostgreSQL?
**Answer:**
Apartment societies operate on semi-structured, highly dynamic data across diverse domains (IoT-like gate event streams, varied rental item attributes, nested progress updates on maintenance repairs, and multi-tier pricing objects). MongoDB's document model fits this perfectly without requiring 30+ normalized join tables.  
*Critical addition:* Whenever relational integrity or financial multi-document consistency is needed (e.g. escrow holds, dues payments, and ledger entries), we execute them inside **MongoDB Multi-Document ACID Transactions** backed by a replica set.

---

### Q2: How do you prevent financial rounding errors when calculating group discounts, overtime rentals, or maintenance balances?
**Answer:**
We strictly store all monetary amounts as **integers in paise** (`₹1.00 = 100 paise`).  
In standard JavaScript/TypeScript, IEEE 754 floating-point arithmetic introduces rounding inaccuracies (e.g., `0.1 + 0.2 = 0.30000000000000004`). By using integer paise across all schemas (`amountPaise`, `chargePaise`, `safeDepositPaise`, `balanceAfterPaise`), rounding errors are eliminated. Conversions to rupees occur only at the presentation layer with a formatting utility function.

---

### Q3: How do you prevent double-spending or race conditions in Escrow and Rental Bookings?
**Answer:**
We apply two defensive mechanisms:
1. **Idempotency Keys:** Every payment or escrow mutation requires an idempotency key (e.g., `rental-booking-hold-${booking._id}`). Duplicate submissions are blocked by a unique database index.
2. **Conditional Atomic Updates:** Booking acceptance and item status updates check state conditions directly in the query (e.g., `status: 'AVAILABLE'`), guaranteeing atomic check-and-set semantics that prevent two neighbors from simultaneously booking the same item.

---

### Q4: How is resident privacy maintained at the security gate?
**Answer:**
Standard society apps allow security guards to view resident phone numbers, family names, and work schedules. OneSociety enforces an **Information Boundary**:
- The guard's `searchFlatPresence` API returns strictly:
  ```json
  { "flatCode": "A-102", "status": "NOT_PRESENT", "lastUpdated": "...", "isStale": false }
  ```
- Resident names, phone numbers, and member counts are filtered out server-side.
- The guard only knows if someone is currently inside to admit visitors; they never receive resident personal data.

---

### Q5: How do you handle duplicate complaints when 10 residents report a broken lift?
**Answer:**
Instead of dispatching 10 separate maintenance tickets:
- The system runs an **AI & Heuristic Clustering Engine** (`IssueCluster`).
- When a complaint is submitted with category `LIFT` and location `Block B, Lift 2`, it automatically attaches to an active cluster.
- Every resident gets real-time tracking updates, while the society president negotiates with a single vendor, saving vendor dispatch fees.

---

### Q6: Can a security guard create a gate pass?
**Answer:**
**Strictly NO.** Only residents who own or reside in a flat can authorize access to their home. If a security guard tries to invoke the `POST /api/v1/society-help/gate/visitor-pass` endpoint, the server enforces role authorization and rejects the request with a `403 Forbidden` (`GuardPassCreationForbiddenError`). Guards can only scan, log manual notepad entries, or confirm entries.

---

### Q7: How does the offline / zero-cost payment system work?
**Answer:**
Rather than forcing a paid third-party payment gateway that charges 2% transaction fees:
- OneSociety implements an internal **Escrow Ledger & Maintenance Due State Machine**.
- Payments are processed with deterministic verification (`REC-YYYYMM-FLAT` receipt generator) and simulated Razorpay test mode adapters.
- In-app dues generate verifiable receipts immediately, while offline payments can be recorded with mandatory receipt photo proof.

---

### Q8: What happens during an emergency SOS?
**Answer:**
1. A resident activates the SOS button from their home screen.
2. A 30-second cancellation window gives them time to abort in case of accidental touches.
3. Once active, Socket.IO emits a priority emergency event to security guards and the president, triggering a visual siren with the exact flat code.
4. When a guard taps "Acknowledge", the database records the guard's user ID and timestamp, and notifies the resident: *"Security guard Ramu has acknowledged your alert and is heading to Flat A-102"*.

---

### Q9: Why React Native with Expo instead of native iOS/Android or Flutter?
**Answer:**
1. **Single TypeScript Codebase:** Sharing types, validation schemas (Zod), and business logic interfaces between the Express backend and the mobile app saves development time and prevents API contract mismatches.
2. **Expo Router v4:** Enables clean, file-based routing and deep linking (used for sharing visitor passes via SMS/WhatsApp links without requiring the visitor to install the app).
3. **Cross-Platform Delivery:** Runs smoothly on Android, iOS, and the web from a single repository.

---

### Q10: How do you handle database maintenance and automated cleanup?
**Answer:**
We integrate **Agenda** (MongoDB-backed scheduled job runner) to run background maintenance without needing a separate Redis instance:
- Auto-expires unaccepted visitor passes at 23:59.
- Auto-closes group buying payment windows.
- Marks unverified complaints and sends reminders.

---

## 2. Live Demo Script for Examiners (5 Minutes)

| Time | Persona | Action & Demonstration | Key Point to Highlight |
|---|---|---|---|
| **0:00 - 1:00** | **Resident** (`suresh.kumar`) | 1. Toggle "Someone at home" to OFF.<br>2. Open **Maintenance Accounts**, view ₹2,500 due, tap **Pay**, and download the official receipt (`REC-202611-A102`). | Zero floating-point rounding (integer paise), instant receipt generation. |
| **1:00 - 2:00** | **Security Guard** (`guard.gate1`) | 1. Open **Manual Visitor Log**.<br>2. Try logging a visitor to Flat A-102.<br>3. Watch the app block entry in RED because resident is not at home.<br>4. Select "Parcel dropped at gate" for a delivery agent. | Enforces security policy automatically without guard bias. |
| **2:00 - 3:00** | **Security Guard** (`guard.gate1`) | 1. Open **Scan Pass** and scan a family pass.<br>2. Demonstrate the dynamic `+`/`-` headcount counter.<br>3. Show that exit count cannot exceed people currently inside. | Mathematical headcount invariant ($exit \le inside$). |
| **3:00 - 4:00** | **President** (`ramesh.naidu`) | 1. Open **Maintenance Control**.<br>2. Show fund balance, monthly bars, and proof photos on all expenses.<br>3. Open **Smart Complaints** to show 5 complaints grouped into 1 Lift Issue Cluster. | AI duplicate clustering and mandatory financial proof. |
| **4:00 - 5:00** | **Resident & Guard** | 1. Trigger **Emergency SOS** from resident.<br>2. Guard acknowledges: status changes to *"Guard is on the way!"*. | Real-time Socket.IO dispatch and life-safety fail-safes. |
