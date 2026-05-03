import React from "react";
import { cn } from "@/lib/utils";

interface GalleryGridProps {
  children: React.ReactNode;
  className?: string;
}

export function GalleryGrid({ children, className }: GalleryGridProps) {
  return (
    <div
      className={cn(
        "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        className
      )}
    >
      {children}
    </div>
  );
}