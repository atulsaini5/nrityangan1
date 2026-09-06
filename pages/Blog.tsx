import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, Loader2 } from "lucide-react";
import BlogContent from "../components/BlogContent";
import { blogImageUrl, getBlogs } from "../lib/blog";
import type { BlogPost } from "../lib/blogModel";

const date = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "America/Los_Angeles",
      })
    : "";

export default function Blog({
  slug,
  initial,
}: {
  slug?: string;
  initial?: { posts: BlogPost[]; page: number; hasMore: boolean };
}) {
  const [posts, setPosts] = useState<BlogPost[]>(initial?.posts || []);
  const [page] = useState(
    initial?.page ??
      Math.max(
        0,
        Number(
          typeof window !== "undefined"
            ? new URLSearchParams(window.location.search).get("page") || 1
            : 1,
        ) - 1,
      ),
  );
  const [more, setMore] = useState(initial?.hasMore || false);
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    getBlogs({ slug, page }, controller.signal)
      .then((result) => {
        setPosts(result.posts);
        setMore(result.hasMore);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [slug, page, retry]);

  useEffect(() => {
    const title = document.title;
    document.title = `${slug && posts[0] ? posts[0].title : "The Kathak Journal"} | Nrityangan`;
    return () => {
      document.title = title;
    };
  }, [slug, posts]);

  if (loading || error)
    return (
      <main
        className="min-h-[60vh] grid place-items-center px-6 py-24"
        aria-live="polite"
      >
        {loading ? (
          <p className="flex items-center gap-3">
            <Loader2 className="animate-spin" /> Opening the journal…
          </p>
        ) : (
          <div className="text-center">
            <p role="alert">{error}</p>
            <button
              className="mt-5 underline text-rose-600"
              onClick={() => setRetry((value) => value + 1)}
            >
              Try again
            </button>
          </div>
        )}
      </main>
    );

  if (slug) {
    const post = posts[0];
    if (!post)
      return (
        <main className="max-w-3xl mx-auto px-6 py-24 text-center">
          <h1 className="font-serif text-4xl mb-5">
            This story isn’t available.
          </h1>
          <a className="text-rose-600 underline" href="/blog">
            Return to the journal
          </a>
        </main>
      );
    return (
      <main className="bg-[#fffaf6] pb-20">
        <article className="max-w-4xl mx-auto px-6 pt-10">
          <a
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-rose-700 mb-10"
          >
            <ArrowLeft size={16} /> The Kathak Journal
          </a>
          <p className="text-xs uppercase tracking-[0.25em] text-rose-700 font-semibold mb-5">
            Stories from Nrityangan
          </p>
          <h1 className="font-serif text-4xl md:text-6xl text-slate-900 leading-tight max-w-3xl">
            {post.title}
          </h1>
          <p className="mt-6 text-lg md:text-xl text-slate-600 leading-relaxed max-w-2xl">
            {post.excerpt}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 my-7">
            <span className="font-semibold text-slate-800">{post.author}</span>
            <time dateTime={post.published_at || undefined}>
              {date(post.published_at)}
            </time>
            <span>
              {Math.max(1, Math.ceil(post.content.split(/\s+/).length / 200))}{" "}
              min read
            </span>
          </div>
          <img
            src={blogImageUrl(post.image_path)}
            alt={post.image_alt}
            fetchPriority="high"
            decoding="async"
            className="w-full max-h-[640px] object-contain rounded-2xl bg-rose-50 mb-12"
          />
          <div className="max-w-2xl mx-auto">
            <BlogContent content={post.content} />
            <div className="border-t border-rose-200 mt-12 pt-8">
              <p className="font-serif text-2xl mb-3">
                Every journey begins with a step.
              </p>
              <a
                href="/trial-class"
                className="inline-flex items-center gap-2 text-rose-700 font-semibold"
              >
                Dance with us <ArrowUpRight size={18} />
              </a>
            </div>
          </div>
        </article>
      </main>
    );
  }

  return (
    <main className="bg-[#fffaf6] min-h-[70vh] pb-20">
      <header className="max-w-7xl mx-auto px-6 pt-16 pb-12 md:pt-24">
        <p className="text-xs uppercase tracking-[0.3em] text-rose-700 font-semibold mb-5">
          A life in rhythm
        </p>
        <h1 className="font-serif text-5xl md:text-7xl text-slate-900">
          The Kathak Journal<span className="text-rose-500">.</span>
        </h1>
        <p className="max-w-2xl text-slate-600 text-lg leading-relaxed mt-6">
          Reflections from Chandrayee and the Nrityangan family. On practice,
          tradition, and the stories we carry through dance.
        </p>
      </header>
      <section aria-label="Journal stories" className="max-w-7xl mx-auto px-6">
        {!posts.length && (
          <p className="py-12 text-slate-500">
            Our first story is on its way. Come back soon.
          </p>
        )}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post, index) => (
            <article
              key={post.id}
              className={`group bg-white rounded-2xl overflow-hidden border border-rose-100 ${index === 0 && page === 0 ? "md:col-span-2 lg:col-span-3 md:grid md:grid-cols-2" : ""}`}
            >
              <a
                href={`/blog/${post.slug}`}
                tabIndex={-1}
                aria-hidden="true"
                className="block overflow-hidden bg-rose-50"
              >
                <img
                  src={blogImageUrl(
                    index === 0 && page === 0
                      ? post.image_path
                      : post.thumbnail_path,
                  )}
                  alt=""
                  loading={index === 0 ? "eager" : "lazy"}
                  decoding="async"
                  className="w-full h-full min-h-72 max-h-[520px] object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </a>
              <div className="p-8 md:p-10 flex flex-col justify-center">
                <p className="text-xs uppercase tracking-widest text-rose-700 mb-5">
                  {index === 0 && page === 0 ? "From the heart" : "The journal"}
                </p>
                <h2 className="font-serif text-3xl text-slate-900 leading-tight">
                  <a
                    href={`/blog/${post.slug}`}
                    className="hover:text-rose-700"
                  >
                    {post.title}
                  </a>
                </h2>
                <p className="text-slate-600 leading-relaxed mt-5 mb-7">
                  {post.excerpt}
                </p>
                <p className="text-sm text-slate-500">
                  {post.author}
                  <br />
                  <time dateTime={post.published_at || undefined}>
                    {date(post.published_at)}
                  </time>
                </p>
                <a
                  href={`/blog/${post.slug}`}
                  className="inline-flex items-center gap-2 mt-8 text-rose-700 font-semibold"
                >
                  Read the story <ArrowUpRight size={18} />
                </a>
              </div>
            </article>
          ))}
        </div>
        <div className="flex justify-center gap-6 mt-10">
          {page > 0 && (
            <a
              href={page === 1 ? "/blog" : `/blog?page=${page}`}
              className="text-rose-700 underline"
            >
              Newer stories
            </a>
          )}
          {more && (
            <a
              href={`/blog?page=${page + 2}`}
              className="text-rose-700 underline"
            >
              Older stories
            </a>
          )}
        </div>
      </section>
    </main>
  );
}
