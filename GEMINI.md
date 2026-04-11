

#  Full-Stack Integration & Database PRD

## 1. Project Overview
This document outlines the requirements to transform a static frontend design into a fully functional, data-driven web application. All mock and demo data must be replaced with real-time data fetched from the backend. The design must remain exactly as is, with all changes occurring under the hood.

**Tech Stack Requirements:**
* **Backend & Database:** Supabase (PostgreSQL, Auth, Edge Functions).
* **Deployment:** Vercel.
* **Core Rule:** Absolute zero use of hardcoded, mock, or demo data for metrics, user details, and system statuses.

---

## 2. Security & Access Control (RBAC)
* **Role Segregation:** Strict separation between `User` and `Admin` roles.
* **Admin Route Protection:** Users attempting to access any `/admin/*` routes (Dashboard, Season Management, User Management, etc.) must be strictly blocked and redirected to a **404 Error** page.
* **Mutation Security:** Any creation, modification, or deletion of system data (seasons, user balances, approvals) must be validated on the backend to ensure the requester has Admin privileges.

---

## 3. Public Pages Requirements

### Home Page
* **Header Navbar:** Dynamic season notification. E.g., if Season 6 is open in the database, display: `"Season 6 Now Open — Limited Slots"`.
* **Platform Performance:** Update the `"Last Season ROI"` dynamically based on the most recently completed season. (e.g., if Season 4 completed at 23%, display **23%**, not the default 28.4%).
* **Season Section:** Display a total of 4 seasons dynamically:
    * Card 1 & 2: The last two completed seasons.
    * Card 3: The currently running season.
    * Card 4: The upcoming season (Entry Open).

---

## 4. User Portal Requirements

### User Dashboard
* **Greeting:** Display `"Good morning, [User First Name]"`.
* **Top Right Badge:** Display the currently running season (e.g., `"Season 4 Live"`). If the user hasn't joined any season, display `"Not Joined"`.
* **Portfolio Status:**
    * Show real Total Portfolio balance.
    * Show active season progress (e.g., `"Day 42 of 90 days"`) based on database timestamps.
    * Display Season Progress (%), Entry Amount ($), Target %, All-time profit ($ and %), and Avg ROI (%).
* **Stat Cards:** Invested, Withdrawable, Total Profits, Avg ROI must fetch real aggregated data.
* **Performance Graph:** Must render using actual historical user data.
* **History Seasons:** List the user's past season investments.
* **Referral Section:** Display the user's unique referral code. Show real counts for Referrals, Earned, and set the default Commission Rate display to **7%** (or dynamically based on milestones).
* **Season Banner:** Display dynamic countdown based on DB (e.g., `"6 days remain to join Season 6. Pool at 51% capacity."`). The "Invest Now" button routes to the Season page.

### User Season Page
* **Stat Cards:** Active Seasons, Total Invested, Avg Season ROI, Total Profit (real user data).
* **Currently Running Section:** Top right badge must accurately reflect the number of live seasons (e.g., `"3 seasons live"`).
* **Investment Logic:** Users can only invest in seasons where `entry_status` is open. Closed seasons must disable the invest function.
* **History Section:** Populate "All Seasons & History" from the database.

### User Deposit Page
* **Deposit Addresses:** Fetch dynamic wallet addresses and generate QR codes based on the selected network.
* **Submission:** Submitting a deposit sends a "Pending" request to the Admin. It does *not* credit the account until Admin approval.

### User Withdraw Page
* **Available Balance:** Strictly fetch the `Withdrawable` balance from the DB.
* **Submission:** Submitting a request updates the DB with a "Pending" withdrawal request.

### Referral Page
* **Referral Details:** Auto-generate a unique referral link and code upon signup.
* **Sign-up Auto-fill:** Clicking the referral link routes to the signup page and automatically inputs the referral code.
* **Social Sharing:** Fully functional WhatsApp, Telegram, Twitter, and Email share buttons.
* **Milestone Logic (Automated):**
    * Base rate (e.g., 5% or 7% as per DB config).
    * At **50 Referrals**: Commission rate automatically increases by **+1%**. Next target set to 100.
    * At **100 Referrals**: Commission rate automatically increases by an additional **+3%**.
    * Commission Rate card must reflect these dynamic updates.
* **Stats & History:** Show Monthly Earnings, Total Invested by Refs, Lifetime Earning, and a detailed list of referred users.

### User Support Page
* **Contact Links:** Email and Telegram buttons must open respective external apps/links.
* **Cleanup:** Remove all mock ticket history UI.

### User Profile Page
* **Header & Avatar:** Greet with First Name. Avatar displays the initial of the First Name and Last Name.
* **Account Details:** Display Full Name, Username, Join Date (Month/Year), Balance, All-time ROI, Active Season status, and Total Referred.
* **Edit Profile:** Users can update their Full Name, Username, Phone Number, and Country. Updates sync to the DB. (Email requires special auth handling).
* **Security:** Password change triggers a Supabase Auth reset email.
* **Summaries:** Wallet Summary (Invested, Current, Withdrawable, Profits, Ref Commission) and Referral summary must show real metrics.

---

## 5. Admin Portal Requirements

### Admin Dashboard
* **Aggregated Metrics:** Total Users, USDT Invested, Platform Balance, Active Seasons, Pending Withdrawals, Platform Growth, Season Distribution, Total Paid Out, Avg Season ROI, Payout Rate, Seasons Run, Recent Users, Withdraw Requests.

### Admin User Management
* **Metrics:** Total Users, Active, Suspended, Total Balance Pool.
* **Directory:** Functional search bar and user list.
* **Edit User:** Admins can view and edit user details. Edits made here must reflect globally across the user's frontend and the database immediately.

### Admin Season Management
* **Metrics:** Active Seasons, Total Seasons Run, Total Pool (All Seasons), Avg Final ROI.
* **CRUD Operations:** Create, update, and manage seasons in real-time.
* **History:** List all previous seasons accurately.

### Admin Withdrawal Management
* **Metrics & Charts:** Pending, Approved, Rejected, Processed Today. 7-Day Withdrawal Volume graph.
* **Actionable List:** Admins can Approve or Reject requests.
* **Rejection Logic:** Rejecting a withdrawal *requires* the Admin to input a reason.

### Admin Deposit Management
* **Metrics & Charts:** Pending, Confirmed, Received Today, Monthly (Confirmed). Deposit Volume graph.
* **Actionable List:** Admins can Approve or Reject.
* **Approval Logic:** Approving automatically adds the funds to the specific user's `Available Balance`.
* **Rejection Logic:** Rejecting *requires* a reason, which the user will be able to see on their personal deposit details page.

### Admin Transaction History
* **Global Ledger:** View Total Transactions, Deposits, Withdrawals, Total Amount Processed, Daily Flow (Last 30 days).

### Admin Web Settings (Maintenance Mode)
* **Static UI:** Keep existing UI elements as non-functional demos, *except* for Maintenance Mode.
* **Maintenance Logic:**
    * Admin enables Maintenance Mode and sets a specific time duration.
    * If active, any standard user attempting to access the site is forcibly routed to a "Maintenance" page displaying the remaining time duration.
    * Once the duration expires, the site automatically unlocks for standard users. Admins can bypass the maintenance lock.