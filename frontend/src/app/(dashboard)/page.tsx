"use client";

import { mockProjects, mockUser } from '@/data/mockData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LayoutGrid,
  GitBranch,
  ArrowRight,
  Plus,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

export default function Home() {
  const myProjects = mockProjects.filter(p => p.ownerId === mockUser.id);
  const recentProjects = [...myProjects]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 3);


  return (
      <div className="p-6 max-w-7xl mx-auto">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            おかえりなさい、{mockUser.name}さん 👋
          </h1>
          <p className="text-gray-600">
            あなたのプロジェクトとチームの最新情報をチェックしましょう
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Projects */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>最近のプロジェクト</CardTitle>
                    <CardDescription>最近更新したプロジェクト</CardDescription>
                  </div>
                  <Link href="/projects">
                    <Button variant="ghost" size="sm" className="gap-2">
                      すべて表示
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentProjects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/project/${project.id}`}
                      className="block p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{project.name}</h3>
                          <p className="text-sm text-gray-600 line-clamp-1">{project.description}</p>
                        </div>
                        {project.analysisScore && (
                          <Badge
                            variant={
                              project.analysisScore >= 90
                                ? 'default'
                                : project.analysisScore >= 70
                                ? 'secondary'
                                : 'outline'
                            }
                            className="ml-3"
                          >
                            {project.analysisScore}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <LayoutGrid className="w-4 h-4" />
                          {project.nodeCount} ノード
                        </span>
                        <span className="flex items-center gap-1">
                          <GitBranch className="w-4 h-4" />
                          {project.variants.length} 設計案
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatDistanceToNow(project.updatedAt, { locale: ja, addSuffix: true })}
                        </span>
                      </div>
                    </Link>
                  ))}
                  {recentProjects.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      プロジェクトがありません
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

        </div>

        {/* Quick Actions */}
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>クイックアクション</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/projects">
                  <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Plus className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">新規プロジェクト</div>
                      <div className="text-xs text-gray-500">プロジェクトを作成</div>
                    </div>
                  </Button>
                </Link>

              </div>
            </CardContent>
          </Card>
        </div>
      </div>
  );
}
