"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS, STATUS_FALLBACK } from "@/lib/constants/entity-colors";

const STATUS_LABELS: Record<string, string> = {
  inbox:      "Inbox",
  todo:       "Todo",
  in_progress:"In Progress",
  completed:  "Done",
  archived:   "Archived",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const [flashing, setFlashing] = useState(false);
  const prevStatus = useRef(status);

  useEffect(() => {
    if (prevStatus.current !== status) {
      prevStatus.current = status;
      setFlashing(true);
      const timer = setTimeout(() => setFlashing(false), 400);
      return () => clearTimeout(timer);
    }
  }, [status]);

  return (
    <Badge
      variant="secondary"
      className={cn(
        "text-xs font-medium",
        STATUS_COLORS[status] ?? STATUS_FALLBACK,
        flashing && "badge-flash",
        className
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
