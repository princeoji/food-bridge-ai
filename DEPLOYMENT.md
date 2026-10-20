# FoodBridge live setup

The core implementation is ready for a configured Supabase environment. The
checked-in SQL has been tested in isolated PostgreSQL. On 2026-10-20,
`20261020120000_secure_core_workflows.sql` was applied to the existing
`aoenquaztbjnripcxzho` backend through Lovable's SQL editor and recorded in
`supabase_migrations.schema_migrations`. Hotel listing, NGO claim, duplicate
claim rejection, partner contact visibility, and release passed hosted API
checks using the test accounts. Existing user listings were preserved.

## 1. Install and verify locally

Use Node.js 24 and Bun. The committed Bun lockfile is the reproducible install:

```sh
bun install --frozen-lockfile
bun run test
bun run typecheck
bun run build
bun run dev -- --host 127.0.0.1 --port 5173
```

`npm install`, `npm test`, `npm run typecheck`, and `npm run build` are also
supported. Avoid creating a second lockfile when using npm locally.

The client needs these environment variables:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID=YOUR_PROJECT_ID
```

Use the project's publishable key in client configuration. Never place a
Supabase secret or service-role key in a `VITE_` variable.

## 2. Apply the database migration

Volunteer migration `20261020161849_volunteer_delivery_workflow.sql` was also
applied and recorded on 2026-10-20. Claims require an NGO delivery address;
the Hotel verifies the code and marks pickup, and only the assigned Volunteer
finishes delivery. Legacy active claims need delivery addresses before they
appear in the Volunteer queue. Do not rerun either applied migration.

For this existing project, this step is complete. Do not rerun the migration.
The connected Supabase account does not administer this Lovable-managed
backend. Use the linked Lovable project: More -> Database -> Manage -> SQL
editor. The standalone Supabase CLI steps below apply to environments whose
database administration is available through your own Supabase account.

Review `supabase/migrations/20261020120000_secure_core_workflows.sql` with the
project administrator and apply it before deploying the updated UI. The
dashboard now uses claim/release/completion RPCs; the contact form uses its
submission RPC. The previous database does not provide those operations.

For a project already managed through the Supabase CLI, authenticate and link
the intended project, inspect pending migrations, then push them:

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_ID
supabase migration list
supabase db push
```

If older migrations were originally applied outside the CLI, reconcile the
migration history before pushing. Do not rerun the initial CREATE TABLE
migrations over existing tables. Alternatively, an administrator can apply the
new migration in the Supabase SQL editor and record its migration history.

The [official Supabase migration guide](https://supabase.com/docs/guides/deployment/database-migrations)
describes linking, pushing, and reconciling migration history.

The migration preserves existing rows. New constraints are `NOT VALID`:
historical invalid rows are retained, while future writes are checked. Existing
listings with missing/expired best-before times cannot be claimed. The donor
can remove an available listing and relist it with valid details. Legacy rows
that violate other constraints need administrative repair before updates.

The contact inbox is `public.contact_messages`, accessible only through trusted
project administration/service-role access. Public submissions return success
only after the message is stored. No email notification service is configured;
the team must review this inbox. Limits apply per email address, not per IP.

## 3. Configure authentication

In Supabase Authentication URL configuration:

- Set the Site URL to the final website origin.
- Allow `https://YOUR_SITE/auth` for account confirmation.
- Allow `https://YOUR_SITE/update-password` for password recovery.
- For local development, allow the same two paths at
  `http://127.0.0.1:5173` (and at `http://localhost:5173` if using that origin).
- Configure confirmation email and recovery delivery for the real environment.

Registration supports Hotel/Restaurant, NGO, and Volunteer accounts. An NGO's serving
capacity limits each individual donation it can claim; it is not an aggregate
daily quota. Organisation type is immutable after account creation. Profile
contact details and capacity can be edited by the account owner.

## 4. Verify the hosted workflows

Use separate test Hotel and NGO accounts in a test environment:

1. Register and confirm email, sign in, sign out, and reset the password.
2. Edit the organisation profile and check a missing profile can be completed.
3. List valid food with a future best-before deadline.
4. Confirm available listings can be searched and expired food cannot be claimed.
5. Claim as an eligible NGO; verify another account cannot steal the claim.
6. Check contact details become visible to the donation partners after a claim.
7. Release before assignment and reclaim with a fresh code. Accept as a Volunteer;
   verify Hotel pickup with the correct code, then finish as that Volunteer.
8. Check only completed deliveries increase the public meal count.
9. Submit a contact enquiry and verify it appears in the private inbox.
10. Check desktop/mobile navigation, labels, keyboard focus, errors, and retries.

`npm test` covers real PostgreSQL authorization and workflow assertions in an
isolated PGlite database. It does not emulate hosted email, PostgREST, JWT
verification, or real multi-connection contention. See `supabase/tests/README.md`
for the separate concurrency recipe.

## Remaining scope

The user will provide the AI requirements later. This version does not claim
AI matching, geographic distance filtering, or automatic
pickup notifications. Volunteer accounts and delivery handoffs are implemented. Preserve the
FoodBridge red, cream, and white theme when adding those features.
