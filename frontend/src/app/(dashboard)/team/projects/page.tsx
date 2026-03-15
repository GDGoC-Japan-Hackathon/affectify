"use client";

import { mockProjects, mockUser } from '@/data/mockData';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LayoutGrid,
  List,
  Star,
  MoreVertical,
  Clock,
  GitBranch,
  Users,
  Lock,
} from 'lucide-react';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function TeamProjects() {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'score'>('recent');

  // Filter team projects (not created by current user)
  const teamProjects = useMemo(() => {
    let filtered = mockProjects.filter(p => p.ownerId !== mockUser.id && p.shareSettings.sharedWithTeams?.length);

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'score':
          return (b.analysisScore || 0) - (a.analysisScore || 0);
        case 'recent':
        default:
          return b.updatedAt.getTime() - a.updatedAt.getTime();
      }
    });

    return filtered;
  }, [sortBy]);

  return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">チームプロジェクト</h1>
            <p className="text-gray-600">チームメンバーが作成したプロジェクト</p>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 h-8 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                    並び替え: {sortBy === 'recent' ? '最新順' : sortBy === 'name' ? '名前順' : 'スコア順'}
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setSortBy('recent')}>
                    最新順
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('name')}>
                    名前順
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('score')}>
                    スコア順
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={view === 'grid' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setView('grid')}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={view === 'list' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setView('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Projects Grid/List */}
          {teamProjects.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  チームプロジェクトがありません
                </h3>
                <p className="text-sm text-gray-500">
                  チームメンバーがプロジェクトを作成すると、ここに表示されます
                </p>
              </CardContent>
            </Card>
          ) : view === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teamProjects.map((project) => (
                <Card
                  key={project.id}
                  className="group hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <Link href={`/project/${project.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {project.name}
                            </h3>
                            {/* Visibility Badge */}
                            <div className="flex-shrink-0" title={project.shareSettings.visibility === 'private' ? '非公開' : 'チーム共有'}>
                              {project.shareSettings.visibility === 'private' ? (
                                <Lock className="w-3.5 h-3.5 text-gray-400" />
                              ) : (
                                <Users className="w-3.5 h-3.5 text-blue-500" />
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {project.description}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger onClick={(e) => e.preventDefault()} className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <MoreVertical className="w-4 h-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Star className="w-4 h-4 mr-2" />
                              スターを付ける
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <LayoutGrid className="w-3.5 h-3.5" />
                            {project.nodeCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <GitBranch className="w-3.5 h-3.5" />
                            {project.variants.length} 設計案
                          </span>
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
                          >
                            {project.analysisScore}
                          </Badge>
                        )}
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDistanceToNow(project.updatedAt, { locale: ja, addSuffix: true })}
                        </div>
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {teamProjects.map((project) => (
                <Card key={project.id} className="group hover:shadow-md transition-shadow">
                  <Link href={`/project/${project.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-semibold text-gray-900">{project.name}</h3>
                            {/* Visibility Badge */}
                            <div className="flex-shrink-0" title={project.shareSettings.visibility === 'private' ? '非公開' : 'チーム共有'}>
                              {project.shareSettings.visibility === 'private' ? (
                                <Lock className="w-3.5 h-3.5 text-gray-400" />
                              ) : (
                                <Users className="w-3.5 h-3.5 text-blue-500" />
                              )}
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
                              >
                                {project.analysisScore}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-1 mb-2">
                            {project.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <LayoutGrid className="w-3.5 h-3.5" />
                              {project.nodeCount} ノード
                            </span>
                            <span className="flex items-center gap-1">
                              <GitBranch className="w-3.5 h-3.5" />
                              {project.variants.length} 設計案
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {formatDistanceToNow(project.updatedAt, { locale: ja, addSuffix: true })}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Star className="w-4 h-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger onClick={(e) => e.preventDefault()} className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="w-4 h-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Star className="w-4 h-4 mr-2" />
                                スターを付ける
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
  );
}
