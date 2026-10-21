# FoodBridge workflow verification

Last checked: 2026-10-21. Live site: https://foodbridge-ai-connector.lovable.app/

## Result

All 27 hosted checks in `scripts/check-hosted-workflows.mjs` passed using real
Hotel, NGO, and Volunteer JWT sessions. No functional blocker was found in the
tested donation and delivery cycle.

## Passed workflows

- All three account logins, correct roles, invalid-password feedback, and
  protected dashboard redirects.
- Hotel posts food; NGO reads the same listing from the hosted database.
- NGO claim requires an address and enforces serving capacity. Expired listings
  cannot be posted. Claims create six-digit codes searchable by the Hotel.
- Duplicate claims fail. Release restores availability; reclaim creates a new
  code. NGO address editing works before Volunteer assignment.
- Volunteer previews hide codes/private contacts. Two concurrent acceptance
  requests produce exactly one success. Assigned Volunteer sees both contacts
  and the pickup code. NGO release/address changes are blocked after assignment.
- Wrong pickup code fails. Only the owning Hotel confirms pickup. Completion
  before pickup fails. Only the assigned Volunteer finishes delivery.
- All three roles see Delivered. Completion retry preserves its timestamp;
  impact increases exactly once.
- Anonymous claims, direct status tampering, Hotel claims/completion, and public
  contact-inbox reads are blocked.
- Contact submissions persist through both hosted API and browser; immediate
  repeat submission is rate limited.
- Browser profile save, Delivered filter, and CSV export passed. The downloaded
  CSV contains exactly the filtered QA row plus its header.
- Public Home, About, How it works, Impact, Get involved, Contact, and recovery
  pages loaded. Signup hides capacity for Volunteer, shows it for NGO, and
  rejects mismatched passwords. Expired recovery links show useful feedback.
- Earlier hosted checks at phone width 390 and tablet width 768 found no
  horizontal overflow.

## Local checks

- `npm test`: 13 tests passed, including five migrations and 92 SQL assertions.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- Targeted ESLint on the hosted verification script: passed.
- Earlier implementation's changed application files passed targeted ESLint
  with two existing Fast Refresh warnings.

## Limits and follow-up

- Real email delivery and a complete password reset need a working mailbox;
  they were not exercised using the `.test` demo addresses. Contact messages
  persist for administrative review; no outbound contact-email provider exists.
- The full delivery state cycle passed through real JWT API sessions. Browser
  checks cover login, dashboard, forms, filters, and export; a complete sequence
  clicking every handoff button across three browsers remains untested.
- One recoverable React hydration error (#418) appeared in Chrome. It did not
  reproduce on home/login in the separate in-app browser. Its cause remains
  unconfirmed; no blanket warning suppression was added.
- Concurrent acceptance used two live requests from the same dedicated
  Volunteer account. Distinct-Volunteer and concurrent NGO-claim races were not
  separately exercised against hosted PostgreSQL.
- Full-repository ESLint has inherited failures in untouched files: 5,216
  formatting errors and one generated-file `prefer-const` error.
- Existing NOT VALID database constraints preserve legacy records. Historical
  records need administrator review before validating these constraints.
- AI requirements remain deferred until the user provides the project brief.

## Repeating hosted checks

The script writes real QA data. Use only this project's dedicated demo accounts.
Supply `FOODBRIDGE_RUN_HOSTED_CHECKS=1` and `FOODBRIDGE_TEST_PASSWORD` in the
shell environment, then run:

```powershell
node --env-file=.env scripts/check-hosted-workflows.mjs
```

Available fixtures are removed through the donor account. Completed orders and
contact messages require narrowly scoped admin cleanup; identifiers are printed
in the report. Never commit passwords or privileged keys.

Latest successful run: `2b31d734-58e1-473d-9731-d6c71a85b66f`.
The user approved removal of its one completed donation and two contact messages.
Existing user donations were excluded from the cleanup predicates.
The cleanup completed and a follow-up query confirmed zero QA orders/messages
remaining and both original donations retained.

See `DEPLOYMENT.md` for hosting and publication instructions.
