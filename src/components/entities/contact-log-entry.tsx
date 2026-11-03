"use client";

import { useState } from "react";
import type { ContactLog } from "@/lib/types/domain.types";
import { cn } from "@/lib/utils";

export interface ContactLogEntryProps {
  log: ContactLog;
}

export function formatTimeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ContactLogEntry({ log }: ContactLogEntryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const message = log.message ?? "";
  const isLong = message.length > 500;

  return (
    <div className="rounded-md border px-3 py-2">
      <p className="text-xs text-muted-foreground">{formatTimeAgo(log.created_at)}</p>
      {message && (
        <div className="mt-1">
          <p
            className={cn(
              "text-sm whitespace-pre-wrap break-words",
              isLong && !isExpanded && "line-clamp-4",
            )}
          >
            {message}
          </p>
          {isLong && (
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="text-xs text-primary font-medium hover:underline mt-1 cursor-pointer focus:outline-none"
            >
              {isExpanded ? "Show less" : "Read more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
