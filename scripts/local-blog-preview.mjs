// Disposable local verification environment. Uses PGlite and in-memory Storage, never production.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createRuntime } from "../tests/helpers/blog-runtime.mjs";

const runtime = await createRuntime();
const draft = (await (await runtime.call({ action: "list_posts" })).json())
  .posts[0];
const hero = await readFile(
  new URL("../content/chandrayee-hero.webp", import.meta.url),
);
const thumbnail = await readFile(
  new URL("../content/chandrayee-thumbnail.webp", import.meta.url),
);
const paths = await (
  await runtime.call({
    action: "upload_image",
    hero: hero.toString("base64"),
    thumbnail: thumbnail.toString("base64"),
  })
).json();
const seeded = await runtime.call({
  action: "save_post",
  post: { ...draft, ...paths, published: true },
});
if (!seeded.ok) throw new Error("Unable to seed local preview.");

const api = createServer(async (incoming, outgoing) => {
  const url = new URL(incoming.url, "http://127.0.0.1:4188");
  const cors = {
    "Access-Control-Allow-Origin": "http://127.0.0.1:4173",
    "Access-Control-Allow-Headers": "content-type,x-admin-key",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  };
  try {
    if (url.pathname.startsWith("/storage/v1/object/public/")) {
      const path = url.pathname.replace(
        "/storage/v1/object/public/blog-images/",
        "",
      );
      const image = runtime.objects.get(path);
      // Branding placeholder is local; no production assets or APIs are needed for verification.
      outgoing.writeHead(200, { ...cors, "Content-Type": "image/webp" });
      outgoing.end(image ? image.bytes : thumbnail);
      return;
    }
    if (url.pathname === "/functions/v1/admin-portal") {
      if (incoming.method === "OPTIONS") {
        outgoing.writeHead(204, cors);
        outgoing.end();
        return;
      }
      outgoing.writeHead(
        incoming.headers["x-admin-key"] === "local-blog-preview" ? 200 : 401,
        { ...cors, "Content-Type": "application/json" },
      );
      outgoing.end(
        JSON.stringify(
          incoming.headers["x-admin-key"] === "local-blog-preview"
            ? { requests: [], albums: [] }
            : { error: "Invalid access code" },
        ),
      );
      return;
    }
    if (url.pathname !== "/functions/v1/blog") {
      outgoing.writeHead(404);
      outgoing.end();
      return;
    }
    const chunks = [];
    for await (const chunk of incoming) chunks.push(chunk);
    const request = new Request(url, {
      method: incoming.method,
      headers: incoming.headers,
      ...(!["GET", "HEAD"].includes(incoming.method)
        ? { body: Buffer.concat(chunks) }
        : {}),
    });
    const response = await runtime.handler(request);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    outgoing.writeHead(500);
    outgoing.end("Local preview failed.");
  }
});
await new Promise((resolve) => api.listen(4188, "127.0.0.1", resolve));
process.env.VITE_SUPABASE_URL = "http://127.0.0.1:4188";
const { createServer: createViteServer } = await import("vite");
const vite = await createViteServer({
  server: { host: "127.0.0.1", port: 4173, strictPort: true },
});
await vite.listen();
console.log(
  "Disposable blog preview ready at http://127.0.0.1:4173/blog (local database and image storage).",
);
async function close() {
  await vite.close();
  api.close();
  await runtime.db.close();
  process.exit(0);
}
process.on("SIGINT", close);
process.on("SIGTERM", close);
