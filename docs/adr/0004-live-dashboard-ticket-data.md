# Live operational dashboard

The admin dashboard reads ticket metrics, ticket approval counts, crew assignment counts, and recent ticket details from the saved application data. Ticket changes refresh the dashboard through Supabase Realtime and local browser test events; a 30-second refresh is retained for recovery when a live channel is unavailable. The recent ticket list shows the ticket number, address, current status, assigned contractor, and due date.

In local Super Admin testing, ticket and review counts read from this browser's test store and do not mix in remote sample numbers. CEO accounts can approve tickets through the same admin transition policy as Super Admin and Admin accounts.

Verification: the dashboard rendered browser-local ticket, crew, and approval values without the former sample numbers. TypeScript validation passed. Jeanie Campbell's company Auth account was not present during inspection; no placeholder UUID or profile without an Auth user was created. Creating an authenticated CEO account requires the authorized invitation and role update to be completed after confirmation.
