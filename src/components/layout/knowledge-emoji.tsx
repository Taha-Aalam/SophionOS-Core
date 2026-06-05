import type { SVGProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Knowledge Hub icon rendered as the 📚 emoji so the sidebar
 * matches the knowledge hub page header (which uses the Lucide
 * `Library` icon, which 📚 visually corresponds to). Typed to slot
 * in where a Lucide icon would.
 */
export function KnowledgeEmoji({
  className,
  ...rest
}: Omit<SVGProps<SVGSVGElement>, "children">) {
  return (
    <span
      role="img"
      aria-hidden="true"
      className={cn("inline-flex items-center justify-center leading-none", className)}
      style={{ fontSize: "1em" }}
      {...(rest as React.HTMLAttributes<HTMLSpanElement>)}
    >
      📚
    </span>
  );
}
