"use client";

import React, { useMemo, useState } from "react";
import { Link as LinkIcon, Search } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface LinkEntityDialogProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  emptyMessage: string;
  candidates: T[];
  getKey: (entity: T) => string;
  getSearchText: (entity: T) => string;
  renderItem: (entity: T) => React.ReactNode;
  onLink: (entity: T) => void;
}

export function LinkEntityDialog<T>({
  open,
  onOpenChange,
  title,
  emptyMessage,
  candidates,
  getKey,
  getSearchText,
  renderItem,
  onLink,
}: LinkEntityDialogProps<T>) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((entity) =>
      getSearchText(entity).toLowerCase().includes(q),
    );
  }, [candidates, query, getSearchText]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setQuery("");
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="pl-8"
              />
            </div>
            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground">No matches.</p>
              ) : (
                filtered.map((entity) => (
                  <button
                    key={getKey(entity)}
                    type="button"
                    onClick={() => {
                      onLink(entity);
                      setQuery("");
                    }}
                    className="flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/40"
                  >
                    <LinkIcon className="mt-0.5 size-4 text-muted-foreground" />
                    <div className="min-w-0 flex-1">{renderItem(entity)}</div>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
