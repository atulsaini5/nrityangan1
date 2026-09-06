import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const SITE = "https://www.kathakseattle.com";
const xml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c],
  );
const paths = [
  "/",
  "/kids-kathak-bellevue",
  "/kathak-classes-redmond",
  "/adult-kathak-bellevue",
  "/trial-class",
  "/blog",
];

export function createHandler({
  fetcher = fetch,
  base = process.env.VITE_SUPABASE_URL,
  render,
  template,
} = {}) {
  async function getPosts(query) {
    if (!base) throw new Error("Missing public blog configuration");
    const response = await fetcher(
      `${base.replace(/\/$/, "")}/functions/v1/blog?${query}`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (!response.ok) throw new Error("Blog unavailable");
    const data = await response.json();
    if (
      !Array.isArray(data.posts) ||
      typeof data.hasMore !== "boolean" ||
      data.posts.some((p) => p.published !== true)
    )
      throw new Error("Invalid public blog response");
    return data;
  }
  return async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    const send = (status, body) => {
      res.statusCode = status;
      res.end(req.method === "HEAD" ? "" : body);
    };
    const fail = (status, title) => {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("X-Robots-Tag", "noindex");
      send(
        status,
        `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width"><title>${title} | Nrityangan</title></head><body><main><h1>${title}</h1><a href="/blog">Return to the journal</a></main></body></html>`,
      );
    };
    if (!["GET", "HEAD"].includes(req.method)) {
      res.setHeader("Allow", "GET, HEAD");
      return fail(405, "Method not allowed");
    }
    try {
      const url = new URL(req.url || "/", SITE);
      if (
        url.pathname === "/sitemap.xml" ||
        url.searchParams.get("sitemap") === "1"
      ) {
        const entries = paths.map(
          (path) => `<url><loc>${SITE}${path}</loc></url>`,
        );
        const seen = new Set();
        for (let page = 0; ; page++) {
          const result = await getPosts(
            new URLSearchParams({ page: String(page) }),
          );
          for (const post of result.posts) {
            if (seen.has(post.slug)) continue;
            seen.add(post.slug);
            entries.push(
              `<url><loc>${SITE}/blog/${xml(post.slug)}</loc><lastmod>${xml(new Date(post.updated_at).toISOString())}</lastmod></url>`,
            );
          }
          if (!result.hasMore) break;
          if (page >= 4000 || !result.posts.length)
            throw new Error("Sitemap exceeds supported size");
        }
        res.setHeader("Content-Type", "application/xml; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60");
        return send(
          200,
          `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.join("")}</urlset>`,
        );
      }
      const slug =
        url.searchParams.get("slug") ||
        (url.pathname.startsWith("/blog/")
          ? url.pathname.slice(6).replace(/\/$/, "")
          : "");
      const pageText = url.searchParams.get("page") || "1";
      if (
        (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) ||
        !/^[1-9]\d{0,4}$/.test(pageText) ||
        Number(pageText) > 10001
      )
        return fail(404, "Story not found");
      const page = slug ? 0 : Number(pageText) - 1;
      const result = await getPosts(
        new URLSearchParams(slug ? { slug } : { page: String(page) }),
      );
      if ((slug || page) && !result.posts.length)
        return fail(404, "Story not found");
      const renderer =
        render ||
        (
          await import(
            pathToFileURL(join(process.cwd(), "dist-ssr", "renderBlog.mjs"))
              .href
          )
        ).renderBlog;
      const shell =
        template ||
        (await readFile(
          join(process.cwd(), "dist", "blog-shell.html"),
          "utf8",
        ));
      const html = renderer(shell, result.posts, slug, page, result.hasMore);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60");
      return send(200, html);
    } catch {
      res.setHeader("Retry-After", "60");
      return fail(503, "Journal temporarily unavailable");
    }
  };
}
export default createHandler();
