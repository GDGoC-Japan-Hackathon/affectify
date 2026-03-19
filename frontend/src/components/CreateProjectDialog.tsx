"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Code2, FolderOpen, Settings } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createProject } from '@/lib/api/projects';
import { createVariant } from '@/lib/api/variants';
import { mockDesignGuides } from '@/data/mockDesignGuides';
import { toast } from 'sonner';

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function CreateProjectDialog({ open, onOpenChange, onCreated }: CreateProjectDialogProps) {
  const router = useRouter();
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [variantName, setVariantName] = useState('main');
  const [designGuideId, setDesignGuideId] = useState<string>('none');
  const [selectedFolderName, setSelectedFolderName] = useState<string | null>(null);
  const [selectedFolderFileCount, setSelectedFolderFileCount] = useState<number>(0);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!projectName.trim()) {
      toast.error('プロジェクト名を入力してください');
      return;
    }

    try {
      setIsSubmitting(true);
      const project = await createProject({
        name: projectName.trim(),
        description: description.trim(),
      });

      const shouldCreateVariant = showAdvancedOptions;
      const resolvedDesignGuideId =
        designGuideId !== 'none' && /^\d+$/.test(designGuideId) ? designGuideId : undefined;

      if (shouldCreateVariant) {
        const variant = await createVariant({
          projectId: project.id,
          name: variantName.trim() || 'main',
          description: '',
          baseDesignGuideId: resolvedDesignGuideId,
        });

        if (selectedFolderName) {
          toast.info('フォルダの取り込みは次に接続します。設計案のみ先に作成しました。');
        }

        toast.success(`プロジェクト「${project.name}」と設計案「${variant.name}」を作成しました`);
        onOpenChange(false);
        onCreated?.();

        setProjectName('');
        setDescription('');
        setVariantName('main');
        setDesignGuideId('none');
        setSelectedFolderName(null);
        setSelectedFolderFileCount(0);

        router.push(`/workspace/${variant.id}`);
        return;
      }

      toast.success(`プロジェクト「${project.name}」を作成しました`);

      onOpenChange(false);
      onCreated?.();

      setProjectName('');
      setDescription('');
      setVariantName('main');
      setDesignGuideId('none');
      setSelectedFolderName(null);
      setSelectedFolderFileCount(0);

      router.push(`/project/${project.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'プロジェクトの作成に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFolderSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      setSelectedFolderName(null);
      setSelectedFolderFileCount(0);
      return;
    }

    const firstPath = files[0].webkitRelativePath;
    const folderName = firstPath ? firstPath.split('/')[0] : files[0].name;
    setSelectedFolderName(folderName);
    setSelectedFolderFileCount(files.length);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新規プロジェクト作成</DialogTitle>
          <DialogDescription>
            プロジェクトの基本情報を入力してください
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* プロジェクト名 */}
          <div className="space-y-2">
            <Label htmlFor="project-name">
              プロジェクト名 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="project-name"
              placeholder="無題のプロジェクト"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>

          {/* 説明 */}
          <div className="space-y-2">
            <Label htmlFor="description">説明</Label>
            <Textarea
              id="description"
              placeholder="プロジェクトの概要を入力..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvancedOptions((prev) => !prev)}
              className={`flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors ${
                showAdvancedOptions ? 'bg-indigo-50' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  showAdvancedOptions ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  <Settings className="size-4" />
                </div>
                <div>
                  <p className={`font-medium text-sm ${showAdvancedOptions ? 'text-indigo-900' : 'text-slate-900'}`}>
                    初期設計案の詳細設定
                  </p>
                  <p className="text-xs text-slate-500">
                    設計書やインポートフォルダを先に選んでおけます
                  </p>
                </div>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${
                showAdvancedOptions ? 'rotate-180 text-indigo-500' : 'text-slate-400'
              }`} />
            </button>

            {showAdvancedOptions && (
              <div className="space-y-4 border-t border-slate-200 px-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="variant-name">初期設計案名</Label>
                  <Input
                    id="variant-name"
                    value={variantName}
                    onChange={(e) => setVariantName(e.target.value)}
                    placeholder="main"
                  />
                  <p className="text-xs text-slate-500">
                    ここで指定した名前で、プロジェクト作成後に初期設計案を続けて作成します。
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="design-guide">設計書</Label>
                  <Select value={designGuideId} onValueChange={(value) => setDesignGuideId(value ?? 'none')}>
                    <SelectTrigger id="design-guide" className="w-full">
                      <SelectValue placeholder="設計書を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">選択しない</SelectItem>
                      {mockDesignGuides.map((guide) => (
                        <SelectItem key={guide.id} value={guide.id}>
                          {guide.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">
                    選択した設計書を初期設計案のベースとして適用します。
                  </p>
                </div>

                <div className="space-y-3">
                  <Label>インポートフォルダ</Label>
                  {!selectedFolderName ? (
                    <div className="rounded-lg border-2 border-dashed border-slate-300 p-4 text-center">
                      <FolderOpen className="mx-auto mb-2 h-8 w-8 text-slate-400" />
                      <p className="mb-3 text-sm text-slate-600">
                        プロジェクト作成後に取り込みたいフォルダを先に選択できます
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const input = document.getElementById('project-folder-input') as HTMLInputElement | null;
                          input?.click();
                        }}
                      >
                        フォルダを選択
                      </Button>
                      <input
                        id="project-folder-input"
                        type="file"
                        className="hidden"
                        /* @ts-expect-error webkitdirectory is not in the type definitions */
                        webkitdirectory=""
                        multiple
                        onChange={handleFolderSelect}
                      />
                    </div>
                  ) : (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-blue-100 p-2">
                          <Code2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{selectedFolderName}</p>
                          <p className="text-sm text-slate-600">{selectedFolderFileCount} ファイル</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedFolderName(null);
                            setSelectedFolderFileCount(0);
                          }}
                        >
                          変更
                        </Button>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-slate-500">
                    現在はフォルダ選択 UI のみです。取り込み実行は次に接続します。
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            キャンセル
          </Button>
          <Button onClick={() => void handleCreate()} disabled={isSubmitting}>
            {isSubmitting ? '作成中...' : '作成'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
