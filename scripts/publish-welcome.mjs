// Run only against the explicitly approved target, after migration and function deployment.
// Credentials are read from the process environment and are never logged or persisted.
import { readFile } from "node:fs/promises";

const endpoint = process.env.BLOG_ENDPOINT;
const accessCode = process.env.TUMAM_ADMIN_KEY;
if (!endpoint || !accessCode)
  throw new Error(
    "Set BLOG_ENDPOINT and TUMAM_ADMIN_KEY in the process environment.",
  );
const target = new URL(endpoint);
if (
  !target.pathname.endsWith("/functions/v1/blog") ||
  (target.protocol !== "https:" &&
    !["localhost", "127.0.0.1"].includes(target.hostname))
)
  throw new Error("Use the approved blog function URL.");
async function call(body) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-key": accessCode },
    body: JSON.stringify(body),
  });
  if (!response.ok)
    throw new Error(
      `Blog operation failed (${response.status}). No credentials were logged.`,
    );
  return response.json();
}
const id = "a52db619-cc72-46ea-a8ef-97077f6c0a66";
let post;
for (let page = 0; ; page++) {
  const result = await call({ action: "list_posts", page });
  post = result.posts.find((item) => item.id === id);
  if (post || !result.hasMore) break;
}
if (!post)
  throw new Error("Apply the blog migration first. Welcome draft not found.");
if (post.published) {
  console.log("Welcome story is already published; no changes made.");
  process.exit(0);
}
const source = (
  await readFile(
    new URL("../content/chandrayee-welcome.md", import.meta.url),
    "utf8",
  )
).replace(/\r\n/g, "\n");
const originalBody = source.slice(source.indexOf("\n\n") + 2).trim();
if (
  post.content !== originalBody ||
  post.slug !== "where-the-ghungroo-lead-me" ||
  post.updated_at !== post.created_at
)
  throw new Error(
    "The welcome draft has been edited. Use the admin editor to review and publish it.",
  );
const hero = await readFile(
  new URL("../content/chandrayee-hero.webp", import.meta.url),
);
const thumbnail = await readFile(
  new URL("../content/chandrayee-thumbnail.webp", import.meta.url),
);
const image = await call({
  action: "upload_image",
  hero: hero.toString("base64"),
  thumbnail: thumbnail.toString("base64"),
});
await call({
  action: "save_post",
  post: { ...post, ...image, published: true },
});
const verification = await fetch(`${endpoint}?slug=${post.slug}`).then(
  (response) => response.json(),
);
if (verification.posts?.[0]?.id !== id)
  throw new Error(
    "Published story could not be verified. Check the admin editor.",
  );
console.log(
  "Welcome story published and verified with its portrait in blog-images.",
);
