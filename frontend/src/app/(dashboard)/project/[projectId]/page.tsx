"use client";

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { DesignDocViewer } from '@/components/features/design-guide/DesignDocViewer';
import { mockProjects, mockTeams, mockUser } from '@/data/mockData';
import { mockAnalysisReports } from '@/data/mockDesignDocs';
import { mockDesignGuides } from '@/data/mockDesignGuides';
import { Variant } from '@/types/type';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  GitBranch,
  Plus,
  ArrowLeft,
  Calendar,
  Users,
  BarChart3,
  Copy,
  Pencil,
  Trash2,
  ExternalLink,
  CheckCircle2,
  BookOpen,
  FileText,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { toast } from 'sonner';

export default function ProjectDetail() {
  const { projectId } = useParams();
  const project = mockProjects.find(p => p.id === projectId);
  const team = mockTeams.find(t => project?.shareSettings.sharedWithTeams?.includes(t.id));

  const [branches, setBranches] = useState<Variant[]>(project?.variants || []);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchDescription, setNewBranchDescription] = useState('');
  const [selectedBaseBranch, setSelectedBaseBranch] = useState('main');
  const [compareBranches, setCompareBranches] = useState<string[]>([]);

  const comparedBranches = useMemo(
    () => branches.filter(b => compareBranches.includes(b.id)),
    [branches, compareBranches]
  );

  if (!project) {
    return (
        <div className="p-6">
          <p>プロジェクトが見つかりません</p>
        </div>
    );
  }

  const mainBranch = branches.find(b => b.isMain);
  const otherBranches = branches.filter(b => !b.isMain);

  const handleCreateBranch = () => {
    if (!newBranchName.trim()) {
      toast.error('設計案名を入力してください');
      return;
    }

    const baseBranch = branches.find(b => b.name === selectedBaseBranch);
    const newBranch: Variant = {
      id: `branch-${Date.now()}`,
      name: newBranchName,
      description: newBranchDescription,
      createdBy: mockUser.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      nodeCount: baseBranch?.nodeCount || 0,
      analysisScore: undefined,
      isMain: false,
      parentVariantId: baseBranch?.id,
    };

    setBranches([...branches, newBranch]);
    setIsCreateDialogOpen(false);
    setNewBranchName('');
    setNewBranchDescription('');
    toast.success(`設計案「${newBranchName}」を作成しました`);
  };

  const handleToggleCompare = (branchId: string) => {
    setCompareBranches(prev =>
      prev.includes(branchId)
        ? prev.filter(id => id !== branchId)
        : [...prev, branchId].slice(0, 3) // 最大3つまで
    );
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-gray-400';
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score?: number) => {
    if (!score) return 'bg-gray-100';
    if (score >= 90) return 'bg-green-100';
    if (score >= 70) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            プロジェクト一覧に戻る
          </Link>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">
                  {project.name}
                </h1>
              </div>
              <p className="text-gray-600 mb-4">{project.description}</p>

              <div className="flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{team?.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {formatDistanceToNow(project.updatedAt, {
                      addSuffix: true,
                      locale: ja,
                    })}
                    に更新
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  <span>{branches.length} 設計案</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 gap-2">
                    <Plus className="w-4 h-4" />
                    新規設計案
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>新しい設計案を作成</DialogTitle>
                    <DialogDescription>
                      既存の設計案から分岐して、新しいバリエーションを作成します
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="branch-name">設計案名</Label>
                      <Input
                        id="branch-name"
                        placeholder="例: パフォーマンス最適化案"
                        value={newBranchName}
                        onChange={(e) => setNewBranchName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="branch-description">説明</Label>
                      <Textarea
                        id="branch-description"
                        placeholder="この設計案の目的や特徴を説明..."
                        value={newBranchDescription}
                        onChange={(e) => setNewBranchDescription(e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="base-branch">ベース設計案</Label>
                      <select
                        id="base-branch"
                        className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm"
                        value={selectedBaseBranch}
                        onChange={(e) => setSelectedBaseBranch(e.target.value)}
                      >
                        {branches.map(branch => (
                          <option key={branch.id} value={branch.name}>
                            {branch.name}
                            {branch.isMain ? ' (メイン)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      キャンセル
                    </Button>
                    <Button onClick={handleCreateBranch}>作成</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {compareBranches.length > 1 && (
                <Link href={`/compare/${project.id}?branches=${compareBranches.join(',')}`}>
                  <Button variant="outline" className="gap-2">
                    <BarChart3 className="w-4 h-4" />
                    比較 ({compareBranches.length})
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Main Branch */}
        {mainBranch && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              メイン設計案
            </h2>
            <BranchCard
              branch={mainBranch}
              projectId={project.id}
              onCompareToggle={handleToggleCompare}
              isComparing={compareBranches.includes(mainBranch.id)}
              getScoreColor={getScoreColor}
              getScoreBg={getScoreBg}
            />
          </div>
        )}

        {/* Other Branches */}
        {otherBranches.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-blue-600" />
              その他の設計案 ({otherBranches.length})
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {otherBranches.map((branch) => (
                <BranchCard
                  key={branch.id}
                  branch={branch}
                  projectId={project.id}
                  onCompareToggle={handleToggleCompare}
                  isComparing={compareBranches.includes(branch.id)}
                  getScoreColor={getScoreColor}
                  getScoreBg={getScoreBg}
                />
              ))}
            </div>
          </div>
        )}

        {/* Comparison Summary */}
        {comparedBranches.length > 1 && (
          <div
            className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6"
          >
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              比較サマリー
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {comparedBranches.map(branch => (
                <div key={branch.id} className="bg-white rounded-lg p-4">
                  <div className="font-medium text-gray-900 mb-3 truncate">
                    {branch.name}
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">ノード数:</span>
                      <span className="font-medium">{branch.nodeCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">スコア:</span>
                      <span className={`font-medium ${getScoreColor(branch.analysisScore)}`}>
                        {branch.analysisScore || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Link href={`/compare/${project.id}?branches=${compareBranches.join(',')}`}>
              <Button className="w-full mt-4 gap-2">
                <ExternalLink className="w-4 h-4" />
                詳細な比較ビューを開く
              </Button>
            </Link>
          </div>
        )}
      </div>
  );
}

interface BranchCardProps {
  branch: Variant;
  projectId: string;
  onCompareToggle: (id: string) => void;
  isComparing: boolean;
  getScoreColor: (score?: number) => string;
  getScoreBg: (score?: number) => string;
}

function BranchCard({
  branch,
  projectId,
  onCompareToggle,
  isComparing,
  getScoreColor,
  getScoreBg,
}: BranchCardProps) {
  const creator = mockUser; // In real app, find by branch.createdBy
  const branchGuide = mockDesignGuides.find(g => g.id === branch.designGuideId);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);

  // AI分析レポートを取得（実際は設計案IDに基づいて取得）
  const analysisReport = mockAnalysisReports[0]; // デモ用

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
                {branch.name}
              </h3>
              {branch.isMain && (
                <Badge variant="default" className="shrink-0">
                  メイン
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-600 line-clamp-2">
              {branch.description}
            </p>
          </div>

          <input
            type="checkbox"
            checked={isComparing}
            onChange={() => onCompareToggle(branch.id)}
            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
        </div>

        {/* Design Guide Badge */}
        {branchGuide && (
          <div className="mb-4 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-medium text-gray-900">適用中の設計書</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-indigo-700 font-medium">{branchGuide.name}</span>
              <Link href={`/design-guides/${branchGuide.id}`}>
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
            <div className="text-xl font-bold text-gray-900">{branch.nodeCount}</div>
          </div>

          <div className={`text-center p-3 rounded-lg relative ${getScoreBg(branch.analysisScore)}`}>
            <div className="text-sm text-gray-600 mb-1 flex items-center justify-center gap-1">
              AI スコア
              {branch.analysisScore && (
                <button
                  onClick={() => setIsAnalysisOpen(true)}
                  className="text-blue-600 hover:text-blue-700 transition-colors"
                  title="AI分析レポートを見る"
                >
                  <FileText className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className={`text-xl font-bold ${getScoreColor(branch.analysisScore)}`}>
              {branch.analysisScore || 'N/A'}
            </div>
          </div>

          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">更新</div>
            <div className="text-xs font-medium text-gray-900">
              {formatDistanceToNow(branch.updatedAt, { locale: ja, addSuffix: true })}
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
          <Link href={`/editor/${projectId}?branch=${branch.id}`} className="flex-1">
            <Button variant="default" className="w-full gap-2">
              <Pencil className="w-4 h-4" />
              編集
            </Button>
          </Link>

          {!branch.isMain && (
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
              AI分析レポート - {branch.name}
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
