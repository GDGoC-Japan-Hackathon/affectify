"use client";

import { useState } from 'react';
import Link from 'next/link';
import type { Variant } from '@/types/type';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Copy,
  Trash2,
  Upload,
  ExternalLink,
  FileText,
  MonitorPlay,
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
  projectId: _projectId,
  onCompareToggle,
  isComparing,
}: VariantCardProps) {
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const hasImported = variant.nodeCount > 0;

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

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">ノード数</div>
            <div className="text-xl font-bold text-gray-900">
              {hasImported ? variant.nodeCount : '—'}
            </div>
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
              {variant.analysisScore ?? 'N/A'}
            </div>
          </div>

          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">更新</div>
            <div className="text-xs font-medium text-gray-900">
              {formatDistanceToNow(variant.updatedAt, { locale: ja, addSuffix: true })}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {hasImported ? (
            <Link href={`/workspace/${variant.id}`} className="flex-1">
              <Button variant="default" className="w-full gap-2">
                <MonitorPlay className="w-4 h-4" />
                ワークスペースを開く
              </Button>
            </Link>
          ) : (
            <Link href={`/workspace/${variant.id}/import`} className="flex-1">
              <Button variant="outline" className="w-full gap-2 border-indigo-300 text-indigo-700 hover:bg-indigo-50">
                <Upload className="w-4 h-4" />
                コードをインポート
              </Button>
            </Link>
          )}

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
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              AI分析レポート - {variant.name}
            </DialogTitle>
            <DialogDescription>
              この設計案をAIが分析した結果です
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center text-gray-500">
            <ExternalLink className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p>AI分析はワークスペースから実行できます</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
