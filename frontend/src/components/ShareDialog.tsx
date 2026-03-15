"use client";

import { useState } from 'react';
import { Project } from '@/types/type';
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
import {
  Copy,
  Check,
  Mail,
} from 'lucide-react';
import { toast } from 'sonner';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
}

export function ShareDialog({ open, onOpenChange, project }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const [emailToInvite, setEmailToInvite] = useState('');

  const handleCopyLink = () => {
    const shareLink = `https://codedesign.app/share/${project.id}`;
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    toast.success('リンクをコピーしました');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInvite = () => {
    if (!emailToInvite.trim()) {
      toast.error('メールアドレスを入力してください');
      return;
    }

    toast.success(`${emailToInvite} を招待しました`);
    setEmailToInvite('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>プロジェクトを共有</DialogTitle>
          <DialogDescription>
            メンバーを招待してプロジェクトを共有します
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Share Link */}
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

          {/* Current Members */}
          <div className="space-y-3">
            <Label>現在のメンバー ({project.members.length}人)</Label>
            <div className="text-sm text-gray-500">
              {project.members.map((id) => (
                <div key={id} className="py-1">{id}</div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
