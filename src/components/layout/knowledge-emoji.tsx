import { Library } from "lucide-react";
import type { SVGProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Knowledge Hub icon: the Lucide `Library` icon tinted blue so the
 * sidebar matches the knowledge hub page header. Typed to slot in
 * where a Lucide icon would.
 */
export function KnowledgeEmoji({
  className,
  ...rest
}: Omit<SVGProps<SVGSVGElement>, "children">) {
  return (
    <Library
      aria-hidden="true"
      className={cn("text-blue-500", className)}
      {...rest}
    />
  );
}
