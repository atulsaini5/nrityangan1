# Enrollment notifications

New enrollment submissions queue a separate internal email for each enabled row
in `enrollment_notification_recipients`. Configure that table privately; addresses
are never accepted from the form. No historical enrollment is backfilled.

The enrollment function sends through the existing Twilio Email API using
`TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`, from `support@teamevents.ai`.
Emails contain the student name, academic year, submission reference/time and an
admin review link. Contact details and preference tokens are not emailed.
Family email/SMS choices do not control these internal staff notifications.
This feature does not start class reminder messages to families.

Intake and notification queue entries are committed in one transaction. Submission
replays do not enqueue duplicates. Each recipient is claimed atomically and tracked
independently. `accepted` means Twilio returned HTTP 202, not proof of inbox delivery.
Email failure never turns a saved enrollment into a failed form submission.

Pending work is dispatched on each successful submission. Explicit 4xx rejections
retry after five minutes on a later submission, at most three attempts. An admin
can also POST `{"action":"retry_notifications"}` to the enrollment function with
the existing `x-admin-key`. This only drains eligible pending/failed work; it cannot
choose recipients or resend accepted messages. No periodic retry job is installed.
Review `enrollment_notifications` for failed/unknown/stuck sending rows and check
Twilio before manually resetting ambiguous delivery: timeouts or 5xx responses may
have occurred after acceptance. Avoid duplicate emails by not blindly retrying them.

Deploy migration `20260925032621_add_enrollment_notifications.sql`, configure the
approved recipients, then deploy the enrollment function with its existing public
submission access. Both new tables and RPCs are private to service-role operations.
No frontend deployment or credential changes are required.

Recovery: restore the preceding enrollment function version to pause dispatch while
keeping intake, consent, and notification history intact. Disable recipient rows to
stop queuing future alerts. Retain the additive schema; no student or roster data
is changed by this release.
