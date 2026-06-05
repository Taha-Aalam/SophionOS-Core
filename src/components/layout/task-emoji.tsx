import type { SVGProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Tasks icon rendered as the ☑️ emoji (matches the rollup on
 * `area-card`) so the sidebar matches the tasks page header.
 * Typed to slot in where a Lucide icon would.
 */
export function TaskEmoji({
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
      ☑️
    </span>
  );
}
