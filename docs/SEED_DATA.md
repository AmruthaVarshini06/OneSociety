# OneSociety seed data (all fake: made-up names, fake phone numbers like 90000 00001, fake GST numbers, placeholder documents)

## Rules for the seed script
- Idempotent: "npm run seed" adds missing data without duplicating, and "npm run seed:reset" wipes the dev database and reseeds. Never run reset on anything except the dev database.
- Use the real services and state machines (escrow ledger, QR token service, notifications, audit log) to create data, not raw inserts, so balances, statuses, and logs stay consistent.
- All dates are relative to the moment the seed runs (for example "deadline in 3 days", "delivered 6 hours ago"), so the demo is always fresh.
- Use realistic Indian names (mix of Telugu, Hindi, and other names). No real people, real phone numbers, or real documents.
- Photos: generate about 15 small placeholder images (under 30 KB each, with a text label such as "Drill") and upload each ONCE. Reuse the same URLs across records to save free storage.
- Print a demo login list into docs/DEMO_LOGINS.md (username, password, role, flat). These are demo passwords only.
- A user can have more than one role (for example a resident who is also an internal provider, or the president who also uses resident screens).
- Every module section must keep references valid (no orphan IDs) and ledger balances must match payments.

## Section 1: Foundation
- Society: "Green Valley Apartments", 4 blocks (A, B, C, D), 3 floors each, 2 flats per floor = 24 flats: A-101, A-102, A-201, A-202, A-301, A-302, then the same pattern for B, C, D.
- One login per flat (24 flat accounts). The A-101 account has the president role plus resident abilities.
- 2 guards (Gate 1 day shift, Gate 2 night shift), 2 delivery partners.
- Language preference: 16 English, 5 Telugu, 3 Hindi.
- "Someone at home" status: nobody at home in A-102, A-302, B-201, C-101, C-302, D-202 (last updated at different times). All other flats: at home.
- Key characters (use these exact roles in the other sections):
  | Name | Flat | Role in the demo |
  | Ramesh Naidu | A-101 | president |
  | Suresh Kumar | A-102 | owns the drill |
  | Meena Iyer | B-201 | owns the ladder |
  | Ananya Rao | A-202 | resident tutor (maths and science, classes 6-10) |
  | Karthik Reddy | D-201 | resident coding tutor (Python, Java) |
  | Priya Sharma | B-202 | resident yoga instructor, owns the projector |
  | Divya Menon | C-102 | resident singing and guitar teacher, owns the speaker |
  Fill the other flats with generated names.

