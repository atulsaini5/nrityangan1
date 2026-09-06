import assert from "node:assert/strict";
import { test } from "node:test";
import { createHandler } from "../api/journal.mjs";
import { renderBlog } from "../dist-ssr/renderBlog.mjs";

const post = {
  id: "one",
  slug: "a-kathak-journey",
  title: "A Kathak journey",
  excerpt: "Practice & tradition",
  content:
    "## A first step\n\nMy **Kathak** story.\n\n<script>alert(1)</script>",
  author: "Chandrayee Bhattacharyya",
  image_path: "portrait/hero.webp",
  image_alt: "Chandrayee dancing Kathak",
  published: true,
  published_at: "2026-09-06T12:00:00Z",
  updated_at: "2026-09-06T13:00:00Z",
};
const template =
  "<html><head><!-- SEO --></head><body><!-- JOURNAL --></body></html>";
test("story media uses escaped captions, isolated blog images and safe HTTPS links", () => {
  const content = [
    "![Students <dance>](blog-images/c9848862-0df3-4fce-9a38-630bf5d79b9b/hero.webp)",
    "[Watch the performance](https://www.youtube.com/watch?v=9hmsb48Z3LI)",
    "[Unsafe](javascript:alert(1))",
    "![Unsafe](https://example.com/tracker.png)",
    "[Credentials](https://user:secret@example.com/)",
  ].join("\n\n");
  const html = renderBlog(
    template,
    [{ ...post, content }],
    post.slug,
    0,
    false,
  );
  assert.match(html, /<figcaption[^>]*>Students &lt;dance&gt;<\/figcaption>/);
  assert.match(html, /loading="lazy"/);
  assert.match(html, /href="https:\/\/www.youtube.com\/watch\?v=9hmsb48Z3LI"/);
  assert.doesNotMatch(
    html,
    /href="javascript:|src="https:\/\/example.com|href="https:\/\/user:/,
  );
});
async function request(
  url,
  data = { posts: [post], hasMore: false },
  method = "GET",
) {
  const headers = {};
  let body;
  const res = {
    setHeader: (k, v) => (headers[k] = v),
    end: (value) => (body = value),
  };
  const handler = createHandler({
    base: "https://example.test",
    fetcher: async (input) =>
      typeof data === "function"
        ? data(input)
        : new Response(JSON.stringify(data)),
    render: renderBlog,
    template,
  });
  await handler({ url, method }, res);
  return { status: res.statusCode, headers, body };
}
test("built renderer serves full escaped article, canonical and valid structured data without JavaScript", async () => {
  const r = await request("/blog/a-kathak-journey");
  assert.equal(r.status, 200);
  assert.match(r.body, /<h1[^>]*>A Kathak journey<\/h1>/);
  assert.match(r.body, /<strong>Kathak<\/strong>/);
  assert.match(r.body, /&lt;script&gt;alert/);
  assert.doesNotMatch(r.body, /<script>alert/);
  assert.match(
    r.body,
    /<link rel="canonical" href="https:\/\/www.kathakseattle.com\/blog\/a-kathak-journey"/,
  );
  const schema = JSON.parse(
    r.body.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1],
  );
  assert.equal(schema[0]["@type"], "BlogPosting");
  assert.equal(schema[0].author.name, post.author);
  assert.equal(schema[0].dateModified, post.updated_at);
  assert.equal(schema[1]["@type"], "BreadcrumbList");
  assert.match(r.body, /og:image/);
  assert.doesNotMatch(r.body, /<time\b/);
});
test("pagination is crawlable, canonical and empty pages return 404", async () => {
  const r = await request("/blog?page=2", { posts: [post], hasMore: true });
  assert.match(r.body, /href="\/blog\?page=3"/);
  assert.match(r.body, /href="\/blog"[^>]*>Newer stories/);
  assert.doesNotMatch(r.body, /<time\b/);
  assert.match(
    r.body,
    /canonical" href="https:\/\/www.kathakseattle.com\/blog\?page=2"/,
  );
  assert.equal(
    (await request("/blog?page=3", { posts: [], hasMore: false })).status,
    404,
  );
});
test("missing stories, invalid pages, upstream failures and methods use correct HTTP semantics", async () => {
  for (const path of [
    "/blog/absent",
    "/blog?page=-1",
    "/blog?page=xyz",
    "/blog/bad/slug",
  ]) {
    const r = await request(path, { posts: [], hasMore: false });
    assert.equal(r.status, 404);
    assert.equal(r.headers["X-Robots-Tag"], "noindex");
  }
  const failure = await request(
    "/blog",
    async () => new Response("", { status: 500 }),
  );
  assert.equal(failure.status, 503);
  assert.equal(failure.headers["Cache-Control"], "no-store");
  assert.equal(
    (
      await request("/blog", {
        posts: [{ ...post, published: false }],
        hasMore: false,
      })
    ).status,
    503,
  );
  assert.equal((await request("/blog", undefined, "HEAD")).body, "");
  assert.equal((await request("/blog", undefined, "POST")).status, 405);
});
test("sitemap discovers every published page and modification dates", async () => {
  const r = await request("/sitemap.xml", async (input) => {
    const page = new URL(input).searchParams.get("page");
    return new Response(
      JSON.stringify({
        posts: [{ ...post, slug: page === "0" ? "first" : "second" }],
        hasMore: page === "0",
      }),
    );
  });
  assert.equal(r.status, 200);
  assert.match(r.body, /\/blog\/first/);
  assert.match(r.body, /\/blog\/second/);
  assert.match(r.body, /<lastmod>2026-09-06T13:00:00.000Z<\/lastmod>/);
});
