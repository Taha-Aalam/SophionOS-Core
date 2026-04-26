import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-bold text-2xl">
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
