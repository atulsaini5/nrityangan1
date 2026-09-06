export const BLOG_BUCKET = "blog-images";
export const BLOG_PAGE_SIZE = 12;
export const WELCOME_ID = "a52db619-cc72-46ea-a8ef-97077f6c0a66";

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  image_path: string;
  thumbnail_path: string;
  image_alt: string;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export const slugify = (title: string) =>
  title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100)
    .replace(/-$/, "");

export const isBlogImagePath = (path: unknown): path is string =>
  typeof path === "string" &&
  /^[a-f0-9-]{36}\/(hero|thumbnail)\.webp$/.test(path);

export const validatePost = (input: Record<string, unknown>) => {
  const limits: Record<string, number> = {
    title: 160,
    slug: 100,
    excerpt: 320,
    content: 50000,
    author: 120,
    image_alt: 240,
  };
  for (const [field, max] of Object.entries(limits)) {
    if (
      typeof input[field] !== "string" ||
      !(input[field] as string).trim() ||
      (input[field] as string).length > max
    ) {
      throw new Error(
        `${field.replace("_", " ")} is required (maximum ${max} characters).`,
      );
    }
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug as string))
    throw new Error("Use lowercase letters, numbers and hyphens in the URL.");
  if (
    !isBlogImagePath(input.image_path) ||
    !isBlogImagePath(input.thumbnail_path) ||
    !(input.image_path as string).endsWith("/hero.webp") ||
    !(input.thumbnail_path as string).endsWith("/thumbnail.webp") ||
    (input.image_path as string).split("/")[0] !==
      (input.thumbnail_path as string).split("/")[0]
  ) {
    throw new Error("Upload a cover image before saving.");
  }
  if (typeof input.published !== "boolean")
    throw new Error("Choose draft or published status.");
};

// No HTML is interpreted. The editor and reader share this deliberately small Markdown vocabulary.
export type BlogBlock = {
  type: "heading" | "quote" | "paragraph" | "list";
  lines: string[];
};
export function parseBlogContent(content: string): BlogBlock[] {
  return content
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .filter((part) => part.trim())
    .map((part) => {
      const lines = part.trim().split("\n");
      if (lines.every((line) => line.startsWith("- ")))
        return { type: "list", lines: lines.map((line) => line.slice(2)) };
      if (part.trim().startsWith("## "))
        return { type: "heading", lines: [part.trim().slice(3)] };
      if (lines.every((line) => line.startsWith("> ")))
        return { type: "quote", lines: lines.map((line) => line.slice(2)) };
      return { type: "paragraph", lines };
    });
}
