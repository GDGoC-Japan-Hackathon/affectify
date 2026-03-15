"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FolderOpen, Code2 } from 'lucide-react';
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
import { mockDesignGuides } from '@/data/mockDesignGuides';
import { toast } from 'sonner';

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ImportedFolder {
  name: string;
  fileCount: number;
  files: File[];
}

export function CreateProjectDialog({ open, onOpenChange }: CreateProjectDialogProps) {
  const router = useRouter();
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [designGuideId, setDesignGuideId] = useState<string>('none');
  const [importedFolder, setImportedFolder] = useState<ImportedFolder | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleCreate = () => {
    if (!importedFolder) {
      toast.error('フォルダを選択してください');
      return;
    }

    const newProject = {
      id: `project-${Date.now()}`,
      name: projectName || importedFolder.name,
      description,
      ownerId: 'user-1',
      members: ['user-1'],
      designGuideId: designGuideId !== 'none' ? designGuideId : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      nodeCount: 0,
      variants: [],
    };

    console.log('Creating project:', newProject);

    sessionStorage.setItem('pending-project-import', JSON.stringify({
      project: newProject,
      files: importedFolder.files,
    }));

    toast.success(`プロジェクト「${newProject.name}」を作成しました`);

    router.push(`/editor/${newProject.id}`);
    onOpenChange(false);

    setProjectName('');
    setDescription('');
    setDesignGuideId('none');
    setImportedFolder(null);
    setIsImporting(false);
  };

  const availableDesignGuides = mockDesignGuides.filter(
    (guide) => guide.visibility === 'public' || guide.createdBy === 'user-1'
  );

  const handleFolderImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setIsImporting(true);
      const folderName = files[0].webkitRelativePath.split('/')[0];
      const folderFiles = Array.from(files);

      if (!projectName) {
        setProjectName(folderName);
      }

      setImportedFolder({
        name: folderName,
        fileCount: folderFiles.length,
        files: folderFiles,
      });
      setIsImporting(false);
      toast.success(`${folderName} (${folderFiles.length}ファイル) をインポートしました`);
    }
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

          {/* 設計書選択 */}
          <div className="space-y-2">
            <Label htmlFor="design-guide">設計書（オプション）</Label>
            <Select value={designGuideId} onValueChange={(v) => setDesignGuideId(v ?? '')}>
              <SelectTrigger id="design-guide">
                <SelectValue placeholder="設計書を選択..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">設計書なし</SelectItem>
                {availableDesignGuides.map((guide) => (
                  <SelectItem key={guide.id} value={guide.id}>
                    {guide.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              プロジェクトにAI設計チェックの指針を適用できます
            </p>
          </div>

          {/* フォルダインポート */}
          <div className="space-y-3">
            <Label>
              フォルダインポート <span className="text-red-500">*</span>
            </Label>

            {!importedFolder ? (
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 transition-colors">
                <FolderOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-700 mb-1">
                  プロジェクトフォルダを選択
                </p>
                <p className="text-xs text-slate-500 mb-4">
                  コードを含むフォルダを選択してインポートします
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const input = document.getElementById('import-folder') as HTMLInputElement;
                    if (input) {
                      input.click();
                    }
                  }}
                  disabled={isImporting}
                >
                  {isImporting ? 'インポート中...' : 'フォルダを選択'}
                </Button>
                <input
                  id="import-folder"
                  type="file"
                  className="hidden"
                  /* @ts-expect-error webkitdirectory is not in the type definitions */
                  webkitdirectory=""
                  multiple
                  onChange={handleFolderImport}
                />
              </div>
            ) : (
              <div className="border-2 border-blue-200 bg-blue-50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Code2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{importedFolder.name}</p>
                    <p className="text-sm text-slate-600 mt-0.5">
                      {importedFolder.fileCount} ファイル
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setImportedFolder(null)}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    変更
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={handleCreate}>
            作成
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
