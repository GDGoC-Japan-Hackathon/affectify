"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { syncMe } from "@/lib/api/users";

export default function LoginPage() {
  const router = useRouter();
  const { signInWithGoogle } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setSubmitting(true);
    setError(null);

    try {
      await signInWithGoogle();
      // アプリに入る前に backend 側の users レコードを同期しておく。
      await syncMe();
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ログインに失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f6efe3,_#d6e7f4_45%,_#f7f7f2)] flex items-center justify-center p-6">
      <Card className="w-full max-w-md border-black/10 shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl">WhiteCoder にログイン</CardTitle>
          <CardDescription>
            Google アカウントでサインインしてダッシュボードに入ります。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full" onClick={handleLogin} disabled={submitting}>
            {submitting ? "ログイン中..." : "Google でログイン"}
          </Button>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </CardContent>
      </Card>
    </main>
  );
}
