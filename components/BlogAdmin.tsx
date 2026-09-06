import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Eye,
  Heading2,
  Italic,
  List,
  Loader2,
  Plus,
  Quote,
  Save,
  Upload,
} from "lucide-react";
import BlogContent from "./BlogContent";
import {
  blobBase64,
  blogEndpoint,
  blogImageUrl,
  optimizeBlogImage,
} from "../lib/blog";
import { slugify, validatePost, type BlogPost } from "../lib/blogModel";

const emptyPost = (): BlogPost => ({
  id: "",
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  author: "Chandrayee Bhattacharyya",
  image_path: "",
  thumbnail_path: "",
  image_alt: "",
  published: false,
  published_at: null,
  created_at: "",
  updated_at: "",
});

export default function BlogAdmin({ accessCode }: { accessCode: string }) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [post, setPost] = useState<BlogPost | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
  const editor = useRef<HTMLTextAreaElement>(null);
  const call = async (body: Record<string, unknown>) => {
    const response = await fetch(blogEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": accessCode,
      },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(result.error || "Unable to complete the blog request.");
    return result;
  };
  const load = async () => {
    try {
      const result = await call({ action: "list_posts", page });
      setPosts(result.posts);
      setMore(result.hasMore);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to load stories.",
      );
    }
  };
  useEffect(() => {
    void load();
  }, [page]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty || busy) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, busy]);

  const open = (next: BlogPost | null) => {
    if (dirty && !window.confirm("Discard your unsaved changes?")) return;
    setPost(next);
    setDirty(false);
    setError("");
    setMessage("");
    setPreview(false);
  };
  const change = (patch: Partial<BlogPost>) => {
    setPost((current) => (current ? { ...current, ...patch } : current));
    setDirty(true);
    setMessage("");
  };
  const format = (before: string, after = "") => {
    const target = editor.current;
    if (!target || !post) return;
    const { selectionStart: start, selectionEnd: end } = target;
    const selected = post.content.slice(start, end) || "Your words here";
    const block = before.startsWith("\n");
    const replacement =
      block && before.includes("- ")
        ? `\n\n${selected
            .split("\n")
            .map((line) => `- ${line}`)
            .join("\n")}\n\n`
        : `${before}${selected}${after}`;
    change({
      content:
        post.content.slice(0, start) + replacement + post.content.slice(end),
    });
    requestAnimationFrame(() => {
      target.focus();
      target.setSelectionRange(
        start + before.length,
        start + before.length + selected.length,
      );
    });
  };
  const upload = async (file?: File) => {
    if (!file || !post) return;
    setBusy(true);
    setError("");
    setMessage("Optimizing your photo…");
    try {
      const { hero, thumbnail } = await optimizeBlogImage(file);
      const result = await call({
        action: "upload_image",
        hero: await blobBase64(hero),
        thumbnail: await blobBase64(thumbnail),
      });
      change({
        image_path: result.image_path,
        thumbnail_path: result.thumbnail_path,
      });
      setMessage(
        `Photo ready: ${Math.round((hero.size + thumbnail.size) / 1024)} KB total. Save the story to keep this cover.`,
      );
    } catch (reason) {
      setMessage("");
      setError(
        reason instanceof Error ? reason.message : "Image upload failed.",
      );
    } finally {
      setBusy(false);
    }
  };
  const save = async (published: boolean) => {
    if (!post) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const payload = { ...post, published };
      validatePost(payload);
      const result = await call({ action: "save_post", post: payload });
      setPost(result.post);
      setDirty(false);
      setMessage(
        published
          ? "Your story is published."
          : "Draft saved. This story is not visible to visitors.",
      );
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className="mb-10 rounded-2xl bg-white p-5 md:p-8 shadow-sm"
      aria-labelledby="blog-admin-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2
            id="blog-admin-title"
            className="font-serif text-2xl text-slate-900"
          >
            The Kathak Journal
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            A space for your stories, in your own words.
          </p>
        </div>
        <button
          disabled={busy}
          onClick={() => open(emptyPost())}
          className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-white"
        >
          <Plus size={18} /> New story
        </button>
      </div>
      {message && (
        <p
          role="status"
          className="bg-emerald-50 text-emerald-800 rounded-xl p-4 mb-5"
        >
          {message}
        </p>
      )}
      {error && (
        <div
          role="alert"
          className="bg-red-50 text-red-800 rounded-xl p-4 mb-5"
        >
          {error}{" "}
          {!post && (
            <button
              className="underline ml-2"
              onClick={() => {
                setError("");
                void load();
              }}
            >
              Retry
            </button>
          )}
        </div>
      )}
      {!post ? (
        <>
          <div className="divide-y">
            {posts.map((item) => (
              <div
                key={item.id}
                className="py-4 flex flex-wrap gap-3 items-center justify-between"
              >
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-slate-500">
                    {item.author} ·{" "}
                    <span
                      className={
                        item.published ? "text-emerald-700" : "text-amber-700"
                      }
                    >
                      {item.published ? "Published" : "Draft"}
                    </span>
                  </p>
                </div>
                <button
                  className="text-rose-700 font-semibold underline"
                  onClick={() => open(item)}
                >
                  Edit story
                </button>
              </div>
            ))}
          </div>
          {!posts.length && !error && (
            <p className="text-slate-500 py-4">
              No stories yet. Start with a new story.
            </p>
          )}
          <div className="flex gap-5 mt-4">
            {page > 0 && (
              <button onClick={() => setPage(page - 1)}>Previous</button>
            )}
            {more && <button onClick={() => setPage(page + 1)}>Next</button>}
          </div>
        </>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save(post.published);
          }}
        >
          <fieldset disabled={busy} className="space-y-6 disabled:opacity-70">
            <div className="flex flex-wrap justify-between gap-3">
              <span className="text-sm text-slate-500">
                {dirty
                  ? "Unsaved changes"
                  : post.published
                    ? "Published story"
                    : "Draft story"}
              </span>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setPreview(!preview)}
                  className="flex items-center gap-2 text-rose-700"
                >
                  <Eye size={18} /> {preview ? "Edit" : "Preview"}
                </button>
                <button
                  type="button"
                  onClick={() => open(null)}
                  className="text-slate-500"
                >
                  Close editor
                </button>
              </div>
            </div>
            {preview ? (
              <article className="max-w-3xl mx-auto bg-[#fffaf6] p-6 rounded-xl">
                <p className="text-xs uppercase tracking-widest text-rose-700 mb-5">
                  Preview · {post.published ? "Published" : "Draft"}
                </p>
                <h3 className="font-serif text-4xl mb-5">
                  {post.title || "Your story title"}
                </h3>
                <p className="text-slate-500 mb-5">{post.author}</p>
                <p className="text-lg text-slate-600 mb-6">{post.excerpt}</p>
                {post.image_path && (
                  <img
                    src={blogImageUrl(post.image_path)}
                    alt={post.image_alt}
                    className="max-h-96 w-full object-contain mb-8"
                  />
                )}
                <BlogContent content={post.content} />
              </article>
            ) : (
              <>
                <label className="blog-field">
                  Title
                  <input
                    value={post.title}
                    maxLength={160}
                    required
                    onChange={(event) =>
                      change({
                        title: event.target.value,
                        ...(!post.id && post.slug === slugify(post.title)
                          ? { slug: slugify(event.target.value) }
                          : {}),
                      })
                    }
                  />
                </label>
                <div className="grid md:grid-cols-2 gap-5">
                  <label className="blog-field">
                    Author
                    <input
                      value={post.author}
                      maxLength={120}
                      required
                      onChange={(event) =>
                        change({ author: event.target.value })
                      }
                    />
                  </label>
                  <label className="blog-field">
                    Story URL
                    <span className="text-xs font-normal text-slate-500">
                      /blog/{post.slug || "your-story"}
                    </span>
                    <input
                      value={post.slug}
                      maxLength={100}
                      pattern="[a-z0-9]+(-[a-z0-9]+)*"
                      required
                      onChange={(event) => change({ slug: event.target.value })}
                    />
                  </label>
                </div>
                <label className="blog-field">
                  Short introduction
                  <textarea
                    rows={3}
                    maxLength={320}
                    required
                    value={post.excerpt}
                    onChange={(event) =>
                      change({ excerpt: event.target.value })
                    }
                  />
                  <span className="text-xs text-slate-500 font-normal">
                    {post.excerpt.length}/320 characters
                  </span>
                </label>
                <div className="rounded-xl border border-slate-200 p-5">
                  {post.image_path && (
                    <img
                      src={blogImageUrl(post.thumbnail_path)}
                      alt={post.image_alt}
                      className="h-48 max-w-full rounded-lg object-contain mb-4"
                    />
                  )}
                  <label className="blog-field">
                    <span className="flex items-center gap-2">
                      <Upload size={18} /> Cover photo
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      onChange={(event) => {
                        void upload(event.target.files?.[0]);
                        event.target.value = "";
                      }}
                    />
                    <span className="font-normal text-xs text-slate-500">
                      Up to 20 MB. Automatically resized and compressed for the
                      journal.
                    </span>
                  </label>
                  <label className="blog-field mt-4">
                    Photo description
                    <input
                      maxLength={240}
                      required
                      placeholder="Describe the photo for readers who cannot see it"
                      value={post.image_alt}
                      onChange={(event) =>
                        change({ image_alt: event.target.value })
                      }
                    />
                  </label>
                </div>
                <div>
                  <label
                    htmlFor="blog-body"
                    className="block text-sm font-semibold mb-2"
                  >
                    Your story
                  </label>
                  <div
                    role="toolbar"
                    aria-label="Story formatting"
                    className="flex flex-wrap gap-2 p-2 border rounded-t-xl bg-slate-50"
                  >
                    {[
                      { label: "Bold", icon: Bold, before: "**", after: "**" },
                      {
                        label: "Italic",
                        icon: Italic,
                        before: "*",
                        after: "*",
                      },
                      {
                        label: "Heading",
                        icon: Heading2,
                        before: "\n\n## ",
                        after: "\n\n",
                      },
                      {
                        label: "Quote",
                        icon: Quote,
                        before: "\n\n> ",
                        after: "\n\n",
                      },
                      {
                        label: "Bullet list",
                        icon: List,
                        before: "\n\n- ",
                        after: "\n\n",
                      },
                    ].map((tool) => (
                      <button
                        type="button"
                        key={tool.label}
                        title={tool.label}
                        aria-label={tool.label}
                        onClick={() => format(tool.before, tool.after)}
                        className="p-2 hover:bg-rose-100 rounded"
                      >
                        <tool.icon size={18} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    id="blog-body"
                    ref={editor}
                    value={post.content}
                    onChange={(event) =>
                      change({ content: event.target.value })
                    }
                    maxLength={50000}
                    rows={18}
                    required
                    className="w-full border border-t-0 rounded-b-xl p-4 leading-relaxed focus:outline-rose-500"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Select text and use the toolbar. Blank lines separate
                    paragraphs. Preview shows your formatted story. Add a link
                    on its own line as [Watch the performance](https://...).{" "}
                    Blog photos use
                    ![Caption](blog-images/image-folder/hero.webp) on a separate
                    line.
                  </p>
                </div>
              </>
            )}
            <div className="flex flex-wrap gap-3 border-t pt-6">
              <button
                type="submit"
                className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-xl"
              >
                {busy ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}{" "}
                {post.published ? "Save changes" : "Save draft"}
              </button>
              {!post.published && (
                <button
                  type="button"
                  onClick={() => void save(true)}
                  className="bg-rose-600 text-white px-5 py-3 rounded-xl"
                >
                  Publish story
                </button>
              )}
              {post.published && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Move this story to drafts? Visitors will no longer see it.",
                        )
                      )
                        void save(false);
                    }}
                    className="border px-5 py-3 rounded-xl"
                  >
                    Move to drafts
                  </button>
                  <a
                    className="text-rose-700 px-5 py-3"
                    href={`/blog/${post.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View story
                  </a>
                </>
              )}
            </div>
          </fieldset>
        </form>
      )}
    </section>
  );
}
