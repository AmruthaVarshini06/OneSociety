# OneSociety — ServiceHub Skills Marketplace (3-Minute Live Demo Script)

> **Persona Setup:**
> - **Suresh Kumar** (`suresh.kumar` / `Demo@1234`) — Flat A-102, Seeker (Resident parent looking for Class 8 tutoring)
> - **Priya Sharma** (`priya_a202` / `Provider#123` or `priya.sharma` / `Demo@1234`) — Flat A-202, Internal Resident Tutor (Mathematics & Science)
> - **Lakshmi Devi** (`lakshmi_maid` / `Provider#123`) — External Domestic Help (Cook & House Maid)
> - **Ramesh Naidu** (`ramesh.naidu` / `Demo@1234`) — Flat A-101, Society President

---

## ⏱️ Minute 0:00 – 0:45: Seeker Browse, Verification Badges & Service Request

1. **Log in as Suresh Kumar** (`suresh.kumar` / `Demo@1234`) on resident view.
2. From the Home Screen, tap the **"ServiceHub"** card.
   - Point out the 6 configured society categories:
     1. *Domestic Help (External Only)*
     2. *Education & Tutoring*
     3. *Music & Dance*
     4. *Home Repair & Maintenance*
     5. *Fitness & Wellness*
     6. *Beauty & Personal Care*
3. Open **"Education & Tutoring"**:
   - Filter by **"Neighbours Only"**.
   - Notice **Priya Sharma**: shows `"🏡 Your neighbour, Flat A-202"`, `"Verified by President"` badge, and `4.9 ★` rating.
   - Note privacy guarantee: phone numbers remain masked before booking discussion.
4. Tap **"View Profile & Book"**:
   - Tap **"Request Service"**.
   - Select option: `"School Tuition (Classes 1-10)"`.
   - Work duration: `"Permanent (Monthly/Ongoing)"`.
   - Time slot: `17:00 - 18:30`, Weekdays: `Mon - Fri`.
   - Requirements: `"Class 8 CBSE Maths tutoring"`.
   - Proposed budget: `₹3,000`.
   - Tap **"Send Service Request"**. Show instant confirmation.

---

## ⏱️ Minute 0:45 – 1:30: Resident Provider Inbox, Chat & Price Offer Negotiation

1. **Log in / Switch to Priya Sharma** (`priya_a202` / `Provider#123`):
   - Notice the Provider Home opens directly to **"Provider Portal"** (internal residents get both Seeker & Provider workspace toggle).
2. Open **"Requests Inbox"**:
   - See incoming request from **Suresh Kumar (Flat A-102)** with Class 8 tutoring requirements.
   - Tap **"Accept & Chat"** (1-tap acceptance moves request to `UNDER_DISCUSSION`).
3. Tap **"Open Negotiation Chat"**:
   - Notice contact phone numbers are now **unlocked and visible** to both parties.
   - Provider types: *"Hello Suresh! I can take 5:00 PM - 6:30 PM slot."*
   - Tap **"Offer"** button:
     - Amount: `₹3,000`, Billing unit: `MONTHLY`.
     - Payment window: `1st to 5th of each month`.
     - Notice period: `7 days`.
     - Tap **"Send Offer Card"**.
4. **Switch to Suresh Kumar**:
   - Seeker sees the interactive Price Offer Card in chat.
   - Tap **"Accept Offer"**.
   - **System locks the Service Agreement**: System message announces agreement locked at `₹3,000/month`, payment window scheduled for 1st-5th, and schedule visits automatically generated.

---

## ⏱️ Minute 1:30 – 2:15: Daily Schedule, Mark Done & Payment Window Settlement

1. **Switch to Priya Sharma**:
   - Go to **"Today's Schedule"** (default provider home):
     - Shows: `Flat A-102 • 17:00 - 18:30 • School Tuition`.
   - Tap **"Mark Done"** after session completion.
2. **Switch to Suresh Kumar**:
   - Go to **"My Services"** $\rightarrow$ **"Payments"**:
     - See payment due: `₹3,000`, Payment window: `Nov 1st - Nov 5th`.
     - Tap **"Pay Now"**.
     - Choose payment method: `In-App` or `UPI/Cash`.
     - Tap **"Confirm Payment"**.
     - Status transitions to `CONFIRMED`.
3. If paid offline via UPI/Cash:
   - Priya Sharma receives confirmation prompt in her **"Earnings Tracker"** and taps **"Confirm Receipt"**.

---

## ⏱️ Minute 2:15 – 3:00: Ratings, Complaint Handling & President Admin Tools

1. **Seeker leaves Rating & Review**:
   - Suresh goes to **"Rate Service"**:
     - Rates 5★ for Overall, 5★ Punctuality, 5★ Quality, 5★ Behaviour.
     - Adds comment: *"Excellent teaching methods. Great improvement in Maths."*
     - Submits review $\rightarrow$ Priya's rating dynamically updates.
2. **Log in as Ramesh Naidu (Society President)** (`ramesh.naidu` / `Demo@1234`):
   - Tap **"ServiceHub Control"**:
     - **Verification Queue**: View pending applicant `Parvathi Amma (Domestic Help)`, review government ID, and tap **"Approve (Verify)"**.
     - **Create External Account**: Create temporary account for a new outsider electrician with auto-generated one-time credentials.
     - **One-Way Conversion Guard**: In All Providers, select `Sunita Bai` and tap **"Convert to Permanent"**. Show that the system prompts a strict confirmation dialog: *"Once converted, this account can NEVER become temporary again."*
     - **Audit & Overdue Reports**: Review society-wide active services and overdue payment escalation warnings.

---

## ✅ What Was Demonstrated

1. **Dual Role Access**: Resident neighbours switch between Seeker and Provider effortlessly; External outsiders have an isolated provider interface with zero access to resident modules.
2. **Domestic Help Rule**: Enforced external-only restriction for domestic help.
3. **Privacy by Design**: Phone numbers masked until discussion begins; documents visible only to President and provider.
4. **Negotiation Engine**: Chat with structured Price Offer cards, customizable Payment Windows, and locked Service Agreements.
5. **Irreversible Conversion**: President tools enforcing the one-way Temporary $\rightarrow$ Permanent account conversion rule.
6. **No Paid APIs**: Clean, high-performance local architecture with zero external paid API subscriptions.
