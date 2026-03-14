"use client";

import { useState, useMemo } from 'react';
import { ProjectCard } from '@/components/features/project/ProjectCard';
import { mockProjects, mockUser } from '@/data/mockData';
import { Project } from '@/types';
import { Button } from '@/components/ui/button';
import {
  LayoutGrid,
  List,
  Clock,
  TrendingUp,
  Filter,
  Folder,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'score'>('recent');

  // Filter and sort projects - only show MY projects
  const filteredProjects = useMemo(() => {
    let filtered = projects.filter(p => p.ownerId === mockUser.id);

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
  }, [projects, sortBy]);

  const myProjectsCount = filteredProjects.length;

  const handleDelete = (id: string) => {
    if (confirm('このプロジェクトを削除してもよろしいですか？')) {
      setProjects(prev => prev.filter(p => p.id !== id));
    }
  };

  return (
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">マイプロジェクト</h1>
            <p className="text-gray-600">
              {myProjectsCount}件のプロジェクト
            </p>
          </div>

          {/* View & Sort Controls */}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 h-8 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                  <Filter className="w-4 h-4 mr-2" />
                  並び替え
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>並び替え</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSortBy('recent')}>
                  <Clock className="w-4 h-4 mr-2" />
                  最終更新日
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('name')}>
                  <Folder className="w-4 h-4 mr-2" />
                  名前順
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('score')}>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  スコア順
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="border-l border-gray-200 pl-2 ml-2 flex gap-1">
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
        </div>

        {/* Projects */}
        {filteredProjects.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Folder className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              プロジェクトがまだありません
            </p>
          </div>
        ) : (
          <div
            className={
              view === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                : 'space-y-4'
            }
          >
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
  );
}
