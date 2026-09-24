# Annual Recitals

The archive is `/recitals`; each year has a shareable `/recitals/2026` page. Desktop/mobile navigation and the footer link to the archive. The page uses the supplied 2026 poster, compressed to WebP (229 KB hero / 52 KB archive thumbnail).

## Add a year or media

### Interactive audience agendas

The 2026 audience program is `/recitals/2026/agenda`, linked from its recital page even while photos/videos are Coming Soon. The review invitation links directly to the studio's supplied Google review URL. All 21 performances and five time blocks come from the updated September 24 agenda document; older performer assignments are intentionally not carried forward.

Each performance is a keyboard-accessible disclosure with an empty-state message until names are supplied. To publish the roster, edit only its `participants` array in `content/agendas/2026.json`, for example `"participants": ["Name One", "Name Two"]`. Names render as plain text. Keep item IDs stable and include only names intended for the public program. Commit and redeploy; the audience URL and printed QR code stay unchanged.

For another year, add the recital metadata, set `agenda: true`, and create `content/agendas/YYYY.json` using the same schema (`year`, `time`, and `sections`, with stable unique IDs). The page automatically loads that year's file. Include that year's `public/recitals/YYYY/agenda-qr.svg` and `.png`, encoding `https://www.kathakseattle.com/recitals/YYYY/agenda`. Keep old years' files in place. The QR assets use black modules on white with a four-module quiet zone; preserve that border when printing. No external QR service, account, expiration, database, or environment variables are involved.

The checked-in agenda tests validate unique IDs, correct year isolation, participant arrays, published assets, and the updated 2026 sequence. Use the existing build and test scripts. Browser checks should cover disclosure controls, Expand/Collapse all, narrow layouts, section jump links, review-link destination, and unavailable years.

Deployment recovery: restore Vercel deployment `5pkT7YK7cHB732NV3odnKFZLvUUA` (commit `f3e5f75eafd6b174c357a2c0410091b25fbf2ec2`) if the agenda release must be rolled back. It is the production deployment verified before this change. No Supabase migrations or environment changes are required.

1. Add an entry to `content/recitals.json` with a unique four-digit `year`, title, subtitle, description, venue, highlights, poster and thumbnail paths, `photoAlbums`, and `performancesFile`. Only published years belong in this file; do not put private draft information in public assets.
2. Upload recital photographs through the existing `/admin` → **Upload Photos**. Create a distinct album such as `2026-Kathak-Yatra`. Set that exact album name in the year's `photoAlbums` array. Several album names are supported in the desired order. Photos in other albums are never included automatically. The existing gallery upload and Storage policies are unchanged.
3. Create `public/recitals/2026-performances.json` (substitute the new year), containing an array of `{ "artist": "Artist name", "title": "Performance title", "youtubeUrl": "https://www.youtube.com/watch?v=VIDEO_ID" }`. Use real artist names and actual public video links. Group performances can list the group or multiple artists. Run `npm test` to validate links and assets.
4. Commit/deploy metadata updates through the usual review process. This initial release does not add a recital metadata editor to admin. Later photos uploaded to an already-linked album appear without a code change (listing cache expires after five minutes).

## Performance and behavior

- The recital page and performance component are separate lazy chunks. Other pages do not download them.
- Archive loads thumbnails only, not every year's full poster or photographs.
- The selected year's linked albums reuse the existing gallery's 24-photo pagination, responsive 320/640px Vercel image optimization, browser lazy loading and five-minute listing cache. Large photo requests happen only in the lightbox. No traversal of unrelated albums.
- Performance JSON loads only when its tab is opened. Search matches artists and titles. Initially only 12 cards are rendered; Load more adds 12. Thumbnails lazy-load; there are no YouTube iframes before interaction and at most one active player. Switching tabs or search stops playback. Every card includes a direct YouTube link.
- Media errors have retry controls; missing content has honest empty states. No fake performers, photos or video links were seeded.

## Content pending

### 2025 archive

The 2025 page uses the supplied `2025 Recital` folder: nine photographs, the announcement PNG/PDF, and the two program spreads from the ZIP. The program confirms September 21, 2025, 5–9 PM, Bellevue Youth Theatre. Program milestones and guest artists are transcribed from the provided spreads; the full spreads and generated PDF preserve the complete performer list. No individual artist video links were supplied.

Photos have EXIF orientation applied, metadata removed, 320/640px WebP thumbnails and a maximum 1800px full view. The gallery fetches only its manifest initially, lazy-loads responsive thumbnails, renders up to 24 at a time and requests full images only when opening the keyboard-accessible native dialog. Program images load only when that section is selected. Assets are local static files; there are no new Storage writes or schema changes.

The user confirmed that the promo in this folder belongs to **2026**, matching the September 27 date printed in the video. It appears on the 2026 page alongside its Coming Soon photo/performance areas. The 27.75-second H.264/AAC video was compressed from 25.4 MB to 13.6 MB, resized to 1280px and made fast-start; no video element or MP4 request exists before pressing Play. The promo is not placed on the 2025 page.

The user confirmed Sunday, September 27, 2026. The page displays that date and uses only the upper poster artwork so the old printed date is not shown. The archive, gallery and performances show Coming Soon. Artist URLs and photo album names are pending. Set `comingSoon` to false when the year is ready to publish its media; until then no media lists or players are loaded.

## Rollout / recovery

Repository: `atulsaini5/nrityangan1`. Existing website target documented in `blog-rollout.md`: Vercel `nrityangan`, domain `www.kathakseattle.com`. Confirm live mapping before deployment. No new environment variables, database migrations, storage buckets, policies, or backend functions. Existing public gallery reads use `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` and its existing optimizer allowlist.

Run `npm test` and `npm run build`. Verify `/recitals`, `/recitals/2026`, unknown years, mobile navigation, photo paging, video search, direct links, and click-to-play with local media fixtures. Roll back the frontend deployment to the preceding version; keep existing uploaded photographs.
