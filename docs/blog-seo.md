# Journal search visibility

Vercel serves `/blog`, pagination (`?page=2`), and article URLs through `api/journal.mjs`. All visitors receive the same complete HTML without requiring JavaScript. The existing React article component is also used by the bundled server renderer. The admin editor remains the existing authenticated application.

The handler reads only the published-only Supabase Edge Function. It requires the existing `VITE_SUPABASE_URL`; it does not use database or service-role credentials. Published content and the dynamic `/sitemap.xml` use a 60-second CDN cache, so publishing, editing or unpublishing can take up to one minute to appear everywhere.

Each article includes a title, excerpt-based description, canonical URL, author, publication/modification dates, social image metadata, BlogPosting and BreadcrumbList JSON-LD. Text and JSON are escaped separately. Listings have crawlable pagination links and self-canonical URLs. Missing articles and empty pagination pages return 404 with noindex; upstream errors return uncached 503 with Retry-After. Existing robots.txt permits crawling and points to the dynamic sitemap. No crawler-specific content or training-policy changes are introduced.

Validation: `npm run build` builds the client assets and server renderer; `npm test` rebuilds the renderer and checks HTTP semantics, HTML escaping, metadata, sitemap pagination, publication authorization, image uploads and database isolation. No schema, storage, Edge Function or environment-variable changes are needed for this release.

Deploy through the repository's Vercel integration. Roll back by restoring the previous Vercel production deployment; no database recovery is needed. Discovery and indexing depend on the search engines. The site owner can submit `/sitemap.xml` in Search Console and request indexing of the introduction article.
