# OneSociety — Share and Rent (3-Minute Live Demo Script)

> **Persona Setup:**
> - **Suresh Kumar** (`suresh.kumar` / `Demo@1234`) — Flat A-102, Owner of the Bosch Drill Machine
> - **Meena Iyer** (`meena.iyer` / `Demo@1234`) — Flat B-201, Renter
> - **Ramesh Naidu** (`ramesh.naidu` / `Demo@1234`) — Flat A-101, Society President

---

## ⏱️ Minute 0:00 – 0:45: Browse Catalog, AI Price Verifier & List an Item

1. **Log in as Meena Iyer** (`meena.iyer` / `Demo@1234`).
2. Navigate to the **Share & Rent** tab.
   - Point out category chips (`Tools`, `Kitchen`, `Electronics`, `Outdoor`, `Event Furniture`).
   - Notice the **"AI Price Verified"** badge on listed items (`Drill machine`, `Aluminium ladder`, `Projector`).
3. Tap on **"List an Item"**:
   - Title: `Bosch Impact Drill`
   - Set hourly rate: `₹150/hr`, safe deposit: `₹5,000`.
   - Tap **"Verify Pricing & Preview"**.
   - Show the live **AI Price Verdict**: `TOO_HIGH` with clear explanation:
     > *"Hourly rate (₹150) and deposit (₹5,000) significantly exceed society median bounds for power tools."*
   - Change to recommended rate: `₹40/hr`, deposit: `₹500`.
   - Verdict changes to green **`FAIR`**. Show that pricing is protected from predatory neighbor rates without any paid API dependencies.

---

## ⏱️ Minute 0:45 – 1:30: Booking Request, Conflict Prevention & Escrow Hold

1. In the Catalog, tap on **"Drill machine"** (owned by Suresh Kumar, Flat A-102).
   - Review past neighbor ratings (5.0 ★ average across 2 rentals).
2. Tap **"Book Item"**:
   - Select `Hourly` billing, 4 hours.
   - Live breakdown shows:
     - Rental charge: `₹160` (4 hrs × ₹40)
     - Safe deposit hold: `₹500`
     - Total escrow hold: `₹660`
   - Tap **"Request Booking"**.
3. **Switch to Suresh Kumar** (`suresh.kumar` / `Demo@1234`):
   - Notice push notification and in-app alert: *"New Booking Request from Meena (B-201)"*.
   - Open booking detail $\rightarrow$ tap **"Accept Booking"**.
4. **Switch back to Meena**:
   - Booking moves to `ACCEPTED`. Tap **"Pay into Escrow"**.
   - Razorpay test mode adapter processes `₹660` into society escrow ledger.
   - Status updates to `PICKUP_PENDING`.

---

## ⏱️ Minute 1:30 – 2:15: Pickup Condition Proof & Active Rental Timer

1. **Meet for Handover at Flat A-102**:
   - Meena inspects the drill.
   - Tap **"Upload Pickup Photos"** $\rightarrow$ attach 2 photos (drill chuck and motor body) to establish pre-rental baseline condition.
2. Suresh taps **"Confirm Handover"**:
   - Rental clock officially begins!
   - State machine moves from `PICKUP_PENDING` $\rightarrow$ `IN_USE`.
3. **Show Active Return Countdown Clock**:
   - Circular countdown timer displays active time remaining (`03:59:45`).
   - Tap **"Request Extension"** to demonstrate schedule conflict checks:
     - If future neighbor booked next slot $\rightarrow$ blocks extension with clear alert.
     - If slot is free $\rightarrow$ calculates pro-rata additional rate and supplementary escrow hold.

---

## ⏱️ Minute 2:15 – 3:00: Return Inspection, Time-Based Billing, Dispute & Settlement

1. **Early Return Simulation**:
   - Meena returns drill after 2 hours 20 minutes.
   - Suresh uploads 2 return condition photos.
   - Time engine calculates:
     - 15-minute grace period applied.
     - Billed units: `3 hours` (instead of 4).
     - Final charge: `₹120`.
     - Early return refund: `₹40` returned to renter.
2. **Path A — Happy Path Settlement & Reviews**:
   - Suresh taps **"Good Condition"** $\rightarrow$ **"Execute Escrow Settlement"**.
   - Escrow executes:
     - `₹120` released to Suresh's balance.
     - `₹540` (`₹500` deposit + `₹40` early refund) refunded to Meena.
   - Both users receive reciprocal rating prompts.
   - Meena awards 5 stars + review: *"High power drill, made wall mounts effortless!"*.
   - Item average rating dynamically recalculates.
3. **Path B — Dispute & Presidential Ruling** *(Demonstrate using pre-seeded Booking 5)*:
   - Open Booking 5 (Party vessel set with dent claim).
   - Log in as **President Ramesh Naidu** (`ramesh.naidu` / `Demo@1234`).
   - Tap **"President Disputes Queue"** (`/rentals/admin/disputes`).
   - Inspect pickup photos vs. return damage photos and renter contestation.
   - Tap **"Issue Binding Ruling"**:
     - Allocate ₹100 to owner for repair, refund ₹200 deposit remainder to renter.
     - Input ruling reason $\rightarrow$ Confirm.
   - Escrow executes split instantly, dispute resolves, and case closes with audit trail!

---

## 💡 Key Architectural Takeaways to Emphasize
- **Zero Paid APIs:** Pure rule-based price verifier fallback, internal escrow ledger, and mock payment/notification adapters.
- **Strict Integer Money:** 100% paise arithmetic (`4000` paise = ₹40.00), zero floating point precision drift.
- **Fair Neighbor Experience:** Two-sided photo proof prevents condition disputes, while time-based billing with grace periods rewards early returns.
