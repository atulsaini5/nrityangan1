import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import {
  createRuntime,
  createBlogHandler,
  model,
} from "./helpers/blog-runtime.mjs";

test("welcome publisher uploads the portrait, publishes the seeded draft, and safely repeats", async () => {
  const runtime = await createRuntime();
  const server = createServer(async (incoming, outgoing) => {
    const chunks = [];
    for await (const chunk of incoming) chunks.push(chunk);
    const request = new Request(`http://127.0.0.1${incoming.url}`, {
      method: incoming.method,
      headers: incoming.headers,
      ...(incoming.method === "POST" ? { body: Buffer.concat(chunks) } : {}),
    });
    const response = await runtime.handler(request);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  });
  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const env = {
      ...process.env,
      BLOG_ENDPOINT: `http://127.0.0.1:${server.address().port}/functions/v1/blog`,
      TUMAM_ADMIN_KEY: "local-blog-preview",
    };
    const script = fileURLToPath(
      new URL("../scripts/publish-welcome.mjs", import.meta.url),
    );
    const first = await promisify(execFile)(process.execPath, [script], {
      env,
    });
    assert.match(first.stdout, /published and verified/);
    const again = await promisify(execFile)(process.execPath, [script], {
      env,
    });
    assert.match(again.stdout, /already published/);
    assert.equal(runtime.objects.size, 2);
    const rows = await runtime.db.query("select published from blog_posts");
    assert.equal(rows.rows[0].published, true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await runtime.db.close();
  }
});

test("unauthorized draft reads and writes never create a privileged client", async () => {
  let accessed = false;
  const handler = createBlogHandler({
    client: () => {
      accessed = true;
      throw new Error("Forbidden");
    },
    adminKey: () => "test-only-code",
    allowedOrigins: [],
  });
  for (const action of ["list_posts", "save_post", "upload_image"]) {
    const result = await handler(
      new Request("http://localhost/blog", {
        method: "POST",
        body: JSON.stringify({ action }),
      }),
    );
    assert.equal(result.status, 401);
  }
  assert.equal(accessed, false);
});

test("migration isolates drafts and blog storage even with an existing broad storage policy", async () => {
  const runtime = await createRuntime();
  try {
    for (const role of ["anon", "authenticated"]) {
      await runtime.db.exec(`set role ${role}`);
      await assert.rejects(
        runtime.db.query("select * from public.blog_posts"),
        /permission denied/,
      );
      await assert.rejects(
        runtime.db.query(
          "insert into storage.objects(bucket_id,name) values ('blog-images','forbidden.webp')",
        ),
        /row-level security/,
      );
      await runtime.db.query(
        "insert into storage.objects(bucket_id,name) values ('gallery','unchanged.webp')",
      );
      await runtime.db.exec("reset role");
    }
    await runtime.db.query(
      "insert into storage.objects(bucket_id,name) values ('blog-images','protected.webp')",
    );
    await runtime.db.exec("set role authenticated");
    assert.equal(
      (
        await runtime.db.query(
          "delete from storage.objects where bucket_id='blog-images' returning id",
        )
      ).rows.length,
      0,
    );
    assert.equal(
      (
        await runtime.db.query(
          "update storage.objects set name='changed.webp' where bucket_id='blog-images' returning id",
        )
      ).rows.length,
      0,
    );
    await runtime.db.exec("reset role");
    const bucket = await runtime.db.query(
      "select * from storage.buckets where id='blog-images'",
    );
    assert.deepEqual(bucket.rows[0].allowed_mime_types, ["image/webp"]);
    assert.equal(Number(bucket.rows[0].file_size_limit), 1048576);
  } finally {
    await runtime.db.close();
  }
});

