

You are an expert full-stack developer. I need you to implement backend and database integration for the User Support System. Do not change any existing UI design, layout, or styling — only replace hardcoded data with real dynamic data from the database and add full backend functionality.
1. User Support Page (/support)

    When the user clicks on the Live Chat card, it should scroll or navigate to the Get Help section on the same page.
    Change the "Live Chat Not Available" tag to "Available" (similar to the Email Support card style) when live chat is enabled.
    In the Get Help section, the user can create a support ticket with the following fields:
        Select Category
        Enter Subject
        Select Priority
        Write Message
        Click Submit Ticket button
    After successfully submitting the ticket, the Live Chat section should automatically open for that ticket.
    All submitted ticket data must be stored in the database.
    Integrate full backend API for ticket creation.
    In the My Requests section:
        Show all support tickets submitted by the logged-in user (fetch from database, remove all hardcoded data).
        When user clicks on a ticket, open the ticket details view.
        Display:
            Ticket Subject (instead of "Unable to withdraw funds — transaction stuck")
            Ticket ID (e.g., TKT-8821)
            Status: Open, Resolved, or Closed
            Priority (Low, Medium, High, etc.)
        If the ticket status is Closed by admin/moderator, user should not be able to send new messages.
        In Ticket Details: Show real Ticket ID, Priority, Category, Submitted Date, etc. from database.
        In Your Messages section: Show all user and moderator messages with real data.
        In Live Chat section: Real-time chat between user and moderator/admin.
            Show sender name (e.g., "Marcus Reid" should be the actual moderator/admin name)
            Show accurate timestamp (use server/IP time)
            All chat messages must be stored in the database.

2. Support Management Page (/moderator/support)

    Dashboard Cards: Total Tickets, Pending, Open, Resolved, Closed — must show real counts from the database.
    Support Tickets table: Display all tickets with real data from database (remove hardcoded rows).
    When moderator/admin clicks View button on any ticket:
        Open a dialog/modal with full ticket details.
        Show:
            Ticket Subject
            Ticket ID
            Status (Open, Resolved, Closed)
            Priority
        User Details section: Show Full Name, Username, Email, Phone of the ticket creator.
        Ticket Information section: Ticket ID, Category, Priority, Submitted Date, Status, User ID (all from database).
        User Messages section: Show all messages sent by the user.
        Live Chat section: Moderator and user can chat in real-time. Show moderator name and accurate timestamps.
        Actions section: Moderator can:
            Mark as Resolved
            Close Ticket
            Re-open Ticket
        Activity Log section: Show all actions/logs related to this ticket (status changes, messages, assignments, etc.) with real data and timestamps.

Requirements:

    Do not change the design, CSS, or layout at all. Only replace hardcoded content with dynamic data.
    Build complete backend APIs (use Laravel / Node.js / PHP / Python — mention which you are using).
    All data (tickets, messages, logs, status changes) must be properly stored in the database.
    Provide proper database schema (SQL) for new tables or modifications needed.
    My current full database schema is in the final.sql file. Add the necessary new tables and columns on top of it.
    Implement proper relationships between users, tickets, ticket_messages, ticket_logs, etc.
    Ensure data validation, authentication (only logged-in users & authorized moderators/admins), and security.

Please provide:

    Complete backend code structure and API endpoints
    Updated SQL schema / migration code for all new tables and modifications
    Frontend integration code (only the dynamic parts — no design changes)
    Real-time chat implementation approach (WebSocket / Laravel Echo / Socket.io etc.)

Start by first providing the SQL code for the required database tables and then the backend logic.



