<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1E9KLD8mw_FwuXbcpdq-AWUzNeC5zfs3O

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


## Trial class requests (Supabase)

The **Book a Trial Class** form posts to the `trial-class-request` Supabase Edge Function. The function stores the request in `public.trial_class_requests` and sends email notifications through the direct Twilio Email API to `at@teamevents.ai` and `tumam_b@yahoo.com`.

1. Link the project and apply the database migration:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```
2. Configure server-only `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` using the project's existing verified sender, `support@teamevents.ai`. Restrict `ALLOWED_ORIGINS` to the deployed site (comma-separated when needed):
   ```bash
   supabase secrets set ALLOWED_ORIGINS="https://your-site.example"
   ```
3. Deploy the Edge Function:
   ```bash
   supabase functions deploy trial-class-request
   ```
4. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

The `followup_completed` boolean appears as a checkbox in the Supabase table editor and defaults to unchecked. Public table access is blocked by RLS; submissions are written only by the Edge Function.

`notification_sent` becomes true only when Twilio accepts both recipient emails
(HTTP 202). This confirms provider acceptance, not inbox delivery. A recipient
failure is recorded in `notification_error` without failing an already saved
request. Review failed notifications before retrying; a network timeout can occur
after acceptance. Submitted text is passed as escaped template variables. No
schema change or frontend deployment is required for this provider switch. Keep
JWT verification enabled. To recover, disable email dispatch while preserving
saved requests; do not restore a retired provider credential.

## Kathak Journal

Readers visit `/blog`. The existing `/admin` access code opens the journal editor for drafts, image uploads, previews and publishing. See [the rollout and verification guide](docs/blog-rollout.md) for the isolated blog bucket, database migration, welcome story, local preview, and production sequence.

