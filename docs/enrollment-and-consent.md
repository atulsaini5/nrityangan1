# Enrollment and communication records

Public form: `/enroll`. Admin: `/admin` → **Students**. Share the form from the
admin toolbar or the website footer. The student dashboard counts all students,
active students, guest artists and unique student performers for the selected
recital year (latest year by default). Guests and instructors are excluded from
student counts. Filters combine type, status, class, academic year and recital.
These are student counts, not counts of children; ages are not collected.

The public form collects a student's name, adult contact's name and relationship,
email, optional phone, requested class, academic year and notes. A parent/legal
guardian or adult student must attest that they are authorized to submit. Email
and SMS choices are separate, optional and unchecked. Phone is required only for
SMS opt-in. Declining both does not block enrollment. Enrollment inquiries may
still receive a direct response about the request.

Submissions enter **Enrollment requests**; they do not automatically modify the
student directory. Approve by explicitly choosing an existing student or creating
a new one. Existing names, certifications and other years' class assignments are
preserved. Approval replaces contact details and adds the chosen class/year.
Review the contact details with the family first: this release records
self-reported consent, without verifying email or phone ownership. It does not
send messages or register a Twilio SMS sender/campaign.

## Consent evidence and withdrawal

The `communication_consent_events` table stores each channel's choice, destination,
server timestamp, disclosure text/version, source and evidence. Evidence includes
the submitter name, relationship, adult-attestation wording, source URL, user
agent and hashed network identifier. `enrollment_requests` retains the original
intake and its review association. Existing students have no recorded consent;
contact edits alone never grant permission. Consent for an old number or address
must not be applied to a new contact value.

Consent events are append-only: application-role update/delete/truncate privileges
are revoked and a trigger rejects update/delete. Admin can record a withdrawal
from a linked student's history. The public success page provides a 256-bit
private preferences link that can withdraw either channel without affecting
enrollment. Only its hash is stored in the database. The token is in the URL
fragment so it is not sent in the page request or referrer. Withdrawals are
idempotent and preserve the original opt-in. Save the link; contact the studio
if it is lost. New opt-ins cannot be created through a withdrawal link.

Before any future sending implementation, check the latest applicable permission
for the actual destination across related enrollment records and enforce all
withdrawals and provider suppression lists. Do not send based only on the presence
of a historical opt-in. A fresh enrollment does not by itself verify the recipient
or override an existing provider block. Implement email unsubscribe links and
Twilio STOP/HELP handling, verify the sender/campaign, and review the privacy and
communication terms before activating recurring sends. No automated emails or SMS
messages are sent by this release.

Public notices: `/enrollment-privacy`, `/communication-terms`. The versioned wording
is in `lib/enrollmentModel.ts`; increment the version when changing the disclosure.
The server requires the current version and writes the server's exact text, not
client-provided disclosure text. These controls support consent recordkeeping;
they are not a legal determination of compliance.

Primary references reviewed September 25, 2026:

- [Twilio Messaging Policy](https://www.twilio.com/en-us/legal/messaging-policy)
- [Twilio A2P consent flow requirements](https://www.twilio.com/docs/api/errors/30924)
- [Privacy and terms URLs for A2P registration](https://www.twilio.com/en-us/changelog/a2p-10dlc-campaign-registration-will-require-privacy-policy-and-)

## Security and deployment

All new tables use RLS with no anon/authenticated grants. The public edge function
allows only bounded submissions and token-authorized withdrawals. It does not
list student/contact records. Admin endpoints use the existing shared admin key.
Intake has honeypot checks, request-size limits, strict validation, idempotency,
and transactional per-email/per-network hourly limits. No new secrets are needed.

Apply `20260925025212_add_student_enrollment_consent.sql` to the verified supadb
project `tnvyqbxtlplkkozjahmy`, then deploy the updated `students` function and new
`enrollment` function, then the frontend. The migration adds contact fields and
new tables; it retains old core functions so older student editors still work.
It changes no existing consent, class assignment, certification or recital data.

Recovery: promote Vercel deployment `2swd6r2j316eqk3NLVUpaoPi69mH` (commit
`8872510`) to restore the prior frontend. Keep the additive schema and consent
history. Keep the enrollment withdrawal endpoint available for links already
issued. If intake must be paused, disable new submissions separately from
withdrawals. Never roll back by deleting consent evidence.

Tests cover no-consent enrollment, separate opt-ins, atomic failure, request
idempotency, rate limits, existing-student review/version conflicts, private
access denial, immutable history, withdrawal and contact-edit isolation.
