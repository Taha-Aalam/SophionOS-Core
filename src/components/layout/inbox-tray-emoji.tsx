import type { SVGProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Inbox icon rendered as the 📥 emoji so the sidebar matches the
 * inbox page header. Typed to accept the same `className` /
 * size-related props as a Lucide icon so it slots into existing
 * NavLink wiring without changes.
 */
export function InboxTrayEmoji({
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
      📥
    </span>
  );
}