test("draft → photo upload → publish → read → stale-save rejection → unpublish", async () => {
  const runtime = await createRuntime();
  try {
    const read = () =>
      runtime.handler(
        new Request("http://localhost/blog?slug=where-the-ghungroo-lead-me"),
      );
    assert.deepEqual((await (await read()).json()).posts, []);
    const draft = (await (await runtime.call({ action: "list_posts" })).json())
      .posts[0];
    const source = (
      await readFile(
        new URL("../content/chandrayee-welcome.md", import.meta.url),
        "utf8",
      )
    ).replace(/\r\n/g, "\n");
    assert.equal(
      draft.content,
      source.slice(source.indexOf("\n\n") + 2).trim(),
    );
    const hero = await readFile(
      new URL("../content/chandrayee-hero.webp", import.meta.url),
    );
    const thumbnail = await readFile(
      new URL("../content/chandrayee-thumbnail.webp", import.meta.url),
    );
    const upload = await runtime.call({
      action: "upload_image",
      hero: hero.toString("base64"),
      thumbnail: thumbnail.toString("base64"),
    });
    assert.equal(upload.status, 201);
    const paths = await upload.json();
    assert.equal(runtime.objects.size, 2);
    for (const image of runtime.objects.values()) {
      assert.equal(image.settings.cacheControl, "31536000");
      assert.equal(image.settings.upsert, false);
    }
    const publishedResponse = await runtime.call({
      action: "save_post",
      post: { ...draft, ...paths, published: true },
    });
    assert.equal(publishedResponse.status, 200);
    const published = (await publishedResponse.json()).post;
    assert.equal((await (await read()).json()).posts[0].id, draft.id);
    assert.equal(
      (
        await runtime.call({
          action: "save_post",
          post: { ...draft, ...paths, published: true },
        })
      ).status,
      409,
    );
    const duplicate = await runtime.call({
      action: "save_post",
      post: { ...published, id: "", updated_at: "" },
    });
    assert.equal(duplicate.status, 409);
    assert.equal(
      (
        await runtime.call({
          action: "save_post",
          post: { ...published, published: false },
        })
      ).status,
      200,
    );
    assert.deepEqual((await (await read()).json()).posts, []);
  } finally {
    await runtime.db.close();
  }
});

test("reject invalid images, oversized body, missing cover, and disallowed origins", async () => {
  const runtime = await createRuntime();
  try {
    assert.equal(
      (
        await runtime.call({
          action: "upload_image",
          hero: btoa('<svg onload="alert(1)"/>'),
          thumbnail: "",
        })
      ).status,
      400,
    );
    const large = await runtime.handler(
      new Request("http://localhost/blog", {
        method: "POST",
        headers: { "x-admin-key": "local-blog-preview" },
        body: "x".repeat(1800001),
      }),
    );
    assert.equal(large.status, 400);
    const origin = await runtime.handler(
      new Request("http://localhost/blog", {
        method: "POST",
        headers: {
          "x-admin-key": "local-blog-preview",
          origin: "https://unexpected.example",
        },
        body: "{}",
      }),
    );
    assert.equal(origin.status, 403);
    const draft = (await (await runtime.call({ action: "list_posts" })).json())
      .posts[0];
    assert.equal(
      (
        await runtime.call({
          action: "save_post",
          post: { ...draft, published: true },
        })
      ).status,
      400,
    );
    assert.equal(runtime.objects.size, 0);
  } finally {
    await runtime.db.close();
  }
});

test("failed thumbnail upload cleans up only its newly uploaded hero", async () => {
  const runtime = await createRuntime();
  try {
    runtime.failures.thumbnail = true;
    const bytes = await readFile(
      new URL("../content/chandrayee-thumbnail.webp", import.meta.url),
    );
    assert.equal(
      (
        await runtime.call({
          action: "upload_image",
          hero: bytes.toString("base64"),
          thumbnail: bytes.toString("base64"),
        })
      ).status,
      500,
    );
    assert.equal(runtime.objects.size, 0);
  } finally {
    await runtime.db.close();
  }
});

test("public pagination is bounded, stable and does not expose draft content", async () => {
  const runtime = await createRuntime();
  try {
    await runtime.db
      .exec(`insert into blog_posts (slug,title,excerpt,content,author,image_path,thumbnail_path,image_alt,published,published_at)
      select 'story-' || n, 'Title', 'Excerpt', 'Body', 'Author', 'hero.webp', 'thumb.webp', 'Photo', true, now() from generate_series(1,13) n;`);
    const first = await (
      await runtime.handler(new Request("http://localhost/blog?page=0"))
    ).json();
    const second = await (
      await runtime.handler(new Request("http://localhost/blog?page=1"))
    ).json();
    assert.equal(first.posts.length, 12);
    assert.equal(first.hasMore, true);
    assert.equal(second.posts.length, 1);
    assert.equal(second.hasMore, false);
    assert.equal(
      new Set([...first.posts, ...second.posts].map((post) => post.id)).size,
      13,
    );
    assert.equal(first.posts[0].content, undefined);
    assert.equal(
      (await runtime.handler(new Request("http://localhost/blog?page=-1")))
        .status,
      400,
    );
  } finally {
    await runtime.db.close();
  }
});

test("formatting keeps raw HTML as text and recognizes only supported blocks", () => {
  assert.deepEqual(model.parseBlogContent("<script>alert(1)</script>")[0], {
    type: "paragraph",
    lines: ["<script>alert(1)</script>"],
  });
  assert.equal(
    model.parseBlogContent("## Heading\n\n- One\n- Two\n\n> Quote")[1].type,
    "list",
  );
  assert.equal(model.isBlogImagePath("../gallery/photo.webp"), false);
});
