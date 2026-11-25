"use client";

import { useI18n } from "@/components/providers/i18n-provider";

interface GreetingBarProps {
  userName: string | undefined;
  activeTaskCount?: number;
}

export function GreetingBar({ activeTaskCount }: GreetingBarProps) {
  const { t, tp, formatDate } = useI18n();
  const today = formatDate(new Date(), {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="space-y-1.5">
      <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
        {today}
      </h1>
      <p className="max-w-xl text-sm leading-relaxed text-muted-foreground transition-colors duration-200 ease-[var(--ease-out-quint)]">
        {typeof activeTaskCount === "number"
          ? tp("dashboard.greeting.activeTasks", activeTaskCount)
          : t("dashboard.greeting.fallback")}
      </p>
    </header>
  );
}
