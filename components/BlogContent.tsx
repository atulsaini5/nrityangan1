import React from "react";
import { parseBlogContent } from "../lib/blogModel";

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
