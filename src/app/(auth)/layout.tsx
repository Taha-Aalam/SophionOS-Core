import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-background p-4 text-foreground">
      {/* Ambient brand-tinted mesh — soft radial orbs, GPU-cheap, pointer-inert. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(40rem 40rem at 15% 20%, oklch(0.55 0.13 260 / 0.10), transparent 60%), radial-gradient(38rem 38rem at 85% 80%, oklch(0.6 0.12 300 / 0.08), transparent 60%)',
        }}
      />
      <div className="reveal-stagger w-full max-w-md space-y-8">
        <div className="flex flex-col items-center space-y-3 text-center">
          <div className="group flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground shadow-[0_8px_24px_oklch(0.3_0.15_260/0.35)] ring-1 ring-foreground/10 transition-transform duration-500 ease-[var(--ease-out-back)] hover:scale-105">
            L
          </div>
          <h1 className="text-3xl font-bold tracking-tight">LifeOS</h1>
          <p className="text-muted-foreground">Organize your life, achieve your goals.</p>
        </div>
        {children}
      </div>
    </div>
  );
}
