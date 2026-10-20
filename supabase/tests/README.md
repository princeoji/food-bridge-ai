# Database verification

Use a fresh disposable database. These files are never a production migration
runner and should not be used to seed production.

The project test harness uses PGlite to execute real PostgreSQL statements:

1. Run `bootstrap.sql` **only in the isolated PGlite database**. It supplies the
   Supabase-owned `auth.users`, `auth.uid()` and API roles needed by migrations.
2. Apply migrations in filename order. Immediately after the core workflow
   migration, run `core_workflows.sql` to verify the original contract.
3. Apply the Volunteer migration, then run `volunteer_deliveries.sql` to verify
   its new role and handoff contract. The automated harness does this staging.
   A failed assertion throws; successful suites roll their fixtures back.

The bootstrap reproduces only the auth/database objects needed by this suite.
It does not emulate GoTrue, signed JWT verification, confirmation emails,
PostgREST response serialization, Realtime, or hosted Supabase configuration.
In a local Supabase test database, skip the bootstrap because those objects
already exist.

`core_workflows.sql` covers API-role privileges, donor/claimant ownership,
immutable client roles, profile validation, malformed listings, expiry,
capacity, the original ownership-changing UPDATE exploit, release/reclaim,
the original NGO/donor completion contract, idempotency, aggregate statistics, contact
privacy, contact access only for collection partners, private donation history,
and normalized-email submission limits. The database owner is used
only for fixtures and inbox inspection; client operations run as `anon` or
`authenticated` with distinct `auth.uid()` values.

Real concurrent row-lock behavior needs two PostgreSQL connections. Follow the
separately labeled blocks in `claim_concurrency.sql` against a disposable local
Supabase/PostgreSQL database. It verifies a blocking second claimant, one
committed winner, unchanged ownership and quantity, and documents the first
claimant rollback variant. PGlite's serialized connection cannot prove that
behavior; the ordinary suite does verify that a second claim cannot overwrite
an already committed claimant.

## RPC contract and deployment

The additive migration introduces these browser-callable operations:

- `claim_donation(p_donation_id uuid) -> donations`: authenticated NGO; locks the
  row, requires an available listing with future best-before time, and requires
  capacity at least the listing's meal quantity. Capacity is an individual
  listing limit; zero cannot claim. It is not an aggregate daily quota.
- `release_donation(p_donation_id uuid) -> donations`: current NGO claimant;
  returns a claimed listing to available and clears the claimant. Expired
  claims can be released, but their original expiry still prevents reclaims.
- `complete_donation(p_donation_id uuid) -> donations`: the claiming NGO or the
  owning Hotel confirms collection. Only claimed food can transition to
  delivered. Authorized repeated confirmations return the delivered row.
  Confirmation can be recorded after pickup, including after best-before;
  expiry is enforced when a new claim is made.
- `submit_contact_message(p_name text, p_email text, p_message text) -> boolean`:
  public submission returns true after persistence; no inbox fields are
  returned. Name: 2–120 characters; trimmed message: 10–5,000 characters;
  normalized valid email: at most 254 characters. Per normalized email, allow
  one message per minute and at most three in an hour, serialized with a
  transaction advisory lock. This limits repeated addresses, not IPs or users
  rotating addresses. The inbox is service-role-only; no email is sent.
- `impact_stats() -> json`: unchanged keys `meals`, `hotels`, `ngos`,
  `donations`. Only delivered quantities contribute to meals.

Direct authenticated donation UPDATE is revoked. Hotels may insert available
food with a future best-before and delete their own available listings.
Donations require food names of 2–120 characters, pickup addresses of 5–500,
quantities of 1–1,000,000, and notes of at most 2,000. Profiles may be inserted
for an authenticated user's missing own record, and owners may update only
organisation name, phone and capacity. Organisation type is immutable to
clients after creation.

Existing history is preserved. Constraints are `NOT VALID`, so invalid legacy
rows are not rewritten or deleted and require an administrator to repair
before an affected row can be updated. Anonymous base-table access remains
revoked. Signed-in users can browse unexpired available donations and their
own donations/claims; other organisations' claimed/delivered history is private.
Profiles and phones are visible only to their owner and actual
claimed/delivered collection counterparties. Available cards use a generic
donor name until a claim exists. Releasing a claim removes that contact access
unless another claimed/delivered donation still links the organisations.

Apply the checked-in migration to the configured Supabase project before
using the new dashboard and contact form. Local tests do not apply migrations
to the live project and do not establish that hosted permissions or auth email
settings are deployed correctly.
