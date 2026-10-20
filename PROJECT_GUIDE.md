# FoodBridge project guide

Updated 2026-10-20. Original repository review: commit f9d3098.
Implementation branch: codex/complete-foodhope.

## User intent and scope

Complete the existing Hotel/NGO food rescue platform while preserving its theme.
The project and public brand are **FoodBridge**, as explicitly corrected by the
user. Use this spelling throughout the UI, metadata, and future work. The user will provide AI
requirements later; do not invent or claim an AI feature in the meantime.

The user authorised core implementation after the initial review. The source
now contains the changes below. The core workflow migration was applied to the
existing Lovable-managed database on 2026-10-20 through Lovable's SQL editor.
Hosted Hotel listing, NGO claim, partner visibility, and release were verified
with test accounts. Website deployment remains outstanding; read DEPLOYMENT.md.

## Product and implemented flows

FoodBridge connects hotels/restaurants donating surplus meals to NGOs serving
communities in need. The intended journey is Donate -> Pickup -> Distribute.

- Hotel accounts list safe surplus food with quantity, address, notes, and a
  required future best-before time. They browse/search/filter their listings
  and can remove unclaimed food.
- NGOs claim unexpired food within capacity and supply a delivery address.
  Each claim generates a globally unique six-digit pickup code. Hotels can
  search by code. NGOs can release or edit addresses before assignment.
- Volunteer accounts have a login section, signup role, and dedicated dashboard
  for available, active, and delivered orders. One Volunteer accepts each order.
  The Hotel verifies the code to mark pickup; the assigned Volunteer alone
  confirms delivery. Codes and contact phones are private until assignment.
- Dashboard results are paginated and refresh every 10 seconds and on focus.
  Successful changes also refresh other dashboard tabs on the same origin
  immediately through BroadcastChannel; no account data is sent in the message.
  Pending actions, query errors, retries, and empty states are explicit.
- Dashboard overview shows real role-specific totals, quick actions, recent
  listings/claims, and completion progress. Filters cover deadlines, quantity
  sorting, NGO capacity, and claim status; layouts support grid/list views.
  Hotels can reuse a listing as a template with the old deadline cleared.
  CSV exports contain only the current page and neutralize spreadsheet formulas.
- The user prefers compact cards, fonts, and spacing to reduce scrolling.
  Dashboard section buttons switch between Overview, New donation, Listings,
  and Claims instead of stacking those workspaces on one long page.
- Signup handles real immediate sessions or email confirmation. Sign-in supports
  confirmation resend. Password recovery and password updates are implemented.
- Organisation profiles can be completed if missing and edited by their owner.
  Type is fixed after registration. Capacity is per donation, not a daily quota.
- Account switches/sign-out invalidate private context and remove private cache.
- Contact messages are stored through a validated public RPC; success appears
  only after persistence. The inbox is private to trusted administration.
- Impact meals count completed donations, rather than claims.
- Public pages remain home, about, how it works, impact, get involved, contact.

Geographic distance filtering, AI matching, automated pickup notifications, and contact email alerts
are not implemented or advertised as working features.

## Preserve this theme

Warm, approachable food rescue design: white surfaces, cream heroes, vivid red
emphasis, dark text, pale gray secondary copy, softly rounded cards, subtle
shadows, and red outline icons. The source of truth is src/styles.css.

| Purpose          | Current token/value          |
| ---------------- | ---------------------------- |
| Background/cards | oklch(1 0 0)                 |
| Main text        | oklch(0.129 0.042 264.695)   |
| Primary red      | oklch(0.577 0.235 27.5)      |
| Cream background | oklch(0.985 0.015 70)        |
| Pale pink accent | oklch(0.95 0.03 20)          |
| Muted text       | oklch(0.554 0.046 257.417)   |
| Borders/inputs   | oklch(0.929 0.013 255.508)   |
| Base radius      | 0.5rem                       |
| Font             | Arial, Helvetica, sans-serif |

Use semantic Tailwind classes and register new OKLCH tokens in the existing
theme. Shared custom controls use .btn, .btn-red, .field, and .card-box. Compact
desktop controls have a 36px minimum height, with 44px minimum controls and
16px input text on touch devices. Body text is 14px, with visible focus and
disabled states.

Preserve the sticky white header, heart/FoodBridge wordmark, cream page heroes,
5% horizontal padding (7% at lg), dark footer, and red CTA band. The header has
a compact accessible Sheet menu on smaller screens. Use the shared
FoodBridgeBrand and Lucide icons. Home retains its split hero, four impact cards,
and three process steps.

