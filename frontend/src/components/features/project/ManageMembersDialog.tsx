"use client";

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Mail, Trash2, UserPlus } from 'lucide-react';
import { mockUser, mockUsers } from '@/data/mockData';
import type { User } from '@/types/type';
import { toast } from 'sonner';

interface ManageMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberIds: string[];
  onMembersChange: (memberIds: string[]) => void;
  isOwner: boolean;
}

export function ManageMembersDialog({
  open,
  onOpenChange,
  memberIds,
  onMembersChange,
  isOwner,
}: ManageMembersDialogProps) {
  const [email, setEmail] = useState('');

  const members: (User | undefined)[] = memberIds.map((id) =>
    mockUsers.find((u) => u.id === id)
  );

  // Sort: current user first
  const sortedMembers = [...members].sort((a, b) => {
    if (a?.id === mockUser.id) return -1;
    if (b?.id === mockUser.id) return 1;
    return 0;
  });

  const handleInvite = () => {
    if (!email.trim()) {
      toast.error('メールアドレスを入力してください');
      return;
    }

    const existingUser = mockUsers.find((u) => u.email === email);
    if (existingUser && memberIds.includes(existingUser.id)) {
      toast.error('このユーザーは既にメンバーです');
      return;
    }

    if (existingUser) {
      onMembersChange([...memberIds, existingUser.id]);
      toast.success(`${existingUser.name} を招待しました`);
    } else {
      toast.success(`${email} に招待を送信しました`);
    }

    setEmail('');
  };

  const [confirmUserId, setConfirmUserId] = useState<string | null>(null);

  const handleRemove = (userId: string) => {
    onMembersChange(memberIds.filter((id) => id !== userId));
    const user = mockUsers.find((u) => u.id === userId);
    toast.success(`${user?.name ?? userId} を削除しました`);
    setConfirmUserId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{isOwner ? 'メンバー管理' : 'メンバー'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2 overflow-y-auto">
          {/* Invite Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              メンバーを招待
            </h3>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="メールアドレス"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              />
              <Button onClick={handleInvite} size="sm" className="shrink-0 gap-1">
                <Mail className="w-4 h-4" />
                招待
              </Button>
            </div>
          </div>

          {/* Members Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              メンバー ({memberIds.length})
            </h3>
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
              {sortedMembers.map((member) => {
                if (!member) return null;
                const isMe = member.id === mockUser.id;

                return (
                  <div key={member.id}>
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback className="text-xs">
                          {member.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {member.name}
                          {isMe && (
                            <span className="text-xs text-gray-400 ml-1">(あなた)</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {member.email}
                        </div>
                      </div>
                      {isOwner && !isMe && confirmUserId !== member.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 h-8 w-8 text-gray-400 hover:text-red-600"
                          onClick={() => setConfirmUserId(member.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    {confirmUserId === member.id && (
                      <div className="px-3 pb-2.5 flex items-center justify-between bg-red-50 rounded-b-lg">
                        <p className="text-xs text-red-600">この操作はもとに戻せません</p>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleRemove(member.id)}
                          >
                            削除
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setConfirmUserId(null)}
                          >
                            取消
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
