# Student registry

Open `/admin`, enter the existing shared admin code, and select **Students**.
Search by display name or an alternate spelling. Add or edit names, current level,
status, record type, private notes, class assignments, and certification history.
Class assignments and certificates have an academic year; retain past years when
adding new ones. Inactivate records instead of deleting historical participants.

The initial import contains 75 people (including guest artists and the instructor),
38 certifications for 2025–26, nine website class sessions, and all 152 participant
links across 21 performance items. Current levels reflect the supplied certificate
list, not an assumed promotion. No class assignments were inferred.

Certificate names take priority over parent and agenda spellings. Confirmed identities retain prior spellings as aliases. Three records remain
flagged for identity review in the private admin interface. Aliases are for searching, not automatic identity merges. UUIDs
allow different people to have the same name.

## Data and access

`students` is the permanent identity. `student_certifications` and
`student_enrollments` preserve yearly records. `class_sessions` is seeded from
`CLASSES` and `LOCATIONS` in `constants.ts`. The recital hierarchy is `recitals` →
`recital_sections` → `recital_performances` → `recital_participants` → `students`.
Existing class IDs are retained. Future schedule changes should add new sessions
when necessary to avoid rewriting historical enrollment information.

All nine tables have RLS enabled and no anon/authenticated grants. The `students`
edge function authenticates private actions with `TUMAM_ADMIN_KEY` before using
the service client. Its GET endpoint exposes only published agenda titles,
timings, performance numbers, roles and display names. Student IDs, certification
history, aliases, classes and notes never appear in that projection. Public pages
load the current projection and display a labeled saved schedule without performer names if it is unavailable.
Name changes therefore appear on linked agendas after reloading the page.

Saves use an atomic SQL function and optimistic version checking. Prior records
(including enrollment and certification values) are retained in `student_changes`.
The editor preserves unfinished changes when switching admin sections and warns
before replacing an unsaved student or leaving the page.

## Initial import and future years

The certificate source and generated import SQL are private, ignored files under
`output/`. Never commit them or place them under `public/` or `content/`.
`scripts/prepare-student-import.mjs` builds the initial 2026 import from a private
JSON object with `certificates` (name/title pairs), `parents` (individual names),
`aliases` (explicit old-to-canonical mappings), `review` (name-to-note mappings), and optional `record_kinds` (name-to-type mappings).
It also writes the reconciled agenda to an ignored local file. Run it only when preparing this initial
import, not as a recurring synchronization tool. The import inserts missing rows
and preserves existing student identities and edits; rerunning it can restore a
removed initial certification, so it is not an undo tool.

For future recitals, reuse student UUIDs; create a new recital year with ordered
sections and performances, then add participant references with their role and
position. Validate the projection using `readAgenda` before setting `published`.
Add the year's recital metadata, saved agenda JSON and QR assets using the existing
annual-recital workflow. Managing recital schedules/rosters remains a controlled
import workflow; this release exposes student, class-assignment and certificate
editing in the admin interface.

## Deployment and recovery

1. Apply `20260925021422_create_student_management.sql` to the verified supadb
   project `tnvyqbxtlplkkozjahmy`. It creates new tables/functions only, with no
   rewrite or lock on existing application tables.
2. Run the locally validated private import and verify counts and name mappings.
3. Deploy the `students` edge function with custom admin authentication and
   `verify_jwt = false`. Existing secret names are reused; no values change.
4. Deploy the frontend. Verify public projection, rejected unauthenticated writes,
   and the admin interface.

For application rollback, promote the previous Vercel production deployment
`4Aruo84Xw4bBUKNntQoNKd9SXAA1` (commit `a62f4f5`). Leave registry tables intact so
student edits are retained. Do not drop tables to roll back the UI. To undo an
individual edit, inspect the private `student_changes.previous_record`, restore
the intended fields through the save function using the *current* version, and
verify the affected agenda. Back up the registry before any later merge or bulk
reconciliation; this release performs no destructive identity merges.

Validation: TypeScript, both Vite builds, all repository tests, local PGlite
import twice with count/agenda comparison, and a browser edit/save against local
PGlite. Automated tests cover private table/RPC denial, projection privacy, atomic
rollback, concurrent-save rejection, duplicate names, and request validation.
