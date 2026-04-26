"use client";

import React from "react";
import { create } from "zustand";

interface UIState {
  isDesktopSidebarOpen: boolean;
  isMobileNavOpen: boolean;
  pageTitle: string;
  commandPaletteOpen: boolean;
  setPageTitle: (title: string) => void;
  toggleDesktopSidebar: () => void;
  openMobileNav: () => void;
  closeSidebar: () => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isDesktopSidebarOpen: true,
  isMobileNavOpen: false,
  pageTitle: "",
  commandPaletteOpen: false,
  setPageTitle: (title) => set({ pageTitle: title }),
  toggleDesktopSidebar: () =>
    set((state) => ({ isDesktopSidebarOpen: !state.isDesktopSidebarOpen })),
  openMobileNav: () => set({ isMobileNavOpen: true }),
  closeSidebar: () => set({ isMobileNavOpen: false }),
  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),
  toggleCommandPalette: () =>
    set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
}));

export function UIProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
