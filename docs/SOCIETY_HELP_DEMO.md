# OneSociety — Module 5: Society Help Walkthrough & Demo Script

> **Module 5: Gate Security with QR Passes, Transparent Maintenance Money, Community Events & Emergency SOS**  
> **Target Audience:** Society Residents, Security Guards, President, Service Providers, and External Visitors.

---

## 3-Minute Demo Script

### 1. Gate Security & QR Passes (Guard & Resident)
1. **Resident Family QR Pass**:
   - Login as **Ramesh Naidu** (`ramesh.naidu` / `Demo@1234`).
   - Navigate to **Society Help** -> **My Passes & Visitor QR**.
   - View Flat A-101 Family QR Pass (`PASS-0001-FAM`).
   - Notice the live counters: *3 entered, 1 exited, 2 currently inside society*.
2. **Guard Scan & Pop-Up Counter**:
   - Login as **Ramu Guard** (`guard.gate1` / `Guard@1234`).
   - Go to **Scan Pass / Verify**. Enter or select pass `PASS-0001-FAM`.
   - Tap **Verify**. The pop-up modal opens instantly showing:
     * Pass Owner: *Ramesh Naidu Family (Flat A-101)*
     * People entered so far: 3, exited: 1, currently inside: 2.
     * Suggested direction is **EXIT** (because members are currently inside).
     * Adjust counter: `+` and `-` buttons. Select **EXIT (1 person)**.
     * Confirm scan. Headcount updates atomically and summary is displayed.
3. **Exit Invariant Validation**:
   - Try to record an exit of 5 people on a pass with only 2 people inside.
   - Guard is blocked with error: *"Exit count cannot exceed people currently inside"*.

---

### 2. Visitor Passes & "Nobody At Home" Enforcement
1. **Resident Generates Visitor Pass**:
   - As resident **Suresh Kumar** (Flat A-102), tap **Create Visitor Pass**.
   - Enter Visitor: *Vikas Khanna*, People: *2*, Purpose: *Dinner*.
   - Tap **Generate Pass & Share Link**.
   - Copy or send the shareable URL: `https://onesociety.local/visitor-pass/PASS-XXXX`.
2. **External Visitor Opens Pass (No Login Required)**:
   - Open the shareable URL in any browser.
   - Shows authorized digital pass with QR code, validity countdown, host flat details.
3. **"Nobody At Home" Gate Block**:
   - Resident sets flat presence toggle to **"Nobody is at home"** (e.g. Flat C-101).
   - Guard searches Flat Presence for `C-101`:
     * Returns strictly **NOT PRESENT** with timestamp.
     * **Zero resident names, phone numbers, or family details** are shown.
   - A visitor arrives at the gate for C-101 -> Guard attempts manual entry in Visitor Notepad.
   - **System displays RED BLOCK**: Entry is denied because nobody is at home.
   - A Swiggy delivery agent arrives for C-101 -> Guard toggles **"Accept Parcel at Gate"**:
     * Package safely accepted at security desk.
     * Delivery agent is not permitted to enter society premises.

---

### 3. Transparent Maintenance Money (What comes in, what goes out, what is left)
1. **Resident Maintenance Dues & In-App Payment**:
   - Resident views monthly maintenance fee (₹2,500/flat).
   - Taps **Pay Maintenance** -> instant digital payment.
   - System generates official receipt **`REC-202611-A102`** with download/share receipt button.
2. **Society Financial Accounts**:
   - Open **Maintenance Accounts & Ledger**.
   - View **Society Fund Balance** card: Total balance, income vs expenditure.
   - **Monthly Chart**: Visual income vs expense bars over past 6 months.
   - **4 Efficiency Indicators**:
     * *Proof Share Percent*: % of expenses backed by verified photo receipts.
     * *Collection Rate Percent*: % of monthly dues collected on time.
     * *Burn Runway*: Months of operational balance remaining.
     * *Complaint-Linked Share*: % of funds spent directly fixing resident issues.
3. **Mandatory Proof Rule & Resident Questions**:
   - Every ledger item displays its verified bill/work photo.
   - Resident taps **Questions** on Sept Lift Inverter Drive Repair (₹12,000) and asks:
     *"Why was the repair ₹12,000 when the initial estimate was ₹9,500?"*
   - President **Ramesh Naidu** replies directly in the app:
     *"Bearing bushings were replaced to prevent complete motor burnout. 6-month warranty included."*
   - Question and reply remain permanently attached to the expense record.
4. **Security Guard Salary**:
   - Guard views **My Salary Records** in their portal:
     * Full disbursement slips (₹26,000/month) paid from maintenance funds with bank reference.

---

### 4. Community Events & Quiet Hours
1. **Announce Gathering**:
   - Resident of Flat D-101 announces **Aarav's 5th Birthday Party**.
   - Expected visitors: *25*, Expected vehicles: *6*.
   - Generates single event guest pass **`PASS-GUEST-01`**.
2. **Quiet Hours Warning**:
   - Resident of B-302 announces engagement party with music past 22:00 (10 PM).
   - System displays **Quiet Hours Alert**:
     *"Music prohibited past 10:00 PM. President and guards notified to ensure volume limits."*
3. **Over-Estimate Headcount Alert**:
   - When incoming guests exceed 115% of estimate (e.g. 26 guests arrive for 20 estimate), system sends headcount alert to guard and host.
4. **Event Presence Rule**:
   - Active event running at a flat automatically sets flat presence as "Someone is at home".

---

### 5. Emergency SOS
1. **Resident Triggers SOS**:
   - Resident taps floating **EMERGENCY SOS** button.
   - 2-step confirmation with 30-second cancellation countdown window.
2. **Loud Siren to Guards & President**:
   - All security guards and society president receive instant loud emergency alert.
3. **Guard Acknowledges**:
   - Guard taps **Acknowledge Alert**:
     *"Guard Bahadur Singh has acknowledged and is heading to Flat A-102."*
   - Resident interface updates in real-time to *"Guard is on the way"*.
