# Guest artists and invitations

Admin has separate **Students** and **Guest Artists** sections. Students contains
only student identities and opens with Active selected. Every dashboard count uses
active students, even when browsing archived/inactive records. Guest Artists includes
guest performers and instructors, with distinct profile fields: name, contact person,
email, phone, short bio, optional photo, role and active/inactive status.

The migration creates `guest_artists` profiles for existing guest/instructor rows.
It preserves their UUIDs and the backing performer identities in the legacy
`students` table so recital links and history stay intact. These backing rows are
excluded from student API lists, detail access and edits. No person, certification
or recital participant is deleted. New guest profiles also get a backing identity.
Profile name edits update linked public agenda names. Contact details, photos and
bios are private; this feature does not publish artist biographies on the website.

Save a profile, then **Create invitation link** and copy it to the guest. This
does not automatically send an email. Each invitation uses a random 256-bit token;
only its hash is stored. Links expire in 30 days and permit one successful profile
submission. A new invitation revokes earlier unused links; **Revoke unused links**
disables them immediately. Link holders can edit only that guest's details, not
their role/status or any other person. Concurrent edits require a reload. Previous
profiles and the invitation use timestamp are retained for recovery.

`/guest-invitation#TOKEN` places the token in a fragment. The page has no-referrer
and noindex headers, and the HTML skips third-party analytics on private token
pages. Sharing the link grants access to that guest profile; share it privately.
The guest form requires contact email, phone, bio and an authorization confirmation.
It does not opt the guest into recurring email/SMS messages.

Photos are converted to WebP in the browser (maximum 1200px and 1 MB stored), then
validated and uploaded through the authorized edge function to private bucket
`guest-artist-photos`. No direct public uploads are allowed. A restrictive storage
policy protects the new bucket even if older permissive policies exist elsewhere.
Only short-lived signed URLs display photos. Old photo objects remain private for
profile-history recovery; failed new uploads are removed after a rejected save.

Deploy migration `20260925035007_add_guest_artist_profiles.sql` to verified supadb
`tnvyqbxtlplkkozjahmy`, then guest-artists and updated students functions, then the
frontend. No new secrets are required. The schema adds three private tables and a
private bucket, seeds existing guest/instructor identities, narrows student APIs,
and leaves recital projection intact. Existing permissions are unchanged except
the new bucket restriction and student save/list behavior.

Recovery: restore the preceding frontend (Vercel deployment
`7yZ332MGEtdKidMdJXX7F5ndXh5v`, commit `0bd65a6`) and students function if needed;
retain guest profiles, photos and history. The old UI can still work with student
records while the new section is unavailable. Revoke invitations to stop outside
edits; do not delete historical identities or photo evidence. No destructive
rollback is required.
