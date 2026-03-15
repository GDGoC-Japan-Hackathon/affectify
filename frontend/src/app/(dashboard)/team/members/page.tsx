"use client";

import { mockTeams, mockUser } from '@/data/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  UserPlus,
  Mail,
  MoreVertical,
  Search,
  LogOut,
} from 'lucide-react';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function TeamMembers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const currentTeam = mockTeams[0];
  const filteredMembers = currentTeam.members.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLeaveTeam = () => {
    // TODO: LeaveTeam RPC呼び出し
    console.log('Leaving team:', currentTeam.id);
  };

  const handleInvite = () => {
    // Handle invite logic
    console.log('Inviting:', inviteEmail);
    setInviteEmail('');
    setIsInviteOpen(false);
  };

  return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">メンバー管理</h1>
            <p className="text-gray-600">{currentTeam.name}のメンバー</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="メンバーを検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
              <DialogTrigger className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 gap-2">
                  <UserPlus className="w-4 h-4" />
                  メンバーを招待
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>メンバーを招待</DialogTitle>
                  <DialogDescription>
                    チームに招待するメンバーのメールアドレスを入力してください
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">メールアドレス</label>
                    <Input
                      type="email"
                      placeholder="example@email.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleInvite} className="w-full gap-2">
                    <Mail className="w-4 h-4" />
                    招待を送信
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Members List */}
          <Card>
            <CardHeader>
              <CardTitle>チームメンバー ({filteredMembers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredMembers.map((member) => {
                  const isCurrentUser = member.id === mockUser.id;

                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback>{member.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900">
                              {member.name}
                              {isCurrentUser && (
                                <span className="ml-2 text-sm text-gray-500">(あなた)</span>
                              )}
                            </h3>
                          </div>
                          <p className="text-sm text-gray-500">{member.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {isCurrentUser ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-1.5"
                            onClick={handleLeaveTeam}
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            脱退
                          </Button>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent">
                                <MoreVertical className="w-4 h-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>プロフィールを表示</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  );
                })}

                {filteredMembers.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    メンバーが見つかりませんでした
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Team Info */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>チーム情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">チーム名</span>
                <span className="text-sm font-medium text-gray-900">
                  {currentTeam.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">作成日</span>
                <span className="text-sm font-medium text-gray-900">
                  {currentTeam.createdAt.toLocaleDateString('ja-JP')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">メンバー数</span>
                <span className="text-sm font-medium text-gray-900">
                  {currentTeam.members.length}人
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
  );
}
