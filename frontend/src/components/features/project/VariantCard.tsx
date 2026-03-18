"use client";

import { useState } from 'react';
import Link from 'next/link';
import { DesignDocViewer } from '@/components/features/design-guide/DesignDocViewer';
import { mockUser } from '@/data/mockData';
import { mockAnalysisReports } from '@/data/mockDesignDocs';
import { mockDesignGuides } from '@/data/mockDesignGuides';
import type { Variant } from '@/types/type';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Copy,
  Pencil,
  Trash2,
  ExternalLink,
  BookOpen,
  FileText,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

interface VariantCardProps {
  variant: Variant;
  projectId: string;
  onCompareToggle: (id: string) => void;
  isComparing: boolean;
}

export function getScoreColor(score?: number) {
  if (!score) return 'text-gray-400';
  if (score >= 90) return 'text-green-600';
  if (score >= 70) return 'text-yellow-600';
  return 'text-red-600';
}

function getScoreBg(score?: number) {
  if (!score) return 'bg-gray-100';
  if (score >= 90) return 'bg-green-100';
  if (score >= 70) return 'bg-yellow-100';
  return 'bg-red-100';
}

export function VariantCard({
  variant,
  projectId,
  onCompareToggle,
  isComparing,
}: VariantCardProps) {
  const creator = mockUser;
  const variantGuide = mockDesignGuides.find(g => g.id === variant.designGuideId);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const analysisReport = mockAnalysisReports[0];

  return (
    <div
      className={`bg-white rounded-xl border-2 transition-all ${
        isComparing ? 'border-blue-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 text-lg truncate">
                {variant.name}
              </h3>
              {variant.isMain && (
                <Badge variant="default" className="shrink-0">
                  メイン
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-600 line-clamp-2">
              {variant.description}
            </p>
          </div>

          <input
            type="checkbox"
            checked={isComparing}
            onChange={() => onCompareToggle(variant.id)}
            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
        </div>

        {/* Design Guide Badge */}
        {variantGuide && (
          <div className="mb-4 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-medium text-gray-900">適用中の設計書</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-indigo-700 font-medium">{variantGuide.name}</span>
              <Link href={`/design-guides/${variantGuide.id}`}>
                <Button variant="ghost" size="sm" className="h-auto p-1 text-xs">
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">ノード数</div>
            <div className="text-xl font-bold text-gray-900">{variant.nodeCount}</div>
          </div>

          <div className={`text-center p-3 rounded-lg relative ${getScoreBg(variant.analysisScore)}`}>
            <div className="text-sm text-gray-600 mb-1 flex items-center justify-center gap-1">
              AI スコア
              {variant.analysisScore && (
                <button
                  onClick={() => setIsAnalysisOpen(true)}
                  className="text-blue-600 hover:text-blue-700 transition-colors"
                  title="AI分析レポートを見る"
                >
                  <FileText className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className={`text-xl font-bold ${getScoreColor(variant.analysisScore)}`}>
              {variant.analysisScore || 'N/A'}
            </div>
          </div>

          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">更新</div>
            <div className="text-xs font-medium text-gray-900">
              {formatDistanceToNow(variant.updatedAt, { locale: ja, addSuffix: true })}
            </div>
          </div>
        </div>

        {/* Creator */}
        <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
          <Avatar className="w-6 h-6">
            <AvatarImage src={creator.avatar} />
            <AvatarFallback>{creator.name[0]}</AvatarFallback>
          </Avatar>
          <span>{creator.name} が作成</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Link href={`/workspace/${variant.id}`} className="flex-1">
            <Button variant="default" className="w-full gap-2">
              <Pencil className="w-4 h-4" />
              編集
            </Button>
          </Link>

          {!variant.isMain && (
            <>
              <Button variant="outline" size="icon" title="複製">
                <Copy className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" title="削除">
                <Trash2 className="w-4 h-4 text-red-600" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* AI Analysis Modal */}
      <Dialog open={isAnalysisOpen} onOpenChange={setIsAnalysisOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              AI分析レポート - {variant.name}
            </DialogTitle>
            <DialogDescription>
              この設計案をAIが分析した結果です
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {analysisReport ? (
              <DesignDocViewer document={analysisReport} mode="overview" />
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>AI分析がまだ実行されていません</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
