"use client";

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Folder,
  Globe,
  Users,
  Settings,
  Search,
  Plus,
  Bell,
  LogOut,
  ChevronDown,
  LayoutGrid,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { mockUser, mockTeams } from '@/data/mockData';
import { CreateProjectDialog } from '@/components/CreateProjectDialog';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState(mockTeams[0]);
  const [teamSelectorOpen, setTeamSelectorOpen] = useState(false);
  const [showCreateProjectDialog, setShowCreateProjectDialog] = useState(false);

  const personalNavigation = [
    { name: 'ホーム', href: '/', icon: Home },
    { name: 'プロジェクト', href: '/projects', icon: Folder },
    { name: '設計書ライブラリ', href: '/design-guides', icon: BookOpen },
  ];

  const teamNavigation = [
    { name: 'チームプロジェクト', href: '/team/projects', icon: LayoutGrid },
    { name: 'メンバー', href: '/team/members', icon: Users },
  ];

  const communityNavigation = [
    { name: 'コミュニティ', href: '/community', icon: Globe },
  ];

  const settingsNavigation = [
    { name: '設定', href: '/settings', icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CD</span>
            </div>
            <span className="font-semibold text-gray-900">CodeDesign</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3">
          {/* Personal Navigation */}
          <div className="space-y-1 mb-4">
            {personalNavigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                    ${
                      active
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Separator */}
          <div className="my-4 border-t border-gray-200" />

          {/* Team Selector */}
          <div className="mb-4 relative">
            <button
              onClick={() => setTeamSelectorOpen(!teamSelectorOpen)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-blue-100 text-blue-700">
                  {selectedTeam.name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {selectedTeam.name}
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${teamSelectorOpen ? 'rotate-180' : ''}`} />
            </button>
            {teamSelectorOpen && (
              <div className="absolute left-0 right-0 mt-1 z-50 rounded-lg border border-gray-200 bg-white shadow-lg p-1">
                <div className="px-2 py-1.5 text-xs font-medium text-gray-500">チームを切り替え</div>
                {mockTeams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => {
                      setSelectedTeam(team);
                      setTeamSelectorOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                      selectedTeam.id === team.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
                    }`}
                  >
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                        {team.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    {team.name}
                  </button>
                ))}
                <div className="border-t border-gray-100 mt-1 pt-1">
                  <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-gray-50">
                    <Plus className="w-4 h-4" />
                    新しいチームを作成
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Team Navigation */}
          <div className="space-y-1">
            {teamNavigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                    ${
                      active
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Separator */}
          <div className="my-4 border-t border-gray-200" />

          {/* Community Navigation */}
          <div className="space-y-1">
            {communityNavigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                    ${
                      active
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Separator */}
          <div className="my-4 border-t border-gray-200" />

          {/* Settings Navigation */}
          <div className="space-y-1">
            {settingsNavigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                    ${
                      active
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User Profile */}
        <div className="p-3 border-t border-gray-200">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={mockUser.avatar} />
                  <AvatarFallback>{mockUser.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {mockUser.name}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {mockUser.email}
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>アカウント</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings className="w-4 h-4 mr-2" />
                設定
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Bell className="w-4 h-4 mr-2" />
                通知
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                <LogOut className="w-4 h-4 mr-2" />
                ログアウト
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="プロジェクトを検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-50 border-gray-200"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </Button>

            <Button className="gap-2" onClick={() => setShowCreateProjectDialog(true)}>
              <Plus className="w-4 h-4" />
              新規プロジェクト
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={showCreateProjectDialog}
        onOpenChange={setShowCreateProjectDialog}
      />
    </div>
  );
}
