import { renderToStaticMarkup } from "react-dom/server";
import Blog from "../pages/Blog";
import { blogImageUrl } from "./blog";
import type { BlogPost } from "./blogModel";

const SITE = "https://www.kathakseattle.com";
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const json = (data: unknown) =>
  JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

export function renderBlog(
  template: string,
  posts: BlogPost[],
  slug: string,
  page: number,
  hasMore: boolean,
) {
  const post = slug ? posts[0] : undefined;
  const url = `${SITE}/blog${post ? `/${post.slug}` : page > 0 ? `?page=${page + 1}` : ""}`;
  const title = `${post?.title || `The Kathak Journal${page ? ` — Page ${page + 1}` : ""}`} | Nrityangan`;
  const description =
    post?.excerpt ||
    "Kathak stories, practice and traditions from Chandrayee Bhattacharyya and Nrityangan Kathak Studio in Bellevue and Redmond, Washington.";
  const image = posts[0] ? blogImageUrl(posts[0].image_path) : "";
  const schema = post
    ? {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "@id": `${url}#article`,
        url,
        mainEntityOfPage: url,
        headline: post.title,
        description,
        image: [image],
        datePublished: post.published_at,
        dateModified: post.updated_at,
        author: { "@type": "Person", name: post.author },
        publisher: {
          "@type": "Organization",
          name: "Nrityangan Kathak Studio",
          url: SITE,
        },
        inLanguage: "en-US",
        articleBody: post.content,
      }
    : {
        "@context": "https://schema.org",
        "@type": "Blog",
        name: "The Kathak Journal",
        url,
        description,
        blogPost: posts.map((p) => ({
          "@type": "BlogPosting",
          headline: p.title,
          url: `${SITE}/blog/${p.slug}`,
          datePublished: p.published_at,
          author: { "@type": "Person", name: p.author },
        })),
      };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE },
      {
        "@type": "ListItem",
        position: 2,
        name: "The Kathak Journal",
        item: `${SITE}/blog`,
      },
      ...(post
        ? [{ "@type": "ListItem", position: 3, name: post.title, item: url }]
        : []),
    ],
  };
  const meta = `<title>${escape(title)}</title><meta name="description" content="${escape(description)}"><link rel="canonical" href="${escape(url)}"><meta name="robots" content="index,follow,max-image-preview:large"><meta property="og:type" content="${post ? "article" : "website"}"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${escape(url)}"><meta property="og:site_name" content="Nrityangan Kathak Studio"><meta name="twitter:card" content="summary_large_image">${image ? `<meta property="og:image" content="${escape(image)}"><meta property="og:image:alt" content="${escape(posts[0].image_alt)}"><meta name="twitter:image" content="${escape(image)}">` : ""}${post ? `<meta name="author" content="${escape(post.author)}"><meta property="article:published_time" content="${escape(post.published_at || "")}"><meta property="article:modified_time" content="${escape(post.updated_at)}">` : ""}<script type="application/ld+json">${json([schema, breadcrumb])}</script>`;
  const body = renderToStaticMarkup(
    <div className="font-sans text-slate-800 bg-white min-h-screen">
      <a className="sr-only focus:not-sr-only" href="#journal">
        Skip to content
      </a>
      <nav
        aria-label="Main navigation"
        className="border-b border-rose-100 px-6 py-5 flex flex-wrap items-center justify-between gap-5"
      >
        <a className="font-serif text-2xl font-bold" href="/">
          Nrityangan<span className="text-rose-500">.</span>
        </a>
        <div className="flex flex-wrap gap-5 text-sm">
          <a href="/">Home</a>
          <a href="/#classes">Classes</a>
          <a href="/#gallery">Gallery</a>
          <a href="/blog" aria-current="page" className="text-rose-700">
            Journal
          </a>
          <a href="/#about">About</a>
          <a href="/trial-class">Try a class</a>
        </div>
      </nav>
      <div id="journal">
        <Blog slug={slug || undefined} initial={{ posts, page, hasMore }} />
      </div>
      <footer className="border-t border-rose-100 px-6 py-10 text-center text-sm text-slate-600">
        <p>Nrityangan Kathak Studio · Bellevue &amp; Redmond, Washington</p>
        <p className="mt-4">
          <a href="/trial-class">Begin your Kathak journey</a> ·{" "}
          <a href="/admin">Admin</a>
        </p>
      </footer>
    </div>,
  );
  return template
    .replace("<!-- SEO -->", () => meta)
    .replace("<!-- JOURNAL -->", () => body);
}
