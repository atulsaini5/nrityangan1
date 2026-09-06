import React from "react";
import { parseBlogContent } from "../lib/blogModel";
import { blogImageUrl } from "../lib/blog";

function inline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={index}>{part.slice(1, -1)}</em>;
    return part;
  });
}

export default function BlogContent({ content }: { content: string }) {
  return (
    <div className="blog-prose">
      {parseBlogContent(content).map((block, index) => {
        if (block.type === "image")
          return (
            <figure key={index} className="my-10">
              <img
                src={blogImageUrl(block.lines[1])}
                alt={block.lines[0]}
                loading="lazy"
                decoding="async"
                className="w-full h-auto rounded-xl"
              />
              <figcaption className="mt-3 text-sm leading-relaxed text-slate-500">
                {block.lines[0]}
              </figcaption>
            </figure>
          );
        if (block.type === "link")
          return (
            <p key={index}>
              <a
                href={block.lines[1]}
                className="text-rose-700 underline underline-offset-4 hover:text-rose-900"
              >
                {block.lines[0]} ↗
              </a>
            </p>
          );
        if (block.type === "heading")
          return <h2 key={index}>{inline(block.lines[0])}</h2>;
        if (block.type === "quote")
          return (
            <blockquote key={index}>
              {inline(block.lines.join("\n"))}
            </blockquote>
          );
        if (block.type === "list")
          return (
            <ul key={index}>
              {block.lines.map((line, i) => (
                <li key={i}>{inline(line)}</li>
              ))}
            </ul>
          );
        return <p key={index}>{inline(block.lines.join("\n"))}</p>;
      })}
    </div>
  );
}
