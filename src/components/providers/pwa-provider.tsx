"use client";

import { useEffect } from "react";

/**
 * PWA Provider: registers the service worker and sets up install prompt
 * handling. Renders null — the SW registration and beforeinstallprompt
 * listener are the only side effects.
 */
export function PwaProvider() {
  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js");
    }

    // Listen for beforeinstallprompt event (PWA install prompt)
    // Store it for potential UI use; currently just prevents default
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  return null;
}