The original src/assets/hero.png is a complete 1536x1024 homepage screenshot.
It is preserved as a **design reference**, not used as a hero photograph. The
current hero uses the standalone FoodSharingIllustration SVG component.
The headline is now "Feed Hope, Not Waste". Reference-image statistics are
illustrative; use actual database aggregates in the application.

## Architecture

React 19, TypeScript, TanStack Start/Router, Vite 8, Tailwind 4, Radix/shadcn,
Lucide, React Query, Supabase auth/PostgreSQL/RLS.

- src/components/SiteLayout.tsx: shared header/footer, PageHero, account state.
- src/routes/__root.tsx: root document, query provider, outlet/error boundaries.
- src/routes/_authenticated/route.tsx: protected account boundary.
- src/routes/_authenticated/dashboard.tsx: donation operations.
- src/components/dashboard/DashboardOverview.tsx: scoped totals, quick actions,
  recent listings/claims, and completion progress.
- src/lib/dashboard.ts: collection deadline labels and safe CSV export.
- src/routes/_authenticated/profile.tsx: profile completion/editing.
- src/routes/auth.tsx: authentication callback.
- src/routes/forgot-password.tsx and update-password.tsx: account recovery.
- src/lib/donations.ts: typed donation input validation and claim availability.
- src/lib/auth-forms.ts: account validation, safe errors, callback parsing.
- src/integrations/supabase/: browser/server clients, types, auth helpers.
- supabase/migrations/: schema history and additive core hardening.
- tests/: Node test runners and boundary tests.
- supabase/tests/: PostgreSQL assertions, isolated bootstrap, concurrency recipe.

Follow src/routes/README.md. Route generation owns src/routeTree.gen.ts; never
edit it manually. Do not add Next.js/Remix app structures or duplicate the
plugins already supplied by the Lovable Vite config.

## Database contract

The additive 20261020120000_secure_core_workflows.sql migration replaces the
initial broad donation UPDATE access. Historical migration files are unchanged.

Browser RPCs: claim_donation, release_donation, complete_donation, and
submit_contact_message; typed in the Supabase database types. Donation RPCs take
p_donation_id and return one donation object. The contact RPC takes p_name,
p_email, p_message and returns true after storage.

Claim/release/completion lock the donation row and validate identity/state.
Claim requires NGO role, sufficient per-listing capacity, and future expiry.
Direct client donation UPDATE is revoked; new inserts/removal are constrained
to the owning Hotel and safe available state.

Volunteer migration `20261020161849_volunteer_delivery_workflow.sql` was also
applied through Lovable's SQL editor and recorded in migration history.
Claims now require `p_delivery_address`. `available_deliveries` provides safe
previews, `accept_delivery` assigns one Volunteer, and `confirm_pickup` checks
the donor, code, assignment, and expiry before setting `picked_up`.
`complete_donation` now permits only that Volunteer after Hotel-confirmed pickup.
`set_delivery_address` permits the NGO to update the destination before assignment.
Completion is idempotent. Anonymous RPC execution and direct updates are blocked.

Codes use a private noncycling 100000–999999 sequence and are never reused.
Exhaustion fails atomically. Codes identify orders; account authorization still
controls every handoff. Legacy active claims receive codes and need delivery
addresses before they appear for Volunteers. Delivered history is preserved.

Organisation phone access is restricted to self and actual donation partners.
Available browsing shows generic donor names until a claim grants partner
access. Donors and claimants retain their own donation history. Contact inbox
reads are not granted to anonymous/authenticated clients.

New validation constraints are NOT VALID to preserve legacy rows. Invalid
historical data is not rewritten; administrators may need to repair affected
records. Old undated/expired available food should be removed and relisted.

## Development, verification, and live setup

Use Node 24 for TypeScript stripping in Node tests. Bun's committed lockfile is
the reproducible dependency source; PGlite is a dev-only test dependency.
Scripts include dev, test, typecheck, build, preview, lint, and format. CI runs
frozen installation, tests, typecheck, and build.

Tests execute real PostgreSQL migrations/RLS/function assertions in an isolated
in-memory PGlite database plus auth/donation validation fixtures. They do not
emulate hosted JWT verification, email delivery, PostgREST, or multi-connection
contention. A separate concurrency recipe is documented for a disposable
PostgreSQL/Supabase environment.

Client configuration uses VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY,
and VITE_SUPABASE_PROJECT_ID. Keep administrative secrets server-side and out
of documentation/logs. Do not edit generated Supabase client files directly.

DEPLOYMENT.md records migration application, auth redirect URLs, team inbox
access, and hosted smoke tests. Source/build checks do not prove live workflows.
Browser preview access was denied by the browser security gate, so no visual
interaction verification was completed in this session.

The branch is connected to Lovable. Preserve published git history and keep
the connected branch functional; pushes sync into its editor.
