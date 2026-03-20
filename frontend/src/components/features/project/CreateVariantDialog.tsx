"use client";

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';
import type { DesignGuide, Variant } from '@/types/type';
import { listDesignGuides } from '@/lib/api/design-guides';

interface CreateVariantDialogProps {
  variants: Variant[];
  onCreateVariant: (name: string, description: string, baseVariantId: string, designGuideId?: string) => void;
}

export function CreateVariantDialog({ variants, onCreateVariant }: CreateVariantDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [baseVariant, setBaseVariant] = useState(variants.find((v) => v.isMain)?.id ?? variants[0]?.id ?? '');
  const [designGuideId, setDesignGuideId] = useState('none');
  const [templates, setTemplates] = useState<DesignGuide[]>([]);
  const [myGuides, setMyGuides] = useState<DesignGuide[]>([]);

  const handleOpen = (next: boolean) => {
    setOpen(next);
    if (next && templates.length === 0 && myGuides.length === 0) {
      Promise.all([
        listDesignGuides({ onlyTemplates: true }),
        listDesignGuides({ createdByMe: true }),
      ]).then(([tmpl, mine]) => {
        setTemplates(tmpl);
        const tmplIds = new Set(tmpl.map(g => g.id));
        setMyGuides(mine.filter(g => !tmplIds.has(g.id)));
      }).catch(() => {});
    }
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    const resolvedDesignGuideId =
      designGuideId !== 'none' && /^\d+$/.test(designGuideId) ? designGuideId : undefined;
    onCreateVariant(name, description, baseVariant, resolvedDesignGuideId);
    setOpen(false);
    setName('');
    setDescription('');
    setDesignGuideId('none');
    setBaseVariant(variants.find((v) => v.isMain)?.id ?? variants[0]?.id ?? '');
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 gap-2">
        <Plus className="w-4 h-4" />
        新規設計案
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新しい設計案を作成</DialogTitle>
          <DialogDescription>
            既存の設計案から分岐して、新しいバリエーションを作成します
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="variant-name">設計案名</Label>
            <Input
              id="variant-name"
              placeholder="例: パフォーマンス最適化案"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="variant-description">説明</Label>
            <Textarea
              id="variant-description"
              placeholder="この設計案の目的や特徴を説明..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          {variants.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="base-variant">ベース設計案</Label>
              <select
                id="base-variant"
                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm"
                value={baseVariant}
                onChange={(e) => setBaseVariant(e.target.value)}
              >
                {variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.name}{variant.isMain ? ' (メイン)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="design-guide">設計書</Label>
            <Select value={designGuideId} onValueChange={(v) => setDesignGuideId(v ?? 'none')}>
              <SelectTrigger id="design-guide">
                <SelectValue placeholder="設計書を選択">
                  {[...templates, ...myGuides].find(g => g.id === designGuideId)?.name ?? '選択しない'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">選択しない</SelectItem>
                {templates.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>テンプレート</SelectLabel>
                    {templates.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {myGuides.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>マイ設計書</SelectLabel>
                    {myGuides.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            キャンセル
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim()}>作成</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
