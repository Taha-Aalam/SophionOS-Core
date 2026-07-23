"use client";

interface GreetingBarProps {
  userName: string | undefined;
  activeTaskCount?: number;
}

export function GreetingBar({ userName, activeTaskCount }: GreetingBarProps) {
  const firstName = userName?.split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const headline = firstName ? `${greeting}, ${firstName}` : greeting;

  const taskPhrase =
    typeof activeTaskCount === "number"
      ? `${activeTaskCount} active task${activeTaskCount === 1 ? "" : "s"}`
      : null;

  return (
    <header className="space-y-1.5">
      <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
        {headline}
      </h1>
      <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
        {taskPhrase
          ? `${taskPhrase} in play. Load, momentum, and risk signals sit below.`
          : "Load, momentum, and risk signals for the current cycle sit below."}
      </p>
    </header>
  );
}
