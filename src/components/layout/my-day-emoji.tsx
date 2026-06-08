import type { SVGProps } from "react";
import { Sun } from "lucide-react";

import { cn } from "@/lib/utils";

export function MyDayEmoji({
  className,
  ...rest
}: Omit<SVGProps<SVGSVGElement>, "children">) {
  return (
    <Sun
      className={cn("text-yellow-500", className)}
      {...(rest as SVGProps<SVGSVGElement>)}
    />
  );
}
