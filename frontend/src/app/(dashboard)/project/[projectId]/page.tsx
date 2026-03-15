"use client";

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { mockProjects, mockUser } from '@/data/mockData';
import { Variant } from '@/types/type';
import { CreateBranchDialog } from '@/components/features/project/CreateBranchDialog';
import { BranchCard, getScoreColor } from '@/components/features/project/BranchCard';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  GitBranch,
  ArrowLeft,
  Calendar,
  Users,
  BarChart3,
  ExternalLink,
  CheckCircle2,
  Settings,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { toast } from 'sonner';

export default function ProjectDetail() {
  const { projectId } = useParams();
  const project = mockProjects.find(p => p.id === projectId);

  const [branches, setBranches] = useState<Variant[]>(project?.variants || []);
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

  const handleCreateBranch = (name: string, description: string, baseBranchName: string) => {
    const base = branches.find(b => b.name === baseBranchName);
    const newBranch: Variant = {
      id: `branch-${Date.now()}`,
      name,
      description,
      createdBy: mockUser.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      nodeCount: base?.nodeCount || 0,
      analysisScore: undefined,
      isMain: false,
      parentVariantId: base?.id,
    };
    setBranches([...branches, newBranch]);
    toast.success(`設計案「${name}」を作成しました`);
  };

  const handleToggleCompare = (branchId: string) => {
    setCompareBranches(prev =>
      prev.includes(branchId)
        ? prev.filter(id => id !== branchId)
        : [...prev, branchId].slice(0, 3) // 最大3つまで
    );
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
                  <span>{project.members.length}人のメンバー</span>
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

            <div className="flex items-center gap-3">
              {/* Member Avatars */}
              <div className="flex items-center">
                <div className="flex -space-x-2">
                  {project.members.slice(0, 3).map((memberId, i) => (
                    <Avatar key={memberId} className="w-8 h-8 border-2 border-white" style={{ zIndex: 3 - i }}>
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${memberId}`} />
                      <AvatarFallback className="text-xs">{memberId.slice(-1)}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                {project.members.length > 3 && (
                  <span className="ml-2 text-sm text-gray-500">
                    +他{project.members.length - 3}名
                  </span>
                )}
              </div>

              {/* Manage Button (owner only) */}
              {project.ownerId === mockUser.id && (
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings className="w-4 h-4" />
                  管理
                </Button>
              )}

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
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                メイン設計案
              </h2>
              <CreateBranchDialog branches={branches} onCreateBranch={handleCreateBranch} />
            </div>
            <BranchCard
              branch={mainBranch}
              projectId={project.id}
              onCompareToggle={handleToggleCompare}
              isComparing={compareBranches.includes(mainBranch.id)}
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
