import {
  BLOG_BUCKET,
  BLOG_PAGE_SIZE,
  validatePost,
} from "../../../lib/blogModel.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.115.0";

const columns =
  "id,slug,title,excerpt,content,author,image_path,thumbnail_path,image_alt,published,published_at,created_at,updated_at";
const summaryColumns = columns.replace(",content", "");
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const MAX_BODY_BYTES = 1800000;
const safeEqual = (left: string, right: string) => {
  let mismatch = left.length ^ right.length;
  for (let i = 0; i < left.length; i++)
    mismatch |= left.charCodeAt(i) ^ (right.charCodeAt(i) || 0);
  return mismatch === 0;
};
const pageNumber = (value: unknown) => {
  const number = Number(value ?? 0);
  if (!Number.isSafeInteger(number) || number < 0 || number > 10000)
    throw new Error("Invalid page.");
  return number;
};

async function boundedJson(request: Request) {
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES)
    throw new Error("Request is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing request body.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new Error("Request is too large.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export function decodeWebP(value: unknown, maxBytes: number) {
  if (typeof value !== "string" || value.length > Math.ceil(maxBytes / 3) * 4)
    throw new Error("Image is too large.");
  let binary: string;
  try {
    binary = atob(value);
  } catch {
    throw new Error("Invalid image encoding.");
  }
  if (
    binary.length < 20 ||
    binary.length > maxBytes ||
    binary.slice(0, 4) !== "RIFF" ||
    binary.slice(8, 12) !== "WEBP"
  )
    throw new Error("Only optimized WebP images are accepted.");
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function createBlogHandler(deps: {
  client: () => SupabaseClient;
  adminKey: () => string;
  allowedOrigins: string[];
}) {
  return async (request: Request) => {
    const origin = request.headers.get("origin");
    const headers: Record<string, string> = {
      "Access-Control-Allow-Origin":
        request.method === "GET"
          ? "*"
          : origin && deps.allowedOrigins.includes(origin)
            ? origin
            : deps.allowedOrigins[0] || "null",
      "Access-Control-Allow-Headers": "content-type, x-admin-key",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      Vary: "Origin",
    };
    const reply = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers });
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers });
    if (!["GET", "POST"].includes(request.method))
      return reply({ error: "Method not allowed." }, 405);
    // Authenticate every mutation and every draft read before creating a privileged client.
    if (request.method === "POST") {
      const key = deps.adminKey();
      if (!key || !safeEqual(key, request.headers.get("x-admin-key") || ""))
        return reply(
          { error: "Invalid access code. Please sign in again." },
          401,
        );
      if (origin && !deps.allowedOrigins.includes(origin))
        return reply(
          { error: "This site is not allowed to use the editor." },
          403,
        );
    }
    try {
      const client = deps.client();
      if (request.method === "GET") {
        const url = new URL(request.url);
        const slug = url.searchParams.get("slug");
        if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
          return reply({ error: "Invalid story URL." }, 400);
        let page: number;
        try {
          page = pageNumber(url.searchParams.get("page"));
        } catch {
          return reply({ error: "Invalid page." }, 400);
        }
        let query = client
          .from("blog_posts")
          .select(slug ? columns : summaryColumns)
          .eq("published", true)
          .order("published_at", { ascending: false })
          .order("id", { ascending: false });
        if (slug) query = query.eq("slug", slug).limit(1);
        else
          query = query.range(
            page * BLOG_PAGE_SIZE,
            page * BLOG_PAGE_SIZE + BLOG_PAGE_SIZE,
          );
        const { data, error } = await query;
        if (error) throw error;
        return reply({
          posts: (data || []).slice(0, BLOG_PAGE_SIZE),
          hasMore: (data || []).length > BLOG_PAGE_SIZE,
        });
      }
      let body;
      try {
        body = await boundedJson(request);
      } catch {
        return reply({ error: "Invalid or oversized request." }, 400);
      }
      if (!body || typeof body !== "object")
        return reply({ error: "Invalid request." }, 400);
      if (body.action === "list_posts") {
        let page: number;
        try {
          page = pageNumber(body.page);
        } catch {
          return reply({ error: "Invalid page." }, 400);
        }
        const { data, error } = await client
          .from("blog_posts")
          .select(columns)
          .order("updated_at", { ascending: false })
          .order("id", { ascending: false })
          .range(page * 25, page * 25 + 25);
        if (error) throw error;
        return reply({
          posts: (data || []).slice(0, 25),
          hasMore: (data || []).length > 25,
        });
      }
      if (body.action === "upload_image") {
        let hero: Uint8Array, thumbnail: Uint8Array;
        try {
          hero = decodeWebP(body.hero, 1024 * 1024);
          thumbnail = decodeWebP(body.thumbnail, 256 * 1024);
        } catch (error) {
          return reply(
            {
              error: error instanceof Error ? error.message : "Invalid image.",
            },
            400,
          );
        }
        const folder = crypto.randomUUID();
        const image_path = `${folder}/hero.webp`,
          thumbnail_path = `${folder}/thumbnail.webp`;
        const bucket = client.storage.from(BLOG_BUCKET);
        const settings = {
          contentType: "image/webp",
          cacheControl: "31536000",
          upsert: false,
        };
        const first = await bucket.upload(image_path, hero, settings);
        if (first.error) throw first.error;
        const second = await bucket.upload(thumbnail_path, thumbnail, settings);
        if (second.error) {
          await bucket.remove([image_path]);
          throw second.error;
        }
        return reply({ image_path, thumbnail_path }, 201);
      }
      if (body.action === "save_post") {
        const post = body.post;
        if (!post || typeof post !== "object")
          return reply({ error: "Missing story." }, 400);
        try {
          validatePost(post);
        } catch (error) {
          return reply(
            {
              error: error instanceof Error ? error.message : "Invalid story.",
            },
            400,
          );
        }
        if (
          post.id &&
          (!uuid.test(post.id) ||
            typeof post.updated_at !== "string" ||
            !Number.isFinite(Date.parse(post.updated_at)))
        )
          return reply(
            { error: "Invalid story revision. Reload the editor." },
            400,
          );
        // Only accept image pairs that actually exist in the isolated blog bucket.
        const folder = post.image_path.split("/")[0];
        const images = await client.storage
          .from(BLOG_BUCKET)
          .list(folder, { limit: 10 });
        if (images.error) throw images.error;
        if (
          !["hero.webp", "thumbnail.webp"].every((name) =>
            images.data?.some((image) => image.name === name && image.id),
          )
        )
          return reply(
            {
              error: "The cover upload is incomplete. Please upload it again.",
            },
            400,
          );
        const now = new Date().toISOString();
        let publishedAt: string | null = null;
        if (post.id) {
          const existing = await client
            .from("blog_posts")
            .select("published_at")
            .eq("id", post.id)
            .maybeSingle();
          if (existing.error) throw existing.error;
          if (!existing.data)
            return reply(
              { error: "This story no longer exists. Reload the editor." },
              404,
            );
          publishedAt = existing.data.published_at;
        }
        const payload = {
          title: post.title.trim(),
          slug: post.slug,
          excerpt: post.excerpt.trim(),
          content: post.content.trim(),
          author: post.author.trim(),
          image_path: post.image_path,
          thumbnail_path: post.thumbnail_path,
          image_alt: post.image_alt.trim(),
          published: post.published,
          published_at: post.published ? publishedAt || now : publishedAt,
          updated_at: now,
        };
        const query = post.id
          ? client
              .from("blog_posts")
              .update(payload)
              .eq("id", post.id)
              .eq("updated_at", post.updated_at)
          : client.from("blog_posts").insert(payload);
        const { data, error } = await query.select(columns).maybeSingle();
        if (error?.code === "23505")
          return reply(
            { error: "That story URL is already in use. Choose another URL." },
            409,
          );
        if (error) throw error;
        if (!data)
          return reply(
            {
              error:
                "Someone saved a newer version. Copy your changes, close the editor, and reopen the story.",
            },
            409,
          );
        return reply({ post: data });
      }
      return reply({ error: "Unknown action." }, 400);
    } catch {
      // Do not log payloads, access codes, or internal database details.
      return reply(
        { error: "The journal is temporarily unavailable. Please try again." },
        500,
      );
    }
  };
}
