"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  LogOut,
  Mail,
  Palette,
  Shield,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getMe } from "@/lib/api/users";
import { useAuth } from "@/lib/auth";

type AppUserProfile = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
};

function formatTimestamp(value?: string | null) {
  if (!value) {
    return "未取得";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "未取得";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function SettingsPage() {
  const { signOut, user: firebaseUser } = useAuth();
  const [appUser, setAppUser] = useState<AppUserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      if (!firebaseUser) {
        setLoadingProfile(false);
        return;
      }

      try {
        const response = await getMe();
        if (!active) {
          return;
        }

        setAppUser(
          response.user
            ? {
                id: response.user.id.toString(),
                name: response.user.name,
                email: response.user.email,
                avatarUrl: response.user.avatarUrl,
              }
            : null,
        );
      } catch (error) {
        if (!active) {
          return;
        }

        console.error(error);
        toast.error("プロフィール情報の取得に失敗しました");
      } finally {
        if (active) {
          setLoadingProfile(false);
        }
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [firebaseUser]);

  const displayName = appUser?.name || firebaseUser?.displayName || firebaseUser?.email || "ユーザー";
  const email = appUser?.email || firebaseUser?.email || "未設定";
  const avatarUrl = appUser?.avatarUrl || firebaseUser?.photoURL || "";
  const providerLabel = firebaseUser?.providerData?.[0]?.providerId === "google.com" ? "Google" : "Firebase";
  const createdAt = formatTimestamp(firebaseUser?.metadata.creationTime);
  const lastSignInAt = formatTimestamp(firebaseUser?.metadata.lastSignInTime);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">設定</h1>
        <p className="text-gray-600">Firebase ログインで利用しているアカウント情報と認証設定を確認します。</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" />
            アカウント
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="w-4 h-4" />
            認証
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="w-4 h-4" />
            外観
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>アカウント情報</CardTitle>
              <CardDescription>
                WhiteCoder では Firebase Authentication の情報をもとにアカウントを管理します。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={avatarUrl} />
                    <AvatarFallback>{displayName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-semibold text-gray-900">{displayName}</h2>
                      <Badge variant="secondary">{providerLabel} ログイン</Badge>
                    </div>
                    <p className="text-sm text-gray-600">{email}</p>
                    <p className="text-xs text-gray-500">
                      プロフィール画像と表示名は Google / Firebase 側の設定が反映されます。
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <Label className="text-xs text-gray-500">表示名</Label>
                  <p className="mt-2 text-sm font-medium text-gray-900">{displayName}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <Label className="text-xs text-gray-500">メールアドレス</Label>
                  <p className="mt-2 text-sm font-medium text-gray-900">{email}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <Label className="text-xs text-gray-500">アプリ内ユーザーID</Label>
                  <p className="mt-2 text-sm font-medium text-gray-900">{loadingProfile ? "読み込み中..." : appUser?.id || "未同期"}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <Label className="text-xs text-gray-500">認証プロバイダー</Label>
                  <p className="mt-2 text-sm font-medium text-gray-900">{providerLabel}</p>
                </div>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                名前やアイコンを変更したい場合は、Google アカウント側のプロフィールを更新してください。WhiteCoder 側では Firebase から同期された情報を表示しています。
              </div>

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  className="gap-2 text-red-600"
                  onClick={async () => {
                    await signOut();
                    toast.success("ログアウトしました");
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  ログアウト
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>認証情報</CardTitle>
              <CardDescription>現在のログイン方式とアカウント状態を確認します。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
                <Mail className="mt-0.5 h-5 w-5 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900">ログインメールアドレス</p>
                  <p className="text-sm text-gray-600">{email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
                <CalendarDays className="mt-0.5 h-5 w-5 text-gray-500" />
                <div className="space-y-1">
                  <p className="font-medium text-gray-900">アカウントの利用状況</p>
                  <p className="text-sm text-gray-600">初回ログイン: {createdAt}</p>
                  <p className="text-sm text-gray-600">最終ログイン: {lastSignInAt}</p>
                </div>
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                現在は {providerLabel} ログインを使用しています。パスワード変更や 2 段階認証の設定は、認証プロバイダー側のアカウント設定から行ってください。
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>外観設定</CardTitle>
              <CardDescription>今後テーマや表示密度の設定を追加する予定です。</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-600">
                現在の WhiteCoder では外観設定は未実装です。必要になったらここにテーマや表示設定を追加します。
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
