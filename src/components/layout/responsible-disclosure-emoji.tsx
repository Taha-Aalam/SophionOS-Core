import type { SVGProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Responsible Disclosure icon rendered as the 🐛 emoji, matching the per-page header
 * emoji so the Policies sidebar rows agree with the page they open.
 * Typed to slot in where a Lucide icon would.
 */
export function ResponsibleDisclosureEmoji({
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
      🐛
    </span>
  );
}