## Section 2: Group Buying
Suppliers (8):
| Supplier | Verification | Sells |
| Sri Lakshmi Wholesale Traders | GST verified | groceries |
| Fresh Farm Dairy and Produce | verified by president (no GST) | dairy, eggs, vegetables, fruits |
| City LPG Distributors | GST verified | LPG |
| HealthPlus Pharmacy | GST verified | non-prescription health essentials only (no prescription medicines) |
| CleanHome Supplies | verified by president | cleaning, personal care, water cans |
| CoolCare Home Services | GST verified | home services |
| Annapurna Traders | GST verified | groceries (competing offers) |
| Quick Mart Traders | pending verification | (appears in the president's verification queue) |
Fake GST numbers must have the right 15-character format and a valid checksum.

Products (29, MRP in rupees; discount is at Qmin and at Qmax; the app's tier algorithm creates the middle tiers):
| Category | Product (unit) | MRP | Qmin-Qmax | Discount |
| Groceries | Rice, Sona Masoori (25 kg bag) | 1,550 | 15-80 | 6%-16% |
| Groceries | Wheat flour / atta (10 kg) | 480 | 15-80 | 5%-14% |
| Groceries | Toor dal (1 kg) | 165 | 20-100 | 6%-15% |
| Groceries | Sugar (5 kg) | 260 | 20-100 | 5%-12% |
| Groceries | Sunflower cooking oil (5 L) | 820 | 15-80 | 6%-15% |
| Groceries | Tea powder (1 kg) | 520 | 10-50 | 5%-12% |
| Dairy and produce | Milk, 1 L x 30 days (monthly pack) | 1,800 | 10-40 | 4%-10% |
| Dairy and produce | Curd, 500 g x 30 days (monthly pack) | 1,050 | 10-40 | 4%-10% |
| Dairy and produce | Eggs (tray of 30) | 210 | 20-80 | 6%-14% |
| Dairy and produce | Vegetables weekly basket (5 kg) | 300 | 20-80 | 8%-18% |
| Dairy and produce | Fruits weekly basket (3 kg) | 400 | 20-60 | 8%-18% |
| LPG | Domestic LPG cylinder refill (14.2 kg) | 900 | 10-40 | 2%-5% |
| Health essentials | Hand sanitizer (500 ml) | 220 | 10-50 | 8%-20% |
| Health essentials | ORS sachets (pack of 10) | 90 | 10-50 | 8%-20% |
| Health essentials | Adhesive bandage strips (pack of 100) | 150 | 10-50 | 8%-20% |
| Health essentials | Digital thermometer | 250 | 10-50 | 8%-20% |
| Cleaning | Liquid detergent (5 L) | 720 | 12-60 | 6%-16% |
| Cleaning | Floor cleaner (5 L) | 420 | 12-60 | 6%-16% |
| Cleaning | Dishwash liquid (5 L) | 380 | 12-60 | 6%-16% |
| Cleaning | Toilet cleaner (1 L, pack of 3) | 330 | 12-60 | 6%-16% |
| Cleaning | Garbage bags, large (pack of 120) | 260 | 12-60 | 6%-16% |
| Water | Drinking water can (20 L) | 90 | 20-100 | 5%-15% |
| Personal care | Bathing soap (pack of 12) | 520 | 10-50 | 6%-14% |
| Personal care | Shampoo (1 L) | 480 | 10-50 | 6%-14% |
| Personal care | Toothpaste (pack of 6) | 360 | 10-50 | 6%-14% |
| Services | AC service (split AC, per unit) | 700 | 10-40 | 10%-25% |
| Services | Deep home cleaning (2BHK, per flat) | 3,500 | 6-20 | 8%-20% |
| Services | Pest control (per flat) | 1,500 | 8-24 | 10%-22% |
| Services | RO water purifier service (per unit) | 600 | 8-30 | 10%-22% |
Delivery types: groceries, health essentials, cleaning, personal care and water = SOCIETY_GATE; dairy, LPG and services = DOOR_TO_DOOR.
Resident interests: about 40 interest records across at least 12 products (including tea, sugar, eggs, thermometer, shampoo), so the president's demand dashboard has numbers.
Competing offers: toor dal has two offers (Sri Lakshmi: lower price; Annapurna: slightly higher price but better past ratings) for the president's comparison screen.

Group orders (one in each state, each with committed quantities spread across flats):
1. LIVE: rice (Sri Lakshmi). 38 units committed by 14 flats, just 4 units short of the next price tier. Commit deadline in 3 days, gate delivery in 6 days.
2. LIVE: milk monthly pack (Fresh Farm). 18 units from 12 flats, deadline tomorrow.
3. CONFIRMED, PAYMENT PENDING: LPG (City LPG). 22 units from 22 flats, 14 flats have paid into escrow, 8 have not, payment window ends in 20 hours.
4. DELIVERED, inside the 24-hour issue window: CleanHome monthly pack (detergent, floor cleaner, dishwash, garbage bags) by gate drop. 16 flats, delivered 6 hours ago. Manifest sent to the guard. 9 flats collected (QR scanned), 7 still pending pickup. 2 issues raised (1 missing item, 1 quality), one of them already refunded. Rating given by 4 flats.
5. DEADLINE MISSED: health essentials (HealthPlus). 7 units against a Qmin of 10, waiting for the supplier to extend or cancel.
6. SETTLED: AC service (CoolCare), completed last month. Payout released, ratings given.
Pass data: QR passes per flat for orders 3 and 4.

## Section 3: Share and Rent
Items (22), with owner flat, hourly rate / daily rate / deposit (rupees); "-" means that rate is not offered:
| Type | Item | Owner | Rate | Deposit |
| Tools | Drill machine | A-102 | 40/h, 200/d | 500 |
| Tools | Aluminium ladder 6 ft | B-201 | 30/h, 150/d | 400 |
| Tools | Tool kit | C-101 | 25/h, 120/d | 300 |
| Tools | Extension board | D-102 | -, 20/d | 100 |
| Kitchen and party | Party vessel set (large pots) | A-202 | -, 300/d | 1,000 |
| Kitchen and party | Large pressure cooker (20 L) | B-101 | -, 80/d | 300 |
| Kitchen and party | Chafing dish set | C-202 | -, 250/d | 800 |
| Kitchen and party | Heavy-duty mixer grinder | D-201 | -, 60/d | 400 |
| Event furniture | Folding tables (set of 4) | B-302 | -, 200/d | 600 |
| Event furniture | Plastic chairs (set of 20) | C-301 | -, 150/d | 500 |
| Travel | Large suitcase | A-301 | -, 100/d | 500 |
| Travel | Cabin trolley bag | D-301 | -, 60/d | 300 |
| Electronics | Projector | B-202 | 60/h, 400/d | 2,000 |
| Electronics | Bluetooth party speaker | C-102 | 80/h, 500/d | 1,500 |
| Electronics | Camera tripod | A-201 | 20/h, 100/d | 500 |
| Outdoor | Tent (4-person) | D-202 | -, 250/d | 800 |
| Outdoor | Camping chairs (set of 4) | A-302 | -, 100/d | 400 |
| Baby and kids | Kids' cycle | B-102 | -, 60/d | 300 |
| Baby and kids | Baby stroller | C-201 | -, 120/d | 600 |
| Baby and kids | Baby high chair | D-302 | -, 50/d | 300 |
| Cleaning | Pressure washer | B-301 | 100/h, 500/d | 2,000 |
| Health and mobility | Wheelchair | C-302 | -, 100/d | 1,000 |
Make "Not available" on 2 items (speaker, wheelchair). Use "AI price verified" (FAIR) on all, plus one draft listing (a drill at 150/h with a 5,000 deposit) that the AI verdict marks TOO_HIGH and is not published.
Bookings (one in each state):
1. SETTLED: drill (A-102 to B-201), booked 4 hours, returned after 2h20m, billed 3 hours, unused charge refunded with the deposit. Pickup and return photos exist.
2. IN USE: projector (B-202 to D-101), due back in 3 hours.
3. REQUESTED: tent (D-202), waiting for the owner.
4. OVERDUE: ladder (B-201 to C-102), 30 minutes late, extra amount to be paid.
5. IN DISPUTE: party vessel set (A-202 to B-101), owner claims a dent and asks for 300 from the deposit, with photos on both sides.
6. CANCELLED: kids' cycle, cancelled by the renter more than 2 hours before the start.
One open "Request an Item": "Vacuum cleaner needed Saturday" from A-301, with 2 offers from neighbours. 8 reviews across items and owners.

## Section 4: ServiceHub
Providers (18). "Res" = internal (resident), "Ext" = external:
| Category | Option | Provider | Type | Status |
| Domestic help | Cleaning + utensils | Lakshmi Devi | Ext, PERMANENT account (converted 2 months ago) | verified |
| Domestic help | Cleaning + utensils + cooking | Sunita Bai | Ext, TEMPORARY account (access expires in 2 days) | verified |
| Domestic help | Cleaning + utensils | Parvathi | Ext | pending verification |
| Education | School tuition 1-10 | Ananya Rao | Res (A-202) | verified |
| Education | High secondary 11-12 | Mr. Rao | Ext | verified |
| Education | Coding (Python, Java) | Karthik Reddy | Res (D-201) | verified |
| Education | Language tutoring (English, French) | Ms. Dubois | Ext | verified |
| Music and dance | Singing and guitar | Divya Menon | Res (C-102) | verified |
| Music and dance | Classical dance | Radha Kumari | Ext | verified |
| Home repair | Electrician | Ravi Electricals | Ext | verified |
| Home repair | Plumber | Naresh Plumbing | Ext | verified |
| Home repair | Carpenter | Babu Carpentry | Ext | verified |
| Home repair | AC and appliance repair | CoolCare Technician | Ext | verified |
| Fitness | Yoga instructor | Priya Sharma | Res (B-202) | verified |
| Fitness | Zumba instructor | Neha Fitness | Ext | verified |
| Beauty | Beautician | Glow Studio (Anjali) | Ext | verified |
| Beauty | Mehendi artist | Fatima Mehendi | Ext | pending verification |
| Beauty | Hair stylist | Sana Hair Studio | Ext | rejected (note: "ID photo unclear, please re-upload") |
Placeholder ID and certificate images for each. Reviews: 10 across providers.
Requests and agreements:
1. PENDING: A-301 asks Ananya for maths tuition (class 8, 3 days a week).
2. UNDER DISCUSSION: B-101 and Ravi Electricals, with a few chat messages and a price offer of 600.
3. ACTIVE permanent: Lakshmi Devi working daily for A-201, 3,500 per month, payment window each month from the 1st to the 5th (this month already paid).
4. TEMPORARY: Ravi Electricals one day at C-202, 10 am to 4 pm, 1,200, payment window 12 pm to 1 pm that day (window opens in 2 hours so the payment notification can be shown).
5. COMPLETED: Karthik coding course for D-102, final review given.
6. DECLINED: Zumba request, declined with the reason "fully booked".

## Section 5: Smart Complaint Handling
Complaints (14 reports forming 11 issue clusters). Use these statuses:
| Issue | Reports | Status | Notes |
| Lift 2 in Block B not working | 5 (B-101, B-102, B-201, B-202, B-301) | NEW | should rank near the top of the priority queue |
| Exposed wiring on Block C staircase | 1 | NEW | safety override: CRITICAL |
| Water pump not running, Block D tank | 2 | NEW | |
| Garbage not collected for 2 days | 3 | NEW | |
| CCTV camera at Gate 1 offline | 1 | NEW | |
| Car parked in fire lane | 1 | NEW | |
| Street light out near Gate 2 | 2 | CONTACTED | local vendor assigned, visit tomorrow |
| Roof leakage in Block A top-floor corridor | 2 | IN PROGRESS | progress notes and photos |
| Generator fuel pipe leak | 1 | SOLVED 5 days ago | solved by Ravi Electricals (from ServiceHub), cost 1,850 (1,200 service + 650 parts) with a bill photo, paid by UPI |
| Drain blockage near Block A parking | 1 | REOPENED | solved earlier, reopened after rain, with a reason and a photo |
| Gym treadmill broken | 1 | CLOSED | solved 10 days ago |
Also one OUT_OF_SCOPE example ("my kitchen tap is leaking", a flat issue) shown with the ServiceHub suggestion.
Local vendors: Metro Lift Services (lift), Sai Civil Works (waterproofing and civil work).
Photos for every complaint, plus before and after photos for the solved one. Priority scores and reasons must be computed by the real scoring function.

## Section 6: Society Help
- Passes: a family pass for every flat, a president pass, 3 provider passes (Lakshmi Devi, Ravi Electricals, Ananya), 5 visitor passes (2 expired with people still inside, 1 revoked, 1 event guest pass).
- Gate log: about 40 entries and exits over the last 7 days, with people counts (for example 3 entered and 1 left on the same pass). Keep the "people inside now" total consistent with the log.
- Manual visitor log: 10 entries, including 3 delivery agents (one linked to the CleanHome group order) and 1 DENIED attempt at C-101 (nobody at home), with 4 visitors currently inside.
- Maintenance: 2,500 per flat per month (24 flats). Months June to November 2026. Opening balance 1,50,000 on 1 June. Collection: June 100%, July 96%, August 92%, September 92%, October 88%, November 70% so far, with 3 flats overdue for October. Other income: 5,000 hall rent and 2,000 donation.
- Expenses: about 20 entries across the 6 months, each with a receipt or work photo. Typical monthly amounts: security salaries 26,000 (two guards, 13,000 each), electricity about 9,000, water about 4,500, lift maintenance contract 5,000, cleaning staff 6,000, garden 2,000, repairs 3,000 to 8,000, one lift repair of 12,000 in September. The generator fuel pipe repair (1,850) and one plumbing job are linked to solved complaints. Totals must keep the fund balance positive.
- 1 expense query from a resident ("Why was the lift repair 12,000 in September?") with the president's reply.
- Events (5): a birthday party at D-101 (Saturday 6 to 9 pm, 25 visitors, no loud sound); a puja at A-202 (Sunday morning, 40 visitors); a housewarming at C-201 (2 days); an engagement party at B-302 (Saturday 7 pm to 11:30 pm, 60 guests, loud DJ, flagged because it runs into quiet hours, with a note from the president); a past event where 48 guests entered against an estimate of 40 (alert triggered).
- 2 past emergency alerts (acknowledged by the guard).

## Section 7: Festival Mode
Not defined yet. Add later.
