"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  BookOpen,
  Edit,
  Copy,
  Heart,
  Calendar,
  User,
  ArrowLeft,
  Check
} from 'lucide-react';
import { mockDesignGuides } from '@/data/mockDesignGuides';

export default function DesignGuideDetail() {
  const { guideId } = useParams();
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const [copied, setCopied] = useState(false);

  const guide = mockDesignGuides.find(g => g.id === guideId);
  const currentUserId = 'user-1';

  if (!guide) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <BookOpen className="mx-auto mb-4 size-12 text-slate-300" />
          <p className="text-slate-600">設計書が見つかりませんでした</p>
          <Link href="/design-guides" className="mt-4 inline-block text-indigo-600 hover:text-indigo-700">
            設計書一覧に戻る
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = guide.createdBy === currentUserId;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* ヘッダー */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/design-guides"
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="size-4" />
              設計書一覧
            </Link>
            <div className="flex items-center gap-2">
              {isOwner && (
                <button
                  onClick={() => router.push(`/design-guides/${guide.id}/edit`)}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
                >
                  <Edit className="size-4" />
                  編集
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* タイトルとメタ情報 */}
        <div className="mb-8">
          <div className="mb-4 flex items-start justify-between">
            <div className="flex-1">
              <h1 className="mb-2 text-3xl font-bold text-slate-900">{guide.name}</h1>
              <p className="text-lg text-slate-600">{guide.description}</p>
            </div>
          </div>

          {/* メタ情報 */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
            <div className="flex items-center gap-1.5">
              <User className="size-4" />
              <span>作成者: User {guide.createdBy}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="size-4" />
              <span>更新: {guide.updatedAt.toLocaleDateString('ja-JP')}</span>
            </div>
          </div>

          {/* 統計とアクション */}
          <div className="mt-6 flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex gap-6">
              <div className="text-center">
                <div className="mb-1 flex items-center justify-center gap-1 text-sm text-slate-600">
                  <Heart className="size-4 fill-pink-400 text-pink-400" />
                  いいね
                </div>
                <div className="text-2xl font-bold text-slate-900">{guide.likeCount}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setLiked(!liked)}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2 font-medium transition-colors ${
                  liked
                    ? 'border-pink-300 bg-pink-50 text-pink-700'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Heart className={`size-4 ${liked ? 'fill-pink-400' : ''}`} />
                {liked ? 'いいね済み' : 'いいね'}
              </button>
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? 'コピー済み' : 'リンク'}
              </button>
            </div>
          </div>
        </div>

        {/* 設計書コンテンツ */}
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="prose prose-slate max-w-none">
            {/* マークダウンをプレビュー（簡易版） */}
            {guide.content.split('\n').map((line, index) => {
              if (line.startsWith('# ')) {
                return <h1 key={index} className="mb-4 mt-8 text-3xl font-bold">{line.substring(2)}</h1>;
              } else if (line.startsWith('## ')) {
                return <h2 key={index} className="mb-3 mt-6 text-2xl font-bold">{line.substring(3)}</h2>;
              } else if (line.startsWith('### ')) {
                return <h3 key={index} className="mb-2 mt-4 text-xl font-bold">{line.substring(4)}</h3>;
              } else if (line.startsWith('#### ')) {
                return <h4 key={index} className="mb-2 mt-3 font-bold">{line.substring(5)}</h4>;
              } else if (line.startsWith('- ')) {
                return <li key={index} className="ml-4">{line.substring(2)}</li>;
              } else if (line.startsWith('```')) {
                return <pre key={index} className="my-4 rounded-lg bg-slate-900 p-4 text-sm text-slate-100">{line}</pre>;
              } else if (line.trim() === '') {
                return <br key={index} />;
              } else {
                return <p key={index} className="mb-2">{line}</p>;
              }
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
