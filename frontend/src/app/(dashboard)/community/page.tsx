"use client";

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { mockDesignGuides } from '@/data/mockDesignGuides';
import { DesignGuide } from '@/types';
import {
  Globe,
  Search,
  Flame,
  Clock,
  TrendingUp,
  BookOpen,
} from 'lucide-react';

type SortType = 'popular' | 'trending' | 'newest';

export default function Community() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('popular');

  const publicGuides = useMemo(() => {
    let guides = mockDesignGuides.filter(g => g.visibility === 'public');

    // 検索フィルタ
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      guides = guides.filter(
        g =>
          g.name.toLowerCase().includes(q) ||
          g.description.toLowerCase().includes(q)
      );
    }

    // ソート
    switch (sortBy) {
      case 'popular':
        guides.sort((a, b) => b.likeCount - a.likeCount);
        break;
      case 'trending':
        guides.sort((a, b) => b.likeCount - a.likeCount);
        break;
      case 'newest':
        guides.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        break;
    }

    return guides;
  }, [searchQuery, sortBy]);

  return (
      <div className="p-8">
        {/* ヘッダー */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
            <Globe className="size-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">コミュニティ</h1>
            <p className="text-sm text-slate-600">公開設計書とテンプレート</p>
          </div>
        </div>

        {/* 検索 + ソート */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="設計書を検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <div className="flex gap-1 rounded-lg border border-slate-300 p-1">
            {([
              { key: 'popular', label: '人気', icon: Flame },
              { key: 'trending', label: '利用数', icon: TrendingUp },
              { key: 'newest', label: '最新', icon: Clock },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  sortBy === key
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 設計書グリッド */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {publicGuides.map((guide) => (
            <CommunityGuideCard key={guide.id} guide={guide} />
          ))}
        </div>

        {publicGuides.length === 0 && (
          <div className="py-20 text-center">
            <Search className="mx-auto mb-4 size-12 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              設計書が見つかりませんでした
            </h3>
            <p className="text-slate-600">検索条件を変更してお試しください</p>
          </div>
        )}
      </div>
  );
}

function CommunityGuideCard({ guide }: { guide: DesignGuide }) {
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
          <span className="rounded-full bg-[#eef6ff] px-2.5 py-1.5 text-xs font-bold text-[#55739a]">
            Public
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
