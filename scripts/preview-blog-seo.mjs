import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import handler from "../api/journal.mjs";

// Serves the exact production renderer and built assets for browser verification.
const root = resolve("dist");
createServer(async (req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  if (pathname === "/sitemap.xml" || pathname.startsWith("/blog"))
    return handler(req, res);
  const path = resolve(
    root,
    `.${pathname === "/" || pathname === "/admin" ? "/index.html" : pathname}`,
  );
  if (!path.startsWith(root + sep)) {
    res.writeHead(404);
    res.end();
    return;
  }
  try {
    const bytes = await readFile(path);
    res.setHeader(
      "Content-Type",
      path.endsWith(".css")
        ? "text/css"
        : path.endsWith(".js")
          ? "application/javascript"
          : path.endsWith(".html")
            ? "text/html"
            : "application/octet-stream",
    );
    res.end(bytes);
  } catch {
    res.writeHead(404);
    res.end();
  }
}).listen(4175, "127.0.0.1", () =>
  console.log("SEO preview listening on http://127.0.0.1:4175"),
);
