import React from 'react';
import Image from 'next/image';

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
          <Image
            src='/brand/sophion-symbol.svg'
            alt=''
            width={56}
            height={56}
            unoptimized
            className='size-14 transition-transform duration-500 ease-[var(--ease-out-quint)] hover:scale-105 dark:hidden'
          />
          <Image
            src='/brand/sophion-symbol-reversed-white.svg'
            alt=''
            width={56}
            height={56}
            unoptimized
            className='hidden size-14 transition-transform duration-500 ease-[var(--ease-out-quint)] hover:scale-105 dark:block'
          />
          <h1 className="text-3xl font-semibold tracking-tight font-heading">SophionOS</h1>
          <p className="text-muted-foreground">Organize your life, achieve your goals.</p>
        </div>
        {children}
      </div>
    </div>
  );
}
