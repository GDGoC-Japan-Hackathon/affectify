"use client";

import { mockProjects, mockUser, mockTeams } from '@/data/mockData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  LayoutGrid,
  Activity,
  GitBranch,
  Users,
  ArrowRight,
  CheckCircle2,
  MessageSquare,
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

  const myTeam = mockTeams[0];
  const teamActivity = [
    {
      id: '1',
      user: 'user-2',
      userName: '田中太郎',
      action: '設計案を作成',
      target: 'モジュラー設計案',
      project: 'Eコマースプラットフォーム',
      time: new Date('2024-03-14T10:30:00'),
      type: 'branch',
    },
    {
      id: '2',
      user: 'user-3',
      userName: '佐藤花子',
      action: 'コメントを追加',
      target: 'レガシー互換設計',
      project: 'Eコマースプラットフォーム',
      time: new Date('2024-03-14T09:15:00'),
      type: 'comment',
    },
    {
      id: '3',
      user: 'user-2',
      userName: '田中太郎',
      action: 'プロジェクトを作成',
      target: 'ダッシュボード UI',
      time: new Date('2024-03-13T16:45:00'),
      type: 'create',
    },
    {
      id: '4',
      user: 'user-1',
      userName: mockUser.name,
      action: 'AI分析を実行',
      target: 'APIゲートウェイ',
      time: new Date('2024-03-13T14:20:00'),
      type: 'analysis',
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'branch':
        return GitBranch;
      case 'comment':
        return MessageSquare;
      case 'create':
        return Plus;
      case 'analysis':
        return Activity;
      default:
        return CheckCircle2;
    }
  };

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

          {/* Team Activity */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  チームアクティビティ
                </CardTitle>
                <CardDescription>{myTeam.name}の最近の活動</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teamActivity.map((activity) => {
                    const Icon = getActivityIcon(activity.type);
                    return (
                      <div key={activity.id} className="flex gap-3">
                        <Avatar className="w-8 h-8 shrink-0">
                          <AvatarImage
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${activity.user}`}
                          />
                          <AvatarFallback>
                            {activity.userName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                            <span className="text-sm text-gray-900 font-medium truncate">
                              {activity.userName}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            {activity.action}{' '}
                            <span className="font-medium">{activity.target}</span>
                            {activity.project && (
                              <>
                                {' '}in{' '}
                                <span className="font-medium">{activity.project}</span>
                              </>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDistanceToNow(activity.time, { locale: ja, addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
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

                <Link href="/community">
                  <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4">
                    <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">コミュニティを探索</div>
                      <div className="text-xs text-gray-500">公開プロジェクトを見る</div>
                    </div>
                  </Button>
                </Link>

                <Link href="/teams">
                  <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4">
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">チーム管理</div>
                      <div className="text-xs text-gray-500">メンバーを招待</div>
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
