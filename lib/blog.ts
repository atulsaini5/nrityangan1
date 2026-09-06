import { BLOG_BUCKET, type BlogPost } from "./blogModel";

export const blogEndpoint = `${(import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "")}/functions/v1/blog`;
export const blogImageUrl = (path: string) =>
  path
    ? `${(import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "")}/storage/v1/object/public/${BLOG_BUCKET}/${path}`
    : "";

export async function getBlogs(
  options: { slug?: string; page?: number },
  signal?: AbortSignal,
): Promise<{ posts: BlogPost[]; hasMore: boolean }> {
  const query = new URLSearchParams(
    options.slug ? { slug: options.slug } : { page: String(options.page || 0) },
  );
  const response = await fetch(`${blogEndpoint}?${query}`, { signal });
  if (!response.ok)
    throw new Error("The journal could not be loaded. Please try again.");
  return response.json();
}

const toWebP = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob?.type === "image/webp"
          ? resolve(blob)
          : reject(
              new Error(
                "This browser cannot create WebP images. Please use a current Chrome, Edge, Safari or Firefox.",
              ),
            ),
      "image/webp",
      quality,
    );
  });

export async function optimizeBlogImage(
  file: File,
): Promise<{ hero: Blob; thumbnail: Blob }> {
  if (
    !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)
  )
    throw new Error("Choose a JPEG, PNG, WebP or AVIF photo.");
  if (file.size > 20 * 1024 * 1024)
    throw new Error("Choose a photo smaller than 20 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    if (
      !bitmap.width ||
      !bitmap.height ||
      bitmap.width * bitmap.height > 50000000
    )
      throw new Error("Choose a photo with fewer than 50 megapixels.");
    const resize = async (max: number, byteLimit: number) => {
      const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context)
        throw new Error("Image processing is unavailable in this browser.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.82, 0.72, 0.6, 0.45]) {
        const blob = await toWebP(canvas, quality);
        if (blob.size <= byteLimit) return blob;
      }
      throw new Error(
        "This photo is too detailed to compress. Please choose a smaller photo.",
      );
    };
    return {
      hero: await resize(1600, 1024 * 1024),
      thumbnail: await resize(640, 256 * 1024),
    };
  } finally {
    bitmap.close();
  }
}

export const blobBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(new Error("Could not read the photo."));
    reader.readAsDataURL(blob);
  });
