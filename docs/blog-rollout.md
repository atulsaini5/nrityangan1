# Kathak Journal rollout

Repository: `atulsaini5/nrityangan1`. Branch: `codex/kathak-blog`.
Vercel: `nrityangan` (`prj_3fIw1l9D0ri0Et9nVERRdvQi0dpd`), team `atuls-projects-8fd4a92b`.
Production site: `https://www.kathakseattle.com`.
Supabase: `tnvyqbxtlplkkozjahmy` (confirmed from the repository's Storage hostname in `vercel.json`, matched against Supabase project metadata).

## What changes

- `/blog` lists published stories, with pagination. `/blog/:slug` opens a story directly.
- Desktop/mobile navigation and footer link to the journal. The footer also links to `/admin`.
- The existing admin access code unlocks the editor. No new accounts or authentication configuration are introduced.
- The editor supports title, URL slug, author, excerpt, cover photo and alt text, bold/italic/headings/quotes/lists, preview, draft saving, publishing, editing, and unpublishing. The formatting toolbar inserts a limited Markdown vocabulary; raw HTML is always text. It is intentionally not an HTML editor.
- `blog_posts` stores content. The `blog` Edge Function provides public published-only reads and authenticated admin actions. Direct `anon`/`authenticated` table access is denied.
- Covers and thumbnails live exclusively in the new public `blog-images` bucket. Uploads resize to maximum 1600/640 pixels on the longest edge, encode WebP, cap files at 1 MB/256 KB, and use UUID folders with one-year cache headers. There is no paid transformation dependency.
- Replaced images remain stored so existing references are not broken. A failed second image upload removes only the first image from that failed pair. Future orphan cleanup should compare stored paths with all draft and published rows before deletion.
- The welcome migration creates a draft of **Where the Ghungroo Lead Me**. The publishing script uploads the prepared portrait and publishes that draft after deployment.

The welcome text is a newly crafted first-person introduction grounded in the checked-in `pages/About.tsx` bio, not a verbatim quotation from Chandrayee. No new awards, dates, or specific personal anecdotes have been invented. Her existing public `Chandrayee.jpeg` portrait was resized/re-encoded without generative alterations. Prepared sizes: 89,206 bytes (hero) and 22,164 bytes (thumbnail). The reviewable text is in `content/chandrayee-welcome.md`.

## Validation

Run `npm ci`, `npm test`, and `npm run build`. Check the Edge Function with `deno check supabase/functions/blog/index.ts`.

`npm test` executes the migration in a disposable PGlite PostgreSQL database. Storage and Supabase SDK calls use a local adapter; this does not claim validation against live Supabase Storage, PostgREST, gateway, CORS configuration, or production secrets.

For a repeatable local browser session, run `node scripts/local-blog-preview.mjs` and open `http://127.0.0.1:4173/blog`. The local admin at `/admin` accepts the fixture code `local-blog-preview`. It uses an in-memory image store, the real blog request handler, and local PostgreSQL. Existing trial/gallery responses and logo assets are placeholders. This fixture is never imported by the deployed app. Stopping the process discards all test data.

Executed checks:

- TypeScript and Vite production build: passed.
- Deno Edge Function type check: passed.
- 11 tests: passed, including unauthorized requests, draft privacy, actual migration grants/RLS, storage restrictions under an existing permissive policy, publication lifecycle, conflict handling, upload limits, partial-upload cleanup, pagination, the repeatable welcome publishing script, and existing gallery pagination.
- Browser: existing admin login; new story; automatic URL; JPEG compression/upload; bold formatting; saved draft excluded from public reads; preview; publish; public detail with loaded cover; desktop/mobile navigation; 390px mobile layout with no horizontal overflow. No page exceptions observed.
- Dependency audit reports inherited Vite/esbuild and React Router advisories. Production dependency audit reports two moderate React Router findings. The app's routing uses its own location logic; this change does not import React Router or expand its usage. A major dependency upgrade is outside this change.

## Production sequence — requires explicit approval

Before proceeding, confirm approval naming the exact reviewed commit and Supabase project `tnvyqbxtlplkkozjahmy`. Merging the PR is a separate explicit action; it will trigger the Git-integrated production deploy.

1. Apply only `supabase/migrations/20260906170455_create_kathak_blog.sql` to the approved target. Do not replay unrelated migrations.
2. Deploy the `blog` Edge Function with gateway JWT verification disabled as declared in `supabase/config.toml`. Its POST requests independently check the existing `TUMAM_ADMIN_KEY`; GET exposes only published rows. Include `handler.ts` and its `lib/blogModel.ts` dependency in the bundle.
3. Verify the function can read the seeded draft through an authorized request and that anonymous public reads return no draft. Verify real Storage upload/list access for the function and blocked client writes.
4. Run `node scripts/publish-welcome.mjs` with process-only `BLOG_ENDPOINT` pointing to the approved target's `/functions/v1/blog` and the existing `TUMAM_ADMIN_KEY`. Do not echo credentials. The script refuses to overwrite an edited draft or republish an already-published welcome story.
5. Deploy the approved frontend commit to Vercel production or merge the approved PR after the backend is ready. Verify `/blog`, the welcome story, `/admin`, image requests, and draft/publish/unpublish using the actual allowed origin.

The backend uses existing `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TUMAM_ADMIN_KEY`, and `ALLOWED_ORIGINS`. The frontend uses existing `VITE_SUPABASE_URL`. No platform environment variables were changed. `BLOG_ENDPOINT` is only an operator script input. A preview deployment needs an explicitly permitted preview origin and an appropriate backend; don't silently point development writes at production or weaken the origin allowlist.

## Migration impact and recovery

This is additive: one table, two indexes, one bucket, three restrictive storage write policies, and one draft. There are no updates/deletes to existing rows, no auth-role changes, and no changes to trial/gallery functions. Policy creation takes a brief metadata lock on `storage.objects`; it does not rewrite its data. Each new restrictive predicate evaluates true for all existing buckets, preserving their existing access rules, and false only for client writes to `blog-images`. The function uses the existing server-side service role after checking the admin code.

Rollback: redeploy the prior production frontend commit (`29ea479a67fa63b98155da3c65b75a2b199da240` was the implementation baseline; verify the actual prior deployment at rollout). Keep the new table, bucket, policies and content to avoid data loss. If the welcome text needs revision, move it to drafts in the editor. Do not drop the table or delete objects as routine rollback. For a partial rollout, leave the frontend on the prior version and repair/retry the failed step; do not blindly rerun the non-idempotent migration. The publish script verifies its result and preserves modified content.

At implementation completion, production migrations, function deployment, portrait upload, publishing, merge, and production deployment are pending approval. Local test data is disposable and never written to a connected Supabase project.
