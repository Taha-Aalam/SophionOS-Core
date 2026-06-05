import type { SVGProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Areas icon rendered as the 🗺️ emoji so the sidebar matches the
 * areas page header. Typed to slot in where a Lucide icon would.
 */
export function AreaEmoji({
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
      🗺️
    </span>
  );
}
