"use client";

import { ReactNode } from "react";

import { AuthProvider } from "@/lib/auth";
import { Toaster } from "sonner";

type AppProviderProps = {
  children: ReactNode;
};

export function AppProvider({ children }: AppProviderProps) {
  return (
    <AuthProvider>
      {children}
      <Toaster richColors position="top-center" />
    </AuthProvider>
  );
}
