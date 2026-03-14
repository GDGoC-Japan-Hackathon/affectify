"use client";

import { useState } from 'react';
import { mockTeams } from '@/data/mockData';
import { Team, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Users,
  Crown,
  Shield,
  User as UserIcon,
  MoreVertical,
  Mail,
  Calendar,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>(mockTeams);

  const getRoleIcon = (_member: User) => {
    return <UserIcon className="w-3.5 h-3.5 text-gray-600" />;
  };

  return (
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">チーム</h1>
            <p className="text-gray-600">
              チームメンバーと協力してプロジェクトを進めましょう
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            新規チーム
          </Button>
        </div>

        {/* Teams Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {teams.map((team, index) => (
            <div
              key={team.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Team Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {team.name}
                      </h3>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDistanceToNow(team.createdAt, {
                          addSuffix: true,
                          locale: ja,
                        })}
                        に作成
                      </p>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent">
                        <MoreVertical className="w-4 h-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>チーム設定</DropdownMenuItem>
                      <DropdownMenuItem>メンバーを招待</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600">
                        チームを削除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>{team.members.length} メンバー</span>
                  </div>
                </div>
              </div>

              {/* Members List */}
              <div className="p-6">
                <div className="space-y-3">
                  {team.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback>{member.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 truncate">
                              {member.name}
                            </p>
                            {getRoleIcon(member)}
                          </div>
                          <p className="text-sm text-gray-500 truncate flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5" />
                            {member.email}
                          </p>
                        </div>
                      </div>

                      <Badge variant="outline" className="ml-2">
                        メンバー
                      </Badge>
                    </div>
                  ))}
                </div>

                <Button
                  variant="outline"
                  className="w-full mt-4 gap-2"
                  size="sm"
                >
                  <Plus className="w-4 h-4" />
                  メンバーを招待
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {teams.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              チームがありません
            </h3>
            <p className="text-gray-600 mb-6">
              最初のチームを作成して、メンバーを招待しましょう
            </p>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              新規チーム作成
            </Button>
          </div>
        )}
      </div>
  );
}
