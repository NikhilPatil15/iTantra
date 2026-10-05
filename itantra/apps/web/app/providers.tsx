"use client";

import { useEffect } from "react";

import { useAppStore } from "@/lib/store";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const saved = window.localStorage.getItem("itantra-theme");
    if (saved === "day" || saved === "night" || saved === "auto") {
      useAppStore.getState().setTheme(saved);
    } else {
      useAppStore.getState().setTheme("auto");
    }
    void useAppStore.getState().bootstrap();
  }, []);
  return <>{children}</>;
}
