# Classes, locations and enrollment placement

Open Admin > Classes to add or edit a class or location. Each class has a day,
Pacific start time, duration, instructor, age group, level and curriculum.
Save and publish makes it available immediately on the schedule, landing pages,
trial form and enrollment form. Draft classes keep their IDs and existing rosters.
The existing nine schedules are preserved on migration; no new times are inferred.

Select a class and academic year to see its roster, assign an existing active
student, or move a student to another published class. A move replaces only that
class/year assignment; other classes and previous years remain. Student version
checks prevent lost updates, and student_changes keeps the prior record. Use
Students to create students manually or edit their full history.

In Students > Enrollment requests, choose an existing student or Create a new
student, then choose the final class before approval. Approval atomically saves
contact details, class placement, request status and student link. It adds a class;
use the Classes roster's Move action when transferring an existing assignment.
The public enrollment form never exposes a student directory or lets visitors
link themselves to an arbitrary student's private record.

In Trial Class Requests, Send enrollment form emails the saved contact using the
existing Twilio Email credentials and the studio's /enroll link. It records provider
acceptance (not confirmed inbox delivery). Repeated clicks cannot send twice.
Rejected sends may retry; uncertain sends or interrupted sends require checking
provider delivery logs before manually resetting that one request's status.
No ongoing marketing consent is inferred from sending an enrollment invitation.

## Rollout and recovery

Repository: atulsaini5/nrityangan1. Branch: codex/classes-and-enrollment.
Vercel: nrityangan / prj_3fIw1l9D0ri0Et9nVERRdvQi0dpd, team
atuls-projects-8fd4a92b / team_3gr2e2a7gh0xX2fi6FPUc2ca.
Supabase: supadb / tnvyqbxtlplkkozjahmy.

1. Apply 20261003181315_class_schedule_management.sql, validated with PGlite.
2. Deploy students and admin-portal (custom admin-key authentication, JWT check off).
3. Deploy the reviewed frontend commit to the verified Vercel production project.
4. Check public catalogue fields, unauthenticated write rejection and website routes.

The migration adds a private RLS-protected location table and versioned class
fields, three management RPCs, an enrollment-placement RPC, and invitation status.
It wraps submission validation, keeping prior notification and consent logic.
It updates only recognized existing schedule metadata; student assignments are
not inferred. Existing table alterations need brief schema locks; there is no
student-table rewrite or identity deletion. All new management RPCs are
security-invoker functions with service-role-only grants. Public responses expose
only class and location details, never students or contact details.

No environment variables change. Existing TUMAM_ADMIN_KEY, TWILIO_ACCOUNT_SID,
TWILIO_AUTH_TOKEN, ALLOWED_ORIGINS, SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
remain server-only; the frontend uses existing VITE_SUPABASE_URL configuration.

For frontend rollback, promote prior production deployment
dpl_Hmp6sSUuA7WU8ixWAssZ5oNeqahw (f68d59373f49c3fdac5185e2eb72ebd4ea454831).
Restore the two function directories from that commit if needed. Leave additive
schema and data in place. The previous UI's schedule is static, so reconcile it
with admin schedule edits before a prolonged rollback. Restore a mistaken student
move through the current versioned API using student_changes as evidence. Do not
drop tables or erase student/consent history to roll back.

Validation completed: TypeScript and both Vite builds; 43 automated tests (the
42-test full suite plus an additional catalogue/authentication test); local Chrome
workflow checks for location creation, class publication, assignment, transfer,
mobile layout without horizontal overflow, public schedule and enrollment choices.
Live backend smoke checks: catalogue 200 with nine classes/three locations, and
unauthenticated management/email requests rejected with 401. No real emails were
sent during testing.

The Supabase advisor baseline has an existing gallery_events RLS finding and
leaked-password-protection warning outside this change. Private tables intentionally
have no client policies or grants; the new class_locations table follows that model.
See https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public
and https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
for those existing findings. This rollout does not change unrelated platform security.
