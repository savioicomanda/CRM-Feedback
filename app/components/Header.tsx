'use client';

import React from 'react';
import { Search, Bell, Settings } from 'lucide-react';
import { useAuth } from './FirebaseProvider';

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const { user } = useAuth();

  return (
    <header className="w-full sticky top-0 z-30 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm dark:shadow-none flex justify-between items-center px-8 py-4">
      <div>
        <h2 className="tracking-tight text-xl font-bold text-orange-800 dark:text-orange-400">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 font-medium">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-6">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            className="bg-slate-100 border-none rounded-full pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-orange-500 w-64" 
            placeholder="Procurar feedbacks..." 
            type="text"
          />
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 text-slate-500 hover:bg-slate-200/50 rounded-full transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          <button className="p-2 text-slate-500 hover:bg-slate-200/50 rounded-full transition-colors">
            <Settings className="w-5 h-5" />
          </button>
          <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-orange-200 ml-2">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold">
                {user?.displayName?.[0] || user?.email?.[0] || 'U'}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
