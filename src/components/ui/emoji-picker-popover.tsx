"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// @emoji-mart/react ships default-only export with `any` prop types.
const EmojiPicker = dynamic(
  () => import("@emoji-mart/react").then((m) => m.default),
  {
    ssr: false,
    // Reserve the picker's footprint so the popover doesn't resize/jump when
    // the lazy chunk resolves.
    loading: () => <div className="h-[435px] w-[352px]" aria-hidden="true" />,
  },
) as unknown as React.ComponentType<{
  data: () => Promise<unknown>;
  theme?: "light" | "dark" | "auto";
  previewPosition?: "top" | "bottom" | "none";
  skinTonePosition?: "top" | "bottom" | "none" | "preview";
  accentColor?: string;
  onEmojiSelect?: (emoji: { native: string }) => void;
}>;

// Module-scoped so the `data` prop keeps a STABLE reference across renders.
// emoji-mart re-initializes its whole index whenever `data` changes identity;
// an inline `async () => ...` made it re-init on every parent re-render
// (e.g. each keystroke in the area form), which is what made the dropdown
// feel buggy.
const loadEmojiData = async () => (await import("@emoji-mart/data")).default;

interface EmojiPickerPopoverProps {
  value: string | null;
  onChange: (emoji: string) => void;
  align?: "start" | "center" | "end";
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function EmojiPickerPopover({
  value,
  onChange,
  align = "start",
  placeholder = "Pick an icon",
  disabled = false,
  className,
}: EmojiPickerPopoverProps) {
  const [open, setOpen] = React.useState(false);
  // Read the accent color from the CSS variable on first render so the
  // picker matches the active theme without a post-mount setState cycle.
  const [accent] = React.useState(() => {
    if (typeof window === "undefined") return "#6366F1";
    return (
      getComputedStyle(document.documentElement)
        .getPropertyValue("--primary")
        .trim() || "#6366F1"
    );
  });

  // Warm both lazy chunks (@emoji-mart/react + @emoji-mart/data) as soon as
  // the trigger is hovered or focused, so the chunks resolve BEFORE the user
  // opens the popover. Previously the dynamic import only began when the
  // popover mounted its content, so the first open always showed the loading
  // placeholder and then flashed in the real picker — the core "buggy
  // dropdown" symptom. `idleCallback` keeps the warm-up off the critical
  // render path on first paint.
  const warmChunks = React.useCallback(() => {
    void loadEmojiData();
    void import("@emoji-mart/react");
  }, []);
  const warmOnIdle = React.useCallback(() => {
    if (typeof window === "undefined") return;
    if ("requestIdleCallback" in window) {
      (window as Window).requestIdleCallback(() => warmChunks());
    } else {
      warmChunks();
    }
  }, [warmChunks]);

  const handleSelect = React.useCallback(
    (emoji: { native: string }) => {
      onChange(emoji.native);
      setOpen(false);
    },
    [onChange],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onFocus={warmOnIdle}
        onMouseEnter={warmOnIdle}
        onTouchStart={warmOnIdle}
        className={cn(
          "inline-flex h-10 min-w-[10rem] items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 text-sm transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      >
        <span className="flex items-center gap-2 truncate">
          {value ? (
            <span className="text-lg leading-none">{value}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 opacity-60 transition-transform duration-200 ease-[var(--ease-out-quint)]",
            open && "rotate-180",
          )}
        />
      </PopoverTrigger>
      <PopoverContent align={align} sideOffset={8} className="w-[352px] p-0">
        <div role="dialog" aria-label="Pick an emoji">
          <EmojiPicker
            data={loadEmojiData}
            theme="auto"
            previewPosition="none"
            skinTonePosition="none"
            accentColor={accent}
            onEmojiSelect={handleSelect}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
