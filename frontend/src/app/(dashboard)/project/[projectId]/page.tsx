"use client";

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Project, Variant } from '@/types/type';
import { CreateVariantDialog } from '@/components/features/project/CreateVariantDialog';
import { VariantCard, getScoreColor } from '@/components/features/project/VariantCard';
import { ManageMembersDialog } from '@/components/features/project/ManageMembersDialog';
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
import { getProject } from '@/lib/api/projects';
import { createVariant } from '@/lib/api/variants';
import { getMe } from '@/lib/api/users';

export default function ProjectDetail() {
  const params = useParams<{ projectId: string }>();
  const projectId = Array.isArray(params?.projectId) ? params.projectId[0] : params?.projectId;
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [compareVariants, setCompareVariants] = useState<string[]>([]);
  const [memberSummaries, setMemberSummaries] = useState<Project['memberSummaries']>([]);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId || Array.isArray(projectId)) return;

    let cancelled = false;

    async function load() {
      try {
        setIsLoading(true);
        const [result, meResponse] = await Promise.all([
          getProject(projectId),
          getMe(),
        ]);
        if (cancelled) return;
        setProject(result);
        setVariants(result.variants);
        setMemberSummaries(result.memberSummaries ?? []);
        setCurrentUserId(meResponse.user?.id?.toString() ?? null);
      } catch (error) {
        if (cancelled) return;
        toast.error(error instanceof Error ? error.message : 'プロジェクトの取得に失敗しました');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const comparedVariants = useMemo(
    () => variants.filter(b => compareVariants.includes(b.id)),
    [variants, compareVariants]
  );

  if (isLoading) {
    return (
        <div className="p-6">
          <p>プロジェクトを読み込み中...</p>
        </div>
    );
  }

  if (!project) {
    return (
        <div className="p-6">
          <p>プロジェクトが見つかりません</p>
        </div>
    );
  }

  const mainVariant = variants.find(b => b.isMain);
  const otherVariants = variants.filter(b => !b.isMain);
  const isOwner = currentUserId !== null && project.ownerId === currentUserId;

  const handleCreateVariant = async (name: string, description: string, baseVariantId: string) => {
    try {
      const created = await createVariant({
        projectId: project.id,
        name,
        description,
        forkedFromVariantId: baseVariantId,
      });
      setVariants((prev) => [...prev, created]);
      toast.success(`設計案「${name}」を作成しました`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '設計案の作成に失敗しました');
    }
  };

  const handleToggleCompare = (variantId: string) => {
    setCompareVariants(prev =>
      prev.includes(variantId)
        ? prev.filter(id => id !== variantId)
        : [...prev, variantId].slice(0, 3) // 最大3つまで
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
                  <span>{(memberSummaries ?? []).length}人のメンバー</span>
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
                  <span>{variants.length} 設計案</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Member Avatars */}
              <div className="flex items-center">
                <div className="flex -space-x-2">
                  {(memberSummaries ?? []).slice(0, 3).map((member, i) => (
                    <Avatar key={member.userId} className="w-8 h-8 border-2 border-white bg-gray-100" style={{ zIndex: 3 - i }}>
                      <AvatarImage src={member.user?.avatar} />
                      <AvatarFallback className="text-xs bg-gray-200">{member.user?.name?.[0] ?? '?'}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                {(memberSummaries ?? []).length > 3 && (
                  <span className="ml-2 text-sm text-gray-500">
                    +他{(memberSummaries ?? []).length - 3}名
                  </span>
                )}
              </div>

              {isOwner ? (
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsManageOpen(true)}>
                  <Settings className="w-4 h-4" />
                  管理
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsManageOpen(true)}>
                  <Users className="w-4 h-4" />
                  メンバー
                </Button>
              )}

              <CreateVariantDialog variants={variants} onCreateVariant={handleCreateVariant} />

              {compareVariants.length > 1 && (
                <Link href={`/compare/${project.id}?variants=${compareVariants.join(',')}`}>
                  <Button variant="outline" className="gap-2">
                    <BarChart3 className="w-4 h-4" />
                    比較 ({compareVariants.length})
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Main Variant */}
        {mainVariant && (
          <div className="mb-6">
            <div className="mb-3">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                メイン設計案
              </h2>
            </div>
            <VariantCard
              variant={mainVariant}
              projectId={project.id}
              onCompareToggle={handleToggleCompare}
              isComparing={compareVariants.includes(mainVariant.id)}
            />
          </div>
        )}

        {/* Other Variants */}
        {otherVariants.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-blue-600" />
              その他の設計案 ({otherVariants.length})
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {otherVariants.map((variant) => (
                <VariantCard
                  key={variant.id}
                  variant={variant}
                  projectId={project.id}
                  onCompareToggle={handleToggleCompare}
                  isComparing={compareVariants.includes(variant.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Comparison Summary */}
        {comparedVariants.length > 1 && (
          <div
            className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6"
          >
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              比較サマリー
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {comparedVariants.map(variant => (
                <div key={variant.id} className="bg-white rounded-lg p-4">
                  <div className="font-medium text-gray-900 mb-3 truncate">
                    {variant.name}
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">ノード数:</span>
                      <span className="font-medium">{variant.nodeCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">スコア:</span>
                      <span className={`font-medium ${getScoreColor(variant.analysisScore)}`}>
                        {variant.analysisScore || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Link href={`/compare/${project.id}?variants=${compareVariants.join(',')}`}>
              <Button className="w-full mt-4 gap-2">
                <ExternalLink className="w-4 h-4" />
                詳細な比較ビューを開く
              </Button>
            </Link>
          </div>
        )}

        <ManageMembersDialog
          open={isManageOpen}
          onOpenChange={setIsManageOpen}
          projectId={project.id}
          memberSummaries={memberSummaries ?? []}
          currentUserId={currentUserId ?? ''}
          isOwner={isOwner}
          onMembersChange={setMemberSummaries}
        />
      </div>
  );
}
