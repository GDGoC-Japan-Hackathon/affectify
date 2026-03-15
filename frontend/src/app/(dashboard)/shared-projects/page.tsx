"use client";

import { useState, useMemo } from 'react';
import { ProjectCard } from '@/components/features/project/ProjectCard';
import { mockProjects, mockUser } from '@/data/mockData';
import { Project } from '@/types/type';
import { Button } from '@/components/ui/button';
import {
  LayoutGrid,
  List,
  Clock,
  TrendingUp,
  Filter,
  Folder,
} from 'lucide-react';

export default function SharedProjectsPage() {
  const [projects] = useState<Project[]>(mockProjects);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'score'>('recent');
  const [sortOpen, setSortOpen] = useState(false);

  const filteredProjects = useMemo(() => {
    let filtered = projects.filter(
      (p) => p.ownerId !== mockUser.id && p.members.includes(mockUser.id)
    );

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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">共有プロジェクト</h1>
          <p className="text-gray-600">
            {filteredProjects.length}件のプロジェクト
          </p>
        </div>

        {/* View & Sort Controls */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setSortOpen(!sortOpen)}
              className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-3 h-8 text-sm font-medium hover:bg-gray-50"
            >
              <Filter className="w-4 h-4 mr-2" />
              {sortBy === 'recent' ? '最終更新日' : sortBy === 'name' ? '名前順' : 'スコア順'}
            </button>
            {sortOpen && (
              <div className="absolute right-0 mt-1 z-50 w-40 rounded-lg border border-gray-200 bg-white shadow-lg p-1">
                {([['recent', '最終更新日', Clock], ['name', '名前順', Folder], ['score', 'スコア順', TrendingUp]] as const).map(([key, label, Icon]) => (
                  <button
                    key={key}
                    onClick={() => { setSortBy(key); setSortOpen(false); }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm ${sortBy === key ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

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
            共有されたプロジェクトはまだありません
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
