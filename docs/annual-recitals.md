# Annual Recitals

The archive is `/recitals`; each year has a shareable `/recitals/2026` page. Desktop/mobile navigation and the footer link to the archive. The page uses the supplied 2026 poster, compressed to WebP (229 KB hero / 52 KB archive thumbnail).

## Add a year or media

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

The user confirmed Sunday, September 27, 2026. The page displays that date and uses only the upper poster artwork so the old printed date is not shown. The archive, gallery and performances show Coming Soon. Artist URLs and photo album names are pending. Set `comingSoon` to false when the year is ready to publish its media; until then no media lists or players are loaded.

## Rollout / recovery

Repository: `atulsaini5/nrityangan1`. Existing website target documented in `blog-rollout.md`: Vercel `nrityangan`, domain `www.kathakseattle.com`. Confirm live mapping before deployment. No new environment variables, database migrations, storage buckets, policies, or backend functions. Existing public gallery reads use `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` and its existing optimizer allowlist.

Run `npm test` and `npm run build`. Verify `/recitals`, `/recitals/2026`, unknown years, mobile navigation, photo paging, video search, direct links, and click-to-play with local media fixtures. Roll back the frontend deployment to the preceding version; keep existing uploaded photographs.
