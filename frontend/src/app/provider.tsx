"use client";

import { ReactNode } from "react";

import { AuthProvider } from "@/lib/auth";

type AppProviderProps = {
  children: ReactNode;
};

export function AppProvider({ children }: AppProviderProps) {
  return <AuthProvider>{children}</AuthProvider>;
}
