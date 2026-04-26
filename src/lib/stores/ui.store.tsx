"use client";

import React from "react";
import { create } from "zustand";

interface UIState {
  isDesktopSidebarOpen: boolean;
  isMobileNavOpen: boolean;
  pageTitle: string;
  setPageTitle: (title: string) => void;
  toggleDesktopSidebar: () => void;
  openMobileNav: () => void;
  closeSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isDesktopSidebarOpen: true,
  isMobileNavOpen: false,
  pageTitle: "",
  setPageTitle: (title) => set({ pageTitle: title }),
  toggleDesktopSidebar: () =>
    set((state) => ({ isDesktopSidebarOpen: !state.isDesktopSidebarOpen })),
  openMobileNav: () => set({ isMobileNavOpen: true }),
  closeSidebar: () => set({ isMobileNavOpen: false }),
}));

export function UIProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
