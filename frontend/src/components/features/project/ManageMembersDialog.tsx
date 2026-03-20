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
import type { ProjectMemberSummary } from '@/types/type';
import { addProjectMember, removeProjectMember } from '@/lib/api/projects';
import { toast } from 'sonner';

interface ManageMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  memberSummaries: ProjectMemberSummary[];
  currentUserId: string;
  isOwner: boolean;
  onMembersChange: (summaries: ProjectMemberSummary[]) => void;
}

export function ManageMembersDialog({
  open,
  onOpenChange,
  projectId,
  memberSummaries,
  currentUserId,
  isOwner,
  onMembersChange,
}: ManageMembersDialogProps) {
  const [email, setEmail] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [confirmUserId, setConfirmUserId] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const sortedMembers = [...memberSummaries].sort((a) =>
    a.userId === currentUserId ? -1 : 1
  );

  const handleAddMember = async () => {
    if (!email.trim()) {
      toast.error('メールアドレスを入力してください');
      return;
    }

    if (memberSummaries.some((m) => m.user?.email === email.trim())) {
      toast.error('このユーザーは既にメンバーです');
      return;
    }

    try {
      setIsAdding(true);
      const newMember = await addProjectMember(projectId, email.trim());
      onMembersChange([...memberSummaries, newMember]);
      toast.success(`${newMember.user?.name ?? email} を追加しました`);
      setEmail('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'メンバーの追加に失敗しました');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      setRemovingUserId(userId);
      await removeProjectMember(projectId, userId);
      const removed = memberSummaries.find((m) => m.userId === userId);
      onMembersChange(memberSummaries.filter((m) => m.userId !== userId));
      toast.success(`${removed?.user?.name ?? userId} を削除しました`);
      setConfirmUserId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'メンバーの削除に失敗しました');
    } finally {
      setRemovingUserId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>メンバー管理</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2 overflow-y-auto">
          {/* Add Member Section */}
          {isOwner && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                メンバーを追加
              </h3>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="メールアドレス"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void handleAddMember()}
                  disabled={isAdding}
                />
                <Button
                  onClick={() => void handleAddMember()}
                  size="sm"
                  className="shrink-0 gap-1"
                  disabled={isAdding}
                >
                  <Mail className="w-4 h-4" />
                  {isAdding ? '追加中...' : '追加'}
                </Button>
              </div>
            </div>
          )}

          {/* Members Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              メンバー ({memberSummaries.length})
            </h3>
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
              {sortedMembers.map((member) => {
                const isMe = member.userId === currentUserId;
                const name = member.user?.name ?? member.userId;

                return (
                  <div key={member.userId}>
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarImage src={member.user?.avatar} />
                        <AvatarFallback className="text-xs">
                          {name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {name}
                          {isMe && (
                            <span className="text-xs text-gray-400 ml-1">(あなた)</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {member.user?.email ?? ''}
                        </div>
                      </div>
                      {isOwner && !isMe && confirmUserId !== member.userId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 h-8 w-8 text-gray-400 hover:text-red-600"
                          onClick={() => setConfirmUserId(member.userId)}
                          disabled={removingUserId === member.userId}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    {confirmUserId === member.userId && (
                      <div className="px-3 pb-2.5 flex items-center justify-between bg-red-50 rounded-b-lg">
                        <p className="text-xs text-red-600">この操作はもとに戻せません</p>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => void handleRemove(member.userId)}
                            disabled={removingUserId === member.userId}
                          >
                            {removingUserId === member.userId ? '削除中...' : '削除'}
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
