

# GEMINI.md - Platform Bug Fixes & Feature Updates

## 1. Admin Portal Updates

### Admin Dashboard
* **Data Integration:** Replace all hardcoded demo data with real-time database queries for the following metric cards:
    * **Total Paid Out** (currently showing mock data like -$4.3M)
    * **Avg Season ROI** (currently showing mock data like +23.4%)
    * **Seasons Run** (currently showing mock data like 7)
    * **Payout Rate** (currently showing mock data like 99.8%)
* **Profit Growth Chart:** Ensure the chart dynamically renders using real historical data from the database.

### Admin User Management
* **Email Display Bug Fix:** When an admin clicks to view a specific user's details, the email field currently generates a fake email combining the username (`username@email.com`). Fix this to fetch and display the user's actual registered email address (e.g., `hasan.dev.404@gmail.com`) from the database.

### Admin Season Management
* **Data Integration:** The **Total Pool (All Seasons)** and **Avg Final ROI** cards must fetch and display real aggregated data from the database.
* **Season Closure Logic (Critical):** When an admin closes a season and inputs the "Final ROI", the system must automatically execute a payout action. It must calculate the profit or loss based on that Final ROI and return the invested principal plus the calculated profit/loss back to the available balance of every user who invested in that specific season.

### Admin Web Settings Page
* **Demo Status:** Keep all setting toggles and features as non-functional demos, *except* for the Maintenance Mode.
* **Maintenance Mode Routing Logic:**
    * When enabled by the admin, unauthenticated users can only access the public landing/home page, the Sign-in page, and the Sign-up page.
    * Once a user signs in, they must be forcibly routed to a "Maintenance" page. If they try to navigate to any other internal page (dashboard, profile, etc.), the system must block the request and redirect them back to the Maintenance page.

*(Note: All other admin pages require no changes at this time.)*

---

## 2. User Portal Updates

### User Season Page
* **Closed Season UI Updates:** In the "All Seasons & History" section, if a season has been closed by the admin with a final ROI:
    * Update the visual status to **"Closed"**.
    * Automatically remove the **"Invest Now"** button.
    * Display the actual final percentage in the **"ROI"** section.
    * Display the user's calculated monetary return in the **"My Profit / Loss"** section.
* **Dynamic Countdown Logic:**
    * **Phase 1 (Entry Open):** The season card should display **"Entry window closes in"** and count down to the *entry deadline*.
    * **Phase 2 (Running / Entry Closed):** Once the entry time expires, immediately remove the **"Invest Now"** button from the action section. Change the countdown text from "Entry window closes in" to **"Season Finished in"** and start a new countdown to the season's actual end date.

### Public Home Page
* **No Changes:** Leave the main public home page exactly as it is for now. Do not apply any updates here.