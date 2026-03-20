"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { DashboardLayout } from "@/components/layout/sidebar";
import { useAuth } from "@/lib/auth";

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { loading, user } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      // ダッシュボード配下は private route として扱う。
      router.replace("/login");
    }
  }, [loading, router, user]);

  if (loading || !user) {
    return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">認証状態を確認中...</div>;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
