'use client';

import React from 'react';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { useAuth } from '../components/FirebaseProvider';
import { BarChart3 } from 'lucide-react';

export default function Analytics() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar />
      <main className="lg:ml-64 min-h-screen">
        <Header title="Análises" subtitle="Métricas avançadas de desempenho" />
        <div className="p-4 md:p-10 flex flex-col items-center justify-center h-[calc(100vh-100px)] text-slate-400">
          <BarChart3 className="w-16 h-16 mb-4 opacity-20" />
          <p className="text-xl font-bold">Módulo de Análises em desenvolvimento</p>
          <p>Em breve você terá acesso a gráficos detalhados de tendências.</p>
        </div>
      </main>
    </div>
  );
}
