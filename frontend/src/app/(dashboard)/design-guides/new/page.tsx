"use client";

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Editor from '@monaco-editor/react';
import { ArrowLeft, Code, Eye, Save } from 'lucide-react';
import { createDesignGuide, getDesignGuide } from '@/lib/api/design-guides';
import type { DesignGuideVisibility } from '@/types/type';
import { toast } from 'sonner';

type ViewMode = 'edit' | 'preview' | 'split';

export default function NewDesignGuidePage() {
  return (
    <Suspense>
      <NewDesignGuideForm />
    </Suspense>
  );
}

function NewDesignGuideForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('templateId');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState(getDefaultTemplate());
  const [visibility, setVisibility] = useState<DesignGuideVisibility>('private');
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [isSaving, setIsSaving] = useState(false);

  // テンプレートから作成する場合はコンテンツを引き継ぐ
  useEffect(() => {
    if (!templateId) return;

    getDesignGuide(templateId)
      .then((guide) => {
        setContent(guide.content);
        setDescription(guide.description);
      })
      .catch(() => {/* テンプレート取得失敗は無視 */});
  }, [templateId]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('設計書名を入力してください');
      return;
    }

    try {
      setIsSaving(true);
      const guide = await createDesignGuide({
        name: name.trim(),
        description: description.trim(),
        content,
        visibility,
      });
      toast.success(`「${guide.name}」を作成しました`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '設計書の作成に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      {/* ヘッダー */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/design-guides')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="size-4" />
            設計書一覧
          </button>
          <div className="h-6 w-px bg-slate-300" />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="設計書の名前"
            className="border-b border-transparent bg-transparent text-lg font-semibold text-slate-900 outline-none focus:border-indigo-600"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* ビューモード切り替え */}
          <div className="flex rounded-lg border border-slate-300 bg-white">
            <button
              onClick={() => setViewMode('edit')}
              className={`px-3 py-1.5 ${viewMode === 'edit' ? 'bg-slate-100' : ''}`}
              title="編集のみ"
            >
              <Code className="size-4" />
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`border-x border-slate-300 px-3 py-1.5 ${viewMode === 'split' ? 'bg-slate-100' : ''}`}
              title="分割表示"
            >
              <div className="flex gap-1">
                <div className="h-4 w-1 bg-slate-400" />
                <div className="h-4 w-1 bg-slate-400" />
              </div>
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1.5 ${viewMode === 'preview' ? 'bg-slate-100' : ''}`}
              title="プレビューのみ"
            >
              <Eye className="size-4" />
            </button>
          </div>

          <button
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            <Save className="size-4" />
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </header>

      {/* メタ情報バー */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-700">説明</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="この設計書の説明を入力"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">公開設定</label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as DesignGuideVisibility)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="private">非公開</option>
              <option value="public">公開</option>
            </select>
          </div>
        </div>
      </div>

      {/* エディタエリア */}
      <div className="flex flex-1 overflow-hidden">
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div className={viewMode === 'split' ? 'w-1/2 border-r border-slate-200' : 'w-full'}>
            <Editor
              height="100%"
              defaultLanguage="markdown"
              value={content}
              onChange={(value) => setContent(value ?? '')}
              theme="vs-light"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                wordWrap: 'on',
                padding: { top: 16, bottom: 16 },
              }}
            />
          </div>
        )}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className={`overflow-auto bg-white ${viewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
            <div className="prose prose-slate max-w-none p-8">
              <MarkdownPreview content={content} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MarkdownPreview({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactElement[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];

  lines.forEach((line, index) => {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={index} className="my-4 overflow-x-auto rounded-lg bg-slate-900 p-4">
            <code className="text-sm text-slate-100">{codeBlockContent.join('\n')}</code>
          </pre>
        );
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
    } else if (inCodeBlock) {
      codeBlockContent.push(line);
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={index} className="mb-4 mt-8 text-3xl font-bold">{line.substring(2)}</h1>);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={index} className="mb-3 mt-6 text-2xl font-bold">{line.substring(3)}</h2>);
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={index} className="mb-2 mt-4 text-xl font-bold">{line.substring(4)}</h3>);
    } else if (line.startsWith('#### ')) {
      elements.push(<h4 key={index} className="mb-2 mt-3 font-bold">{line.substring(5)}</h4>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(<li key={index} className="ml-4">{line.substring(2)}</li>);
    } else if (line.match(/^\d+\. /)) {
      const match = line.match(/^\d+\. (.+)$/);
      if (match) elements.push(<li key={index} className="ml-4">{match[1]}</li>);
    } else if (line.trim() === '') {
      elements.push(<br key={index} />);
    } else {
      const processed = line
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/`(.+?)`/g, '<code class="rounded bg-slate-100 px-1.5 py-0.5 text-sm">$1</code>');
      elements.push(<p key={index} className="mb-2" dangerouslySetInnerHTML={{ __html: processed }} />);
    }
  });

  return <>{elements}</>;
}

function getDefaultTemplate(): string {
  return `# 設計ガイドライン

## 概要
このセクションに設計の基本方針を記述します。

## アーキテクチャ原則

### 原則1: レイヤード アーキテクチャ
- プレゼンテーション層
- ビジネスロジック層
- データアクセス層

### 原則2: 依存関係の管理
- 上位層から下位層への単方向依存
- 循環依存の禁止

## コーディング規約

### 命名規則
- クラス: PascalCase
- 関数: camelCase
- 定数: UPPER_SNAKE_CASE

## 禁止事項
- グローバル変数の使用
- マジックナンバーの使用

## 推奨パターン
\`\`\`typescript
// 推奨される書き方の例
const example = () => {
  // コード例
};
\`\`\`
`;
}
