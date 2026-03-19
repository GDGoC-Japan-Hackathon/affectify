"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Plus,
  Search,
  Star,
  TrendingUp,
  Heart,
  FileText,
  Upload,
  Users,
  Filter,
  Clock,
  Folder,
} from 'lucide-react';
import { mockDesignGuides } from '@/data/mockDesignGuides';
import { DesignGuide } from '@/types/type';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type TabType = 'templates' | 'community' | 'my-guides' | 'liked';

export default function DesignGuides() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('templates');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLikedDialog, setShowLikedDialog] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'likes'>('recent');
  const [sortOpen, setSortOpen] = useState(false);

  const currentUserId = 'user-1';

  // モック: user-1 がいいねしている設計書ID
  const [likedGuideIds, setLikedGuideIds] = useState<Set<string>>(
    new Set(['guide-2', 'guide-4'])
  );

  const toggleLike = (guideId: string) => {
    setLikedGuideIds(prev => {
      const next = new Set(prev);
      if (next.has(guideId)) {
        next.delete(guideId);
      } else {
        next.add(guideId);
      }
      return next;
    });
  };

  // フィルタリング
  const filteredGuides = mockDesignGuides.filter(guide => {
    const matchesSearch =
      guide.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.description.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    switch (activeTab) {
      case 'templates':
        return guide.isTemplate === true;
      case 'community':
        return guide.visibility === 'public' && !guide.isTemplate && guide.createdBy !== currentUserId;
      case 'my-guides':
        return guide.createdBy === currentUserId;
      case 'liked':
        return likedGuideIds.has(guide.id);
      default:
        return true;
    }
  }).sort((a, b) => {
    switch (sortBy) {
      case 'name': return a.name.localeCompare(b.name);
      case 'likes': return b.likeCount - a.likeCount;
      case 'recent':
      default: return b.updatedAt.getTime() - a.updatedAt.getTime();
    }
  });

  const likedGuides = mockDesignGuides
    .filter(g => likedGuideIds.has(g.id))
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
      <div className="p-6 max-w-7xl mx-auto">
        {/* ヘッダー Row 1: タイトル + 新規作成 */}
        <div className="mb-2 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">設計書ライブラリ</h1>
          <div className="relative">
            <button
              onClick={() => setCreateMenuOpen(!createMenuOpen)}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
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

        {/* ヘッダー Row 2: 件数 + ソート */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-gray-600">{filteredGuides.length}件の設計書</p>
          <div className="relative">
            <button
              onClick={() => setSortOpen(!sortOpen)}
              className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-3 h-8 text-sm font-medium hover:bg-gray-50"
            >
              <Filter className="size-4 mr-2" />
              {sortBy === 'recent' ? '最終更新日' : sortBy === 'name' ? '名前順' : 'いいね順'}
            </button>
            {sortOpen && (
              <div className="absolute right-0 mt-1 z-50 w-40 rounded-lg border border-gray-200 bg-white shadow-lg p-1">
                {([['recent', '最終更新日', Clock], ['name', '名前順', Folder], ['likes', 'いいね順', Heart]] as const).map(([key, label, Icon]) => (
                  <button
                    key={key}
                    onClick={() => { setSortBy(key); setSortOpen(false); }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm ${sortBy === key ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}`}
                  >
                    <Icon className="size-4" />
                    {label}
                  </button>
                ))}
              </div>
            )}
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
            onClick={() => setActiveTab('community')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 font-medium transition-colors ${
              activeTab === 'community'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="size-4" />
            みんなの設計書
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
        <div className="mb-4">
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
            <DesignGuideCard
              key={guide.id}
              guide={guide}
              isLiked={likedGuideIds.has(guide.id)}
              onLikeToggle={(e) => { e.stopPropagation(); toggleLike(guide.id); }}
            />
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

function DesignGuideCard({
  guide,
  isLiked,
  onLikeToggle,
}: {
  guide: DesignGuide;
  isLiked: boolean;
  onLikeToggle: (e: React.MouseEvent) => void;
}) {
  const router = useRouter();

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
          <button
            onClick={onLikeToggle}
            className="flex items-center gap-1 rounded-full px-2 py-1 text-xs transition-colors hover:bg-pink-50"
          >
            <Heart
              className={`size-4 transition-colors ${isLiked ? 'fill-pink-400 text-pink-400' : 'text-slate-300'}`}
            />
            <span className={isLiked ? 'text-pink-400' : 'text-slate-400'}>
              {guide.likeCount}
            </span>
          </button>
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

        {/* 説明 */}
        <p className="mb-auto text-[13px] leading-relaxed text-[#516c8d] line-clamp-2">
          {guide.description}
        </p>

        {/* フッター */}
        <div className="mt-4 text-xs text-[#59738f]">
          <span>最終更新 {guide.updatedAt.toLocaleDateString('ja-JP')}</span>
        </div>
      </div>
    </div>
  );
}
