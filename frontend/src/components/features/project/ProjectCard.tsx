"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Project } from '@/types';
import {
  MoreVertical,
  Users,
  GitBranch,
  Lock,
  LayoutGrid,
  Clock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

interface ProjectCardProps {
  project: Project;
  onToggleStar?: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Card className="group hover:shadow-lg transition-shadow cursor-pointer">
      <Link href={`/project/${project.id}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900 truncate">
                  {project.name}
                </h3>
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
            <div className="relative shrink-0">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setMenuOpen(!menuOpen);
                }}
                className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-1 z-50 w-36 rounded-lg border border-gray-200 bg-white shadow-lg p-1">
                  <button
                    onClick={(e) => { e.preventDefault(); setMenuOpen(false); }}
                    className="w-full text-left px-2 py-1.5 rounded-md text-sm hover:bg-gray-50"
                  >
                    名前を変更
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); setMenuOpen(false); }}
                    className="w-full text-left px-2 py-1.5 rounded-md text-sm hover:bg-gray-50"
                  >
                    共有
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setMenuOpen(false);
                      onDelete(project.id);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-md text-sm text-red-600 hover:bg-red-50"
                  >
                    削除
                  </button>
                </div>
              )}
            </div>
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
  );
}
