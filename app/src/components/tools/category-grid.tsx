"use client";

import ToolCard from "./tool-card";
import { TOOLS, type ToolCategory } from "./tools-registry";

/** Tool cards for a category page. Client-side because tool icons are components. */
export default function CategoryGrid({ category }: { category: ToolCategory }) {
  return (
    <ul className="-mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {TOOLS.filter((t) => t.category === category).map((t) => (
        <li key={t.id} className="flex">
          <ToolCard tool={t} className="w-full" />
        </li>
      ))}
    </ul>
  );
}
