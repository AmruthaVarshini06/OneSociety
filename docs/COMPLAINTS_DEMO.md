# OneSociety Smart Complaint Handling: 3-Minute Demo Walkthrough

This demo walks through a multi-resident Lift complaint from reporting and AI priority calculation, through vendor assignment, progress updates, resolution with cost and payment, to resident reopen.

---

## Demo Accounts
| Role | Username | Password | Flat |
|---|---|---|---|
| President | `ramesh.naidu` | `Demo@1234` | A-101 |
| Resident 1 | `rajan.pillai` | `Demo@1234` | B-101 |
| Resident 2 | `meena.iyer` | `Demo@1234` | B-201 |
| Resident 3 | `arun.nair` | `Demo@1234` | B-301 |

---

## 3-Minute Script (Step-by-Step)

### Step 1: Resident 1 Reports Lift Issue (0:00 - 0:40)
1. Log in as **Resident 1** (`rajan.pillai` / `Demo@1234`).
2. On the Resident Home screen, tap **Smart Complaints**.
3. Notice the top banner:
   > 🚨 *EMERGENCY: For fires, gas leaks, or people trapped in lifts, immediately call emergency security or use Emergency Gate Alert!*
4. Tap the **Report Issue** FAB (+).
5. **Demonstrate AI Scope Check:**
   - In Description, type: *"My kitchen tap is leaking water."*
   - Specific Location: *"Kitchen sink"*.
   - Tap **Submit Complaint**.
   - Notice the AI popup:
     > 🏠 **Flat-Internal Issue Detected:** *This looks like a problem inside your flat. Common society funds cannot be used for internal repairs.*
     > Button: **Open ServiceHub** (points resident to verified neighbours/plumbers).
   - Tap **Dismiss**.
6. **Now Report the Society Common Area Issue:**
   - Category: Select **Lift**.
   - Block: Select **Block B**.
   - Specific Location: *"Lift 2 Passenger Elevator"*.
   - Description: *"Lift 2 stopped moving between 1st and 2nd floor. Error code E-04."*
   - Tap **Submit Complaint**.
   - Expectation: Alert confirms Complaint `#CMP-0001` created under Issue `#ISSUE-0001` (Priority: HIGH).

---

### Step 2: Resident 2 & Resident 3 Report the Same Lift (0:40 - 1:10)
1. Log in as **Resident 2** (`meena.iyer` / `Demo@1234`).
2. Tap **Smart Complaints** -> **Report Issue** (+).
3. Select Category: **Lift**, Block: **B**, Location: *"Lift 2"*.
4. Description: *"Lift 2 not arriving on floor 2."*
5. Notice the **AI Similar Issue Suggestion** appears immediately:
   > 🔍 *Similar Open Issue Found! #ISSUE-0001 Lift 2 in Block B not working (1 report).*
   > Tap: **+ Link my report to this issue**.
6. Tap **Submit Complaint**.
7. Result: The post is saved independently with its own photo and description, and the issue report count increases to 2!
8. Repeat or view: As reports increase (up to 5 reports from Block B), the AI logarithmic priority score increases from 55 to 65+, jumping it to the top of the president's queue!

---

### Step 3: President Reviews Queue & Contacts Vendor (1:10 - 1:50)
1. Log in as **President** (`ramesh.naidu` / `Demo@1234`).
2. On President Dashboard, tap **Smart Complaints Control**.
3. View the **President Control Center**:
   - 4 Metric cards: Total Issues, SLA Breached, Spent This Month, Avg Resolve Time.
   - Tap the **Priority Queue** tab: Notice *"#ISSUE-0001 Lift 2 in Block B not working"* ranks at the top with 5 resident reports.
   - View the AI reason: *"Lift out of service, reported by 5 residents, waiting 1 day."*
4. Tap the issue card to open **Manage Issue**:
   - Notice the optimistic concurrency guard: `Version: v1`.
   - In Step 3 (Contact Vendor): Notice **Metro Lift Services** is suggested with rating ⭐ 4.5 and phone `98490 11223`.
   - Scheduled Visit Date: Set tomorrow's date.
   - Tap **Mark Contacted (Move Out of Needs Action)**.
   - Expectation: Status updates to `CONTACTED`. The issue leaves the president's "Needs Action" list so the president can work on the next issue without clutter!

---

### Step 4: Work In Progress & Solving the Issue (1:50 - 2:20)
1. In the same issue screen, switch to the **2. WIP** tab:
   - Note: *"Technician arrived on site with spare leveling sensors."*
   - Tap **Update to WORK IN PROGRESS**.
   - Status becomes `IN_PROGRESS`. Residents receive real-time notifications.
2. Switch to the **3. Solved** tab:
   - Completion Note: *"Leveling sensors replaced and guide rails lubricated. Tested 10 round trips, zero jerk."*
   - Notice 1 after photo is attached.
   - Tap **Mark Issue Solved**.
   - Status becomes `SOLVED`. The 7-day review window begins.

---

### Step 5: Transparent Cost & Payment Recording (2:20 - 2:40)
1. Switch to the **4. Cost** tab:
   - Vendor Service Charges: `Rs. 1,200` (120,000 paise).
   - New Goods / Spare Parts: `Rs. 650` (65,000 paise).
   - Payment Mode: `UPI`.
   - Transaction Reference: `UPI-LIFT-984321`.
   - Tap **Record Cost & Mark Paid**.
   - Expectation: Total cost `Rs. 1,850` recorded openly with breakdown.

---

### Step 6: Resident Inspects & Reopens Issue (2:40 - 3:00)
1. Log in as **Resident 3** (`arun.nair` / `Demo@1234`).
2. Go to **Smart Complaints** -> Open `#ISSUE-0001`.
3. Notice:
   - Full timeline shows Reported -> Vendor Contacted -> Work in Progress -> Solved.
   - Cost Breakdown card shows `Rs. 1,850` paid to Metro Lift Services via UPI for full transparency.
   - Buttons: **Confirm Fixed** and **Reopen Issue**.
4. Tap **Reopen Issue**:
   - Reason: *"Lift stopped again this evening on floor 3. Door not opening."*
   - Evidence photo attached.
   - Tap **Reopen**.
5. Result:
   - Status becomes `REOPENED`.
   - Reopen count becomes 1, which increases the AI priority score by +5 points.
   - The issue jumps right back to the top of the president's Priority Queue for warranty callback!
