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
2. Run the app:
   `npm run dev`


## Trial class requests (Supabase)

The **Book a Trial Class** form posts to the `trial-class-request` Supabase Edge Function. The function stores the request in `public.trial_class_requests` and sends an email notification through SendGrid to `tumam_b@yahoo.com` and `atulsnow@gmail.com`.

1. Link the project and apply the database migration:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```
2. Configure the function secrets. The function uses the project's existing verified SendGrid sender. Restrict `ALLOWED_ORIGINS` to the deployed site (comma-separated when needed):
   ```bash
   supabase secrets set SENDGRID_API_KEY=... ALLOWED_ORIGINS="https://your-site.example"
   ```
3. Deploy the Edge Function:
   ```bash
   supabase functions deploy trial-class-request
   ```
4. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

The `followup_completed` boolean appears as a checkbox in the Supabase table editor and defaults to unchecked. Public table access is blocked by RLS; submissions are written only by the Edge Function.


