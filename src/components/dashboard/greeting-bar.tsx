"use client";

interface GreetingBarProps {
  userName: string | undefined;
}

export function GreetingBar({ userName }: GreetingBarProps) {
  const firstName = userName?.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight font-heading">
          {greeting}, {firstName}
        </h1>
      </div>
    </div>
  );
}
