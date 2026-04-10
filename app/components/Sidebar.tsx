'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, MessageSquare, Users, BarChart3, Plus, HelpCircle, LogOut, ChevronDown, ChevronRight, FileText, Settings, Building2 } from 'lucide-react';
import { useAuth } from './FirebaseProvider';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();
  const { logout, companySettings } = useAuth();

  const [reportsOpen, setReportsOpen] = React.useState(true);

  const navItems = [
    { name: 'Painel', href: '/', icon: LayoutDashboard },
    { name: 'Feedback', href: '/feedback', icon: MessageSquare },
    { name: 'Configurações', href: '/settings', icon: Settings },
  ];

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-slate-100 dark:bg-slate-950 flex flex-col py-8 font-medium transition-all duration-300 ease-in-out z-40">
      <div className="px-6 mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-orange-600 flex items-center justify-center flex-shrink-0">
            {companySettings.logoUrl ? (
              <img src={companySettings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Building2 className="text-white w-6 h-6" />
            )}
          </div>
          <div>
            <h1 className="font-bold text-orange-900 dark:text-orange-200 text-lg leading-tight truncate max-w-[140px]">
              {companySettings.name}
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 truncate max-w-[140px]">
              {companySettings.description}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                isActive 
                  ? "text-orange-800 dark:text-orange-300 font-bold border-r-4 border-orange-700 dark:border-orange-500 bg-orange-50/50" 
                  : "text-slate-600 dark:text-slate-400 hover:bg-orange-50 dark:hover:bg-orange-900/20"
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}

        {/* Relatórios Section */}
        <div className="space-y-1">
          <button
            onClick={() => setReportsOpen(!reportsOpen)}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all text-slate-600 dark:text-slate-400 hover:bg-orange-50 dark:hover:bg-orange-900/20",
              pathname.startsWith('/reports') && "text-orange-800 dark:text-orange-300 font-bold"
            )}
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5" />
              <span>Relatórios</span>
            </div>
            {reportsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          {reportsOpen && (
            <div className="pl-10 space-y-1">
              <Link
                href="/reports/feedbacks"
                className={cn(
                  "flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-all",
                  pathname === '/reports/feedbacks'
                    ? "text-orange-700 dark:text-orange-400 font-bold"
                    : "text-slate-500 dark:text-slate-500 hover:text-orange-600"
                )}
              >
                <FileText className="w-4 h-4" />
                <span>Relatório de Feedbacks</span>
              </Link>
            </div>
          )}
        </div>
      </nav>

      <div className="px-4 mt-auto space-y-2">
        <Link href="/help" className="flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-orange-50 transition-all rounded-lg">
          <HelpCircle className="w-5 h-5" />
          <span>Ajuda</span>
        </Link>
        <button 
          onClick={() => logout()}
          className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-orange-50 transition-all rounded-lg"
        >
          <LogOut className="w-5 h-5" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
