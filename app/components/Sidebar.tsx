'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, MessageSquare, Users, BarChart3, Plus, HelpCircle, LogOut, ChevronDown, ChevronRight, FileText, Settings, Building2, Menu, X as CloseIcon, TrendingUp } from 'lucide-react';
import { useAuth } from './FirebaseProvider';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, companySettings } = useAuth();

  const [reportsOpen, setReportsOpen] = React.useState(true);
  const [cadastroOpen, setCadastroOpen] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);

  const navItems = [
    { name: 'Painel', href: '/', icon: LayoutDashboard },
    { name: 'Feedback', href: '/feedback', icon: MessageSquare },
  ];

  const isAdmin = user?.isAdmin;
  const hasPermissions = user?.permissions?.canEdit || user?.permissions?.canDelete;

  return (
    <>
      {/* Mobile Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-100 dark:border-slate-800 text-orange-600"
      >
        {isOpen ? <CloseIcon className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="lg:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      <aside className={cn(
        "h-screen w-64 fixed left-0 top-0 bg-slate-100 dark:bg-slate-950 flex flex-col py-8 font-medium transition-all duration-300 ease-in-out z-40 lg:translate-x-0",
        isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      )}>
        <div className="px-6 mb-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
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
          <button onClick={() => setIsOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-600">
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
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

          {isAdmin && (
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                pathname === '/settings'
                  ? "text-orange-800 dark:text-orange-300 font-bold border-r-4 border-orange-700 dark:border-orange-500 bg-orange-50/50" 
                  : "text-slate-600 dark:text-slate-400 hover:bg-orange-50 dark:hover:bg-orange-900/20"
              )}
            >
              <Settings className="w-5 h-5" />
              <span>Configurações</span>
            </Link>
          )}

          {/* Cadastro Section */}
          {isAdmin && (
            <div className="space-y-1">
              <button
                onClick={() => setCadastroOpen(!cadastroOpen)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all text-slate-600 dark:text-slate-400 hover:bg-orange-50 dark:hover:bg-orange-900/20",
                  pathname.startsWith('/users') && "text-orange-800 dark:text-orange-300 font-bold"
                )}
              >
                <div className="flex items-center gap-3">
                  <Plus className="w-5 h-5" />
                  <span>Cadastro</span>
                </div>
                {cadastroOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>

              {cadastroOpen && (
                <div className="pl-10 space-y-1">
                  <Link
                    href="/users"
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-all",
                      pathname === '/users'
                        ? "text-orange-700 dark:text-orange-400 font-bold"
                        : "text-slate-500 dark:text-slate-500 hover:text-orange-600"
                    )}
                  >
                    <Users className="w-4 h-4" />
                    <span>Usuários</span>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Relatórios Section */}
          {(isAdmin || hasPermissions) && (
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
                    onClick={() => setIsOpen(false)}
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
                  {isAdmin && (
                    <Link
                      href="/analytics"
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-all",
                        pathname === '/analytics'
                          ? "text-orange-700 dark:text-orange-400 font-bold"
                          : "text-slate-500 dark:text-slate-500 hover:text-orange-600"
                      )}
                    >
                      <TrendingUp className="w-4 h-4" />
                      <span>Análises</span>
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="px-4 mt-auto space-y-2">
          <Link href="/help" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-orange-50 transition-all rounded-lg">
            <HelpCircle className="w-5 h-5" />
            <span>Ajuda</span>
          </Link>
          <button 
            onClick={() => {
              setIsOpen(false);
              logout();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-orange-50 transition-all rounded-lg"
          >
            <LogOut className="w-5 h-5" />
            <span>Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}
