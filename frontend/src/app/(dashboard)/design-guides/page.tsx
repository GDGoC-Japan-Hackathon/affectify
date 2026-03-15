"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Plus,
  Search,
  Star,
  TrendingUp,
  Users,
  Heart,
  FileText,
  Upload,
} from 'lucide-react';
import { mockDesignGuides } from '@/data/mockDesignGuides';
import { DesignGuide, DesignGuideVisibility } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type TabType = 'templates' | 'my-guides' | 'team' | 'liked';

export default function DesignGuides() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('templates');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLikedDialog, setShowLikedDialog] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);

  const currentUserId = 'user-1';
  const currentTeamId = 'team-1';

  // フィルタリング
  const filteredGuides = mockDesignGuides.filter(guide => {
    const matchesSearch =
      guide.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.description.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    switch (activeTab) {
      case 'templates':
        return guide.visibility === 'public';
      case 'my-guides':
        return guide.createdBy === currentUserId;
      case 'team':
        // 複数チーム対応：現在選択中のチームで共有されているもの
        return guide.visibility === 'team' && guide.teamId === currentTeamId;
      case 'liked':
        // ここでは仮で人気のあるもの（likeCount > 500）を表示
        return guide.likeCount > 500;
      default:
        return true;
    }
  });

  // ユーザーがいいねした設計書（実際にはユーザーデータから取得）
  // モックとして、likeCount > 500 のものをユーザーがいいねしたことにする
  const likedGuides = mockDesignGuides
    .filter(g => g.likeCount > 500)
    .sort((a, b) => b.likeCount - a.likeCount);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith('.md')) {
      // ファイルアップロード処理（実際にはここでファイルを読み込んで新規作成画面に遷移）
      console.log('Uploading file:', file.name);
      router.push('/design-guides/new');
    }
  };

  return (
    <>
      <div className="p-8">
        {/* ページヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                <BookOpen className="size-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">設計書ライブラリ</h1>
                <p className="text-sm text-slate-600">AIが理解する設計指針を管理</p>
              </div>
            </div>
            <div className="relative">
              <button
                onClick={() => setCreateMenuOpen(!createMenuOpen)}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
              >
                <Plus className="size-4" />
                新規作成
              </button>
              {createMenuOpen && (
                <div className="absolute right-0 mt-1 z-50 w-64 rounded-lg border border-gray-200 bg-white shadow-lg p-1">
                  <div className="px-2 py-1.5 text-xs font-medium text-gray-500">設計書を作成</div>
                  <button
                    onClick={() => { setCreateMenuOpen(false); router.push('/design-guides/new'); }}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm hover:bg-gray-50"
                  >
                    <FileText className="size-4 shrink-0" />
                    <div className="flex flex-col text-left">
                      <span className="font-medium">ゼロから作成</span>
                      <span className="text-xs text-slate-500">空白の設計書を作成</span>
                    </div>
                  </button>
                  <button
                    onClick={() => { setCreateMenuOpen(false); setShowLikedDialog(true); }}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm hover:bg-gray-50"
                  >
                    <Heart className="size-4 shrink-0" />
                    <div className="flex flex-col text-left">
                      <span className="font-medium">お気に入りから作成</span>
                      <span className="text-xs text-slate-500">いいねした設計書を選択</span>
                    </div>
                  </button>
                  <label className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm hover:bg-gray-50 cursor-pointer">
                    <Upload className="size-4 shrink-0" />
                    <div className="flex flex-col text-left">
                      <span className="font-medium">ファイルをアップロード</span>
                      <span className="text-xs text-slate-500">Markdownファイル (.md)</span>
                    </div>
                    <input
                      type="file"
                      accept=".md"
                      onChange={(e) => { setCreateMenuOpen(false); handleFileUpload(e); }}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* タブナビゲーション */}
        <div className="mb-6 flex items-center gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 font-medium transition-colors ${
              activeTab === 'templates'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="size-4" />
            テンプレート
          </button>
          <button
            onClick={() => setActiveTab('my-guides')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 font-medium transition-colors ${
              activeTab === 'my-guides'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="size-4" />
            マイ設計書
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 font-medium transition-colors ${
              activeTab === 'team'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="size-4" />
            チーム
          </button>
          <button
            onClick={() => setActiveTab('liked')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 font-medium transition-colors ${
              activeTab === 'liked'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Heart className="size-4" />
            お気に入り
          </button>
        </div>

        {/* 検索バー */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="設計書を検索（名前、説明）"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
        </div>

        {/* 設計書グリッド */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGuides.map((guide) => (
            <DesignGuideCard key={guide.id} guide={guide} />
          ))}
        </div>

        {filteredGuides.length === 0 && (
          <div className="py-16 text-center">
            <BookOpen className="mx-auto mb-4 size-12 text-slate-300" />
            <p className="text-slate-600">設計書が見つかりませんでした</p>
          </div>
        )}
      </div>

      {/* テンプレート選択ダイアログ */}
      <Dialog open={showLikedDialog} onOpenChange={setShowLikedDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>お気に入りから選択</DialogTitle>
            <DialogDescription>
              いいねした設計書をベースに、カスタマイズして作成できます
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            {likedGuides.length === 0 ? (
              <div className="py-12 text-center">
                <Heart className="mx-auto mb-3 size-12 text-slate-300" />
                <p className="text-sm text-slate-600">
                  まだお気に入りの設計書がありません
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  設計書の詳細ページでハートアイコンをクリックして、お気に入りに追加できます
                </p>
              </div>
            ) : (
              likedGuides.map((template) => (
                <button
                  key={template.id}
                  onClick={() => {
                    setShowLikedDialog(false);
                    router.push(`/design-guides/new?templateId=${template.id}`);
                  }}
                  className="w-full rounded-lg border border-slate-200 p-4 text-left transition-all hover:border-indigo-300 hover:bg-indigo-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <h4 className="font-semibold text-slate-900">{template.name}</h4>
                        <Heart className="size-4 fill-pink-400 text-pink-400" />
                      </div>
                      <p className="mb-2 text-sm text-slate-600">{template.description}</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Star className="size-4 fill-yellow-400 text-yellow-400" />
                      {template.likeCount}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DesignGuideCard({ guide }: { guide: DesignGuide }) {
  const router = useRouter();

  const getVisibilityLabel = (visibility: DesignGuideVisibility) => {
    switch (visibility) {
      case 'private': return 'Private';
      case 'team': return 'Team';
      case 'public': return 'Public';
    }
  };

  return (
    <div
      onClick={() => router.push(`/design-guides/${guide.id}`)}
      className="group relative cursor-pointer overflow-hidden rounded-[16px] bg-gradient-to-b from-[#fbfdff] to-[#f8fbff] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#9fc2ea]"
      style={{
        border: '1.5px solid #d4e4f5',
        boxShadow: '0 4px 14px rgba(59,130,246,0.05)',
      }}
    >
      <div className="flex flex-col p-[18px]">
        {/* トップバー */}
        <div className="mb-3.5 flex items-center justify-between">
          <div
            className="grid size-[38px] place-items-center rounded-[10px] bg-white/70 text-[#3b82f6]"
            style={{ border: '1px solid #bfd7f1' }}
          >
            <BookOpen className="size-[18px]" />
          </div>
          <span className="rounded-full bg-[#eef6ff] px-2.5 py-1.5 text-xs font-bold text-[#55739a]">
            {getVisibilityLabel(guide.visibility)}
          </span>
        </div>

        {/* タイトル */}
        <h3 className="mb-2.5 text-lg font-semibold leading-snug text-[#173a63] group-hover:text-[#3b82f6] transition-colors">
          {guide.name}
        </h3>

        {/* ダッシュ区切り線 */}
        <div
          className="my-3.5"
          style={{
            height: '1px',
            background: 'repeating-linear-gradient(to right, #d8e6f5 0, #d8e6f5 8px, transparent 8px, transparent 14px)',
          }}
        />

        {/* 情報行 */}
        <div className="mb-auto grid gap-2.5">
          <div className="flex items-center justify-between text-[13px] text-[#516c8d]">
            <span>いいね</span>
            <strong className="text-[#173a63]">{guide.likeCount}</strong>
          </div>
        </div>

        {/* フッター */}
        <div className="mt-4 flex items-center justify-between text-xs text-[#59738f]">
          <span>最終更新 {guide.updatedAt.toLocaleDateString('ja-JP')}</span>
          <span className="font-medium">Spec</span>
        </div>
      </div>
    </div>
  );
}
