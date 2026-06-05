import type { SVGProps } from "react";

import { cn } from "@/lib/utils";

/**
 * My Day icon rendered as the ☀️ emoji so the sidebar matches the
 * my-day page header (which uses the Lucide `Sun` icon, which ☀️
 * visually corresponds to). Typed to slot in where a Lucide icon
 * would.
 */
export function MyDayEmoji({
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
      ☀️
    </span>
  );
}
