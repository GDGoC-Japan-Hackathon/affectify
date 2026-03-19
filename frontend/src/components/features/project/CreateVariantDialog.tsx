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
import { Plus } from 'lucide-react';
import type { Variant } from '@/types/type';

interface CreateVariantDialogProps {
  variants: Variant[];
  onCreateVariant: (name: string, description: string, baseVariantId: string) => void;
}

export function CreateVariantDialog({ variants, onCreateVariant }: CreateVariantDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [baseVariant, setBaseVariant] = useState(variants.find((variant) => variant.isMain)?.id ?? variants[0]?.id ?? '');

  const handleCreate = () => {
    if (!name.trim() || !baseVariant) return;
    onCreateVariant(name, description, baseVariant);
    setOpen(false);
    setName('');
    setDescription('');
    setBaseVariant(variants.find((variant) => variant.isMain)?.id ?? variants[0]?.id ?? '');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
                  {variant.name}
                  {variant.isMain ? ' (メイン)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            キャンセル
          </Button>
          <Button onClick={handleCreate}>作成</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
