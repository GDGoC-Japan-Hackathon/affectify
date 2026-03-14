"use client";

import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { mockProjects } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  GitBranch,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';

export default function BranchCompare() {
  const { projectId } = useParams();
  const searchParams = useSearchParams();
  const branchIds = searchParams.get('branches')?.split(',') || [];

  const project = mockProjects.find(p => p.id === projectId);
  const branches = project?.variants.filter(b => branchIds.includes(b.id)) || [];

  if (!project || branches.length < 2) {
    return (
        <div className="p-6">
          <p>比較する設計案を選択してください</p>
        </div>
    );
  }

  // Mock comparison data
  const comparisonMetrics = [
    {
      name: 'ノード数',
      values: branches.map(b => b.nodeCount),
      unit: '個',
      higher: 'neutral',
    },
    {
      name: 'AIスコア',
      values: branches.map(b => b.analysisScore || 0),
      unit: '点',
      higher: 'better',
    },
    {
      name: '依存関係の複雑度',
      values: [45, 32, 58], // Mock data
      unit: '',
      higher: 'worse',
    },
    {
      name: 'コード重複率',
      values: [12, 8, 15], // Mock data
      unit: '%',
      higher: 'worse',
    },
    {
      name: '循環依存',
      values: [3, 0, 5], // Mock data
      unit: '箇所',
      higher: 'worse',
    },
  ];

  const designIssues = [
    {
      branch: branches[0].name,
      issues: [
        { type: 'warning', text: 'UserService に多数の責務が集中しています' },
        { type: 'info', text: 'コンポーネントの再利用性を改善できます' },
      ],
    },
    {
      branch: branches[1]?.name,
      issues: [
        { type: 'success', text: '依存関係が適切に管理されています' },
        { type: 'info', text: 'モジュール分割が良好です' },
      ],
    },
    {
      branch: branches[2]?.name,
      issues: [
        { type: 'error', text: '循環依存が検出されました' },
        { type: 'warning', text: 'レイヤー間の依存が複雑です' },
      ],
    },
  ];

  const getBestValue = (values: number[], higher: 'better' | 'worse' | 'neutral') => {
    if (higher === 'neutral') return null;
    return higher === 'better' ? Math.max(...values) : Math.min(...values);
  };

  const getComparisonIcon = (
    value: number,
    bestValue: number | null,
    higher: 'better' | 'worse' | 'neutral'
  ) => {
    if (higher === 'neutral' || bestValue === null) {
      return <Minus className="w-4 h-4 text-gray-400" />;
    }
    if (value === bestValue) {
      return <TrendingUp className="w-4 h-4 text-green-600" />;
    }
    return <TrendingDown className="w-4 h-4 text-red-600" />;
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/project/${projectId}`}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            プロジェクトに戻る
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                設計案比較
              </h1>
              <p className="text-gray-600">
                {project.name} - {branches.length} つの設計案を比較
              </p>
            </div>

            <Link href={`/editor/${projectId}`}>
              <Button variant="outline">エディタで開く</Button>
            </Link>
          </div>
        </div>

        {/* Branch Headers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {branches.map((branch, index) => (
            <div
              key={branch.id}
              className="bg-white rounded-xl border-2 border-gray-200 p-6"
            >
              <div className="flex items-center gap-2 mb-2">
                <GitBranch className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">{branch.name}</h3>
                {branch.isMain && (
                  <Badge variant="default" className="text-xs">メイン</Badge>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {branch.description}
              </p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">総合スコア</span>
                <span className={`text-2xl font-bold ${
                  (branch.analysisScore || 0) >= 90
                    ? 'text-green-600'
                    : (branch.analysisScore || 0) >= 70
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`}>
                  {branch.analysisScore || 'N/A'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Metrics Comparison */}
        <div
          className="bg-white rounded-xl border border-gray-200 p-6 mb-6"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            メトリクス比較
          </h2>

          <div className="space-y-6">
            {comparisonMetrics.map((metric, metricIndex) => {
              const bestValue = getBestValue(metric.values, metric.higher as any);

              return (
                <div key={metricIndex} className="border-b border-gray-200 last:border-0 pb-6 last:pb-0">
                  <div className="font-medium text-gray-900 mb-3">{metric.name}</div>
                  <div className="grid grid-cols-3 gap-4">
                    {metric.values.map((value, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg ${
                          bestValue !== null && value === bestValue
                            ? 'bg-green-50 border-2 border-green-200'
                            : 'bg-gray-50 border border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl font-bold text-gray-900">
                            {value}
                            <span className="text-sm text-gray-600 ml-1">
                              {metric.unit}
                            </span>
                          </span>
                          {getComparisonIcon(value, bestValue, metric.higher as any)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {branches[index]?.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Design Issues */}
        <div
          className="bg-white rounded-xl border border-gray-200 p-6"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            設計上の指摘事項
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {designIssues.slice(0, branches.length).map((item, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3">{item.branch}</h3>
                <div className="space-y-2">
                  {item.issues.map((issue, issueIndex) => (
                    <div key={issueIndex} className="flex items-start gap-2 text-sm">
                      {getIssueIcon(issue.type)}
                      <span className="text-gray-700 flex-1">{issue.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendation */}
        <div
          className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6"
        >
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            AI 推奨
          </h3>
          <p className="text-gray-700 mb-4">
            総合的な分析の結果、<strong>{branches[1]?.name || branches[0].name}</strong>が最も優れた設計となっています。
            依存関係の管理が適切で、モジュール分割も良好です。
          </p>
          <div className="flex gap-2">
            <Button>この設計を採用</Button>
            <Button variant="outline">詳細レポートをダウンロード</Button>
          </div>
        </div>
      </div>
  );
}
