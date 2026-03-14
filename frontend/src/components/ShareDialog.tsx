"use client";

import { useState } from 'react';
import { Project, ProjectVisibility } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Lock,
  Users,
  Copy,
  Check,
  Mail,
} from 'lucide-react';
import { toast } from 'sonner';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  onUpdateShareSettings: (settings: Partial<Project['shareSettings']>) => void;
}

export function ShareDialog({ open, onOpenChange, project, onUpdateShareSettings }: ShareDialogProps) {
  const [visibility, setVisibility] = useState<ProjectVisibility>(project.shareSettings.visibility);
  const [copied, setCopied] = useState(false);
  const [emailToInvite, setEmailToInvite] = useState('');

  const handleCopyLink = () => {
    const shareLink = `https://codedesign.app/share/${project.id}`;
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    toast.success('リンクをコピーしました');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVisibilityChange = (newVisibility: ProjectVisibility) => {
    setVisibility(newVisibility);
    onUpdateShareSettings({ visibility: newVisibility });

    const messages = {
      private: 'プロジェクトを非公開にしました',
      teams: 'チームメンバーと共有しました',
    };
    toast.success(messages[newVisibility]);
  };

  const handleInvite = () => {
    if (!emailToInvite.trim()) {
      toast.error('メールアドレスを入力してください');
      return;
    }

    toast.success(`${emailToInvite} を招待しました`);
    setEmailToInvite('');
  };

  const visibilityOptions = [
    {
      value: 'private' as const,
      label: '非公開',
      description: '自分だけがアクセスできます',
      icon: Lock,
    },
    {
      value: 'teams' as const,
      label: 'チーム',
      description: 'チームメンバーがアクセスできます',
      icon: Users,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>プロジェクトを共有</DialogTitle>
          <DialogDescription>
            プロジェクトの公開設定を管理し、メンバーを招待します
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Visibility Settings */}
          <div className="space-y-3">
            <Label>公開範囲</Label>
            <div className="grid grid-cols-1 gap-2">
              {visibilityOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = visibility === option.value;

                return (
                  <button
                    key={option.value}
                    onClick={() => handleVisibilityChange(option.value)}
                    className={`flex items-start gap-3 p-4 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mt-0.5 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{option.label}</div>
                      <div className="text-sm text-gray-600">{option.description}</div>
                    </div>
                    {isSelected && (
                      <Check className="w-5 h-5 text-blue-600" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Share Link */}
          {visibility === 'teams' && (
            <div className="space-y-3">
              <Label>共有リンク</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`https://codedesign.app/share/${project.id}`}
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                  className="shrink-0"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}

          {/* Invite Members */}
          <div className="space-y-3">
            <Label>メンバーを招待</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="メールアドレス"
                value={emailToInvite}
                onChange={(e) => setEmailToInvite(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              />
              <Button onClick={handleInvite}>
                <Mail className="w-4 h-4 mr-2" />
                招待
              </Button>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
