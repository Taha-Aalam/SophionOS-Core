"use client";

interface GreetingBarProps {
  userName: string | undefined;
  activeTaskCount?: number;
}

export function GreetingBar({ activeTaskCount }: GreetingBarProps) {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const taskPhrase =
    typeof activeTaskCount === "number"
      ? `${activeTaskCount} active task${activeTaskCount === 1 ? "" : "s"}`
      : null;

  return (
    <header className="space-y-1.5">
      <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
        {today}
      </h1>
      <p className="max-w-xl text-sm leading-relaxed text-muted-foreground transition-colors duration-200 ease-[var(--ease-out-quint)]">
        {taskPhrase
          ? `${taskPhrase} in play. Load, momentum, and risk signals sit below.`
          : "Load, momentum, and risk signals for the current cycle sit below."}
      </p>
    </header>
  );
}
