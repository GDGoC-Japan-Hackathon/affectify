"use client";

import { useState } from 'react';
import { mockUser } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Bell,
  Shield,
  Palette,
  Upload,
  Save,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const [user, setUser] = useState(mockUser);
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: true,
    weeklyReport: false,
    analysisAlerts: true,
  });

  const handleSaveProfile = () => {
    toast.success('プロフィールを保存しました');
  };

  const handleSaveNotifications = () => {
    toast.success('通知設定を保存しました');
  };

  return (
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">設定</h1>
          <p className="text-gray-600">
            アカウント設定とプリファレンスを管理します
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4" />
              プロフィール
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              通知
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="w-4 h-4" />
              セキュリティ
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="w-4 h-4" />
              外観
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>プロフィール情報</CardTitle>
                <CardDescription>
                  あなたのプロフィール情報を更新します
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>{user.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Upload className="w-4 h-4" />
                      画像を変更
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">
                      JPG、PNG、最大5MB
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">名前</Label>
                    <Input
                      id="name"
                      value={user.name}
                      onChange={(e) => setUser({ ...user, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">メールアドレス</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user.email}
                      onChange={(e) => setUser({ ...user, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">自己紹介</Label>
                  <Textarea
                    id="bio"
                    placeholder="自己紹介を入力..."
                    rows={4}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline">キャンセル</Button>
                  <Button onClick={handleSaveProfile} className="gap-2">
                    <Save className="w-4 h-4" />
                    保存
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>通知設定</CardTitle>
                <CardDescription>
                  受け取る通知をカスタマイズします
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>メール通知</Label>
                      <p className="text-sm text-gray-500">
                        重要な更新をメールで受け取る
                      </p>
                    </div>
                    <Switch
                      checked={notifications.emailNotifications}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, emailNotifications: checked })
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>プッシュ通知</Label>
                      <p className="text-sm text-gray-500">
                        ブラウザのプッシュ通知を受け取る
                      </p>
                    </div>
                    <Switch
                      checked={notifications.pushNotifications}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, pushNotifications: checked })
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>週次レポート</Label>
                      <p className="text-sm text-gray-500">
                        毎週のアクティビティサマリーを受け取る
                      </p>
                    </div>
                    <Switch
                      checked={notifications.weeklyReport}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, weeklyReport: checked })
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>AI分析アラート</Label>
                      <p className="text-sm text-gray-500">
                        設計上の問題が検出された時に通知
                      </p>
                    </div>
                    <Switch
                      checked={notifications.analysisAlerts}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, analysisAlerts: checked })
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline">キャンセル</Button>
                  <Button onClick={handleSaveNotifications} className="gap-2">
                    <Save className="w-4 h-4" />
                    保存
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>パスワード変更</CardTitle>
                <CardDescription>
                  アカウントのセキュリティを保護します
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">現在のパスワード</Label>
                  <Input id="current-password" type="password" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">新しいパスワード</Label>
                  <Input id="new-password" type="password" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">パスワード確認</Label>
                  <Input id="confirm-password" type="password" />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline">キャンセル</Button>
                  <Button className="gap-2">
                    <Save className="w-4 h-4" />
                    パスワードを変更
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-600">危険な操作</CardTitle>
                <CardDescription>
                  この操作は元に戻せません
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" className="gap-2">
                  <Trash2 className="w-4 h-4" />
                  アカウントを削除
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>外観設定</CardTitle>
                <CardDescription>
                  アプリケーションの見た目をカスタマイズします
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>テーマ</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <button className="p-4 border-2 border-blue-600 rounded-lg bg-white">
                      <div className="aspect-video bg-gray-100 rounded mb-2" />
                      <p className="text-sm font-medium">ライト</p>
                    </button>
                    <button className="p-4 border-2 border-gray-200 rounded-lg bg-white">
                      <div className="aspect-video bg-gray-800 rounded mb-2" />
                      <p className="text-sm font-medium">ダーク</p>
                    </button>
                    <button className="p-4 border-2 border-gray-200 rounded-lg bg-white">
                      <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-800 rounded mb-2" />
                      <p className="text-sm font-medium">自動</p>
                    </button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>アクセントカラー</Label>
                  <div className="flex gap-2">
                    {['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'].map(color => (
                      <button
                        key={color}
                        className="w-10 h-10 rounded-lg border-2 border-transparent hover:border-gray-300"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline">キャンセル</Button>
                  <Button className="gap-2">
                    <Save className="w-4 h-4" />
                    保存
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
