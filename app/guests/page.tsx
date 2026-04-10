'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { useAuth } from '../components/FirebaseProvider';
import { db, handleFirestoreError, OperationType } from '@/firebase';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { Star, Calendar, Tag, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function GuestLedger() {
  const { user, loading } = useAuth();
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [filter, setFilter] = useState({
    range: 'Últimos 30 Dias',
    rating: 'Todas as Avaliações',
    category: 'Todas as Categorias'
  });

  useEffect(() => {
    if (!user) return;

    let q = query(collection(db, 'feedbacks'), orderBy('timestamp', 'desc'));

    if (filter.category !== 'Todas as Categorias') {
      q = query(q, where('category', '==', filter.category.toUpperCase()));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFeedbacks(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'feedbacks');
    });

    return () => unsubscribe();
  }, [user, filter]);

  if (loading) return <div className="flex items-center justify-center h-screen">Carregando...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar />
      <main className="ml-64 min-h-screen">
        <Header title="The Culinary Ledger" subtitle="Livro de Feedback dos Hóspedes" />
        
        <section className="p-10 max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-orange-600 mb-2 block">Central de Gerenciamento</span>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Feedback dos Hóspedes</h1>
              <p className="text-slate-500 max-w-md">Refinando a arte do serviço através do sentimento direto dos hóspedes e análise de dados categorizados.</p>
            </div>
            <div className="bg-white p-6 rounded-xl flex gap-8 items-center border border-slate-100 shadow-sm">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Satisfação Média</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black text-orange-900">4.8</span>
                  <div className="flex pb-1">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={cn("w-3 h-3", s <= 4 ? "fill-orange-600 text-orange-600" : "text-slate-200")} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="w-px h-10 bg-slate-100"></div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Total de Respostas</p>
                <span className="text-3xl font-black text-slate-900">{feedbacks.length}</span>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-slate-50 p-2 rounded-2xl mb-8 flex flex-wrap items-center gap-4 border border-slate-100">
            <div className="flex-1 min-w-[200px] px-4 py-2 bg-white rounded-xl flex items-center gap-3 shadow-sm">
              <Calendar className="text-slate-400 w-4 h-4" />
              <select 
                value={filter.range}
                onChange={(e) => setFilter({ ...filter, range: e.target.value })}
                className="bg-transparent border-none text-sm font-medium w-full focus:ring-0"
              >
                <option>Últimos 30 Dias</option>
                <option>Último Trimestre</option>
                <option>Ano Atual</option>
                <option>Período Personalizado</option>
              </select>
            </div>
            <div className="flex-1 min-w-[200px] px-4 py-2 bg-white rounded-xl flex items-center gap-3 shadow-sm">
              <Star className="text-slate-400 w-4 h-4" />
              <select 
                value={filter.rating}
                onChange={(e) => setFilter({ ...filter, rating: e.target.value })}
                className="bg-transparent border-none text-sm font-medium w-full focus:ring-0"
              >
                <option>Todas as Avaliações</option>
                <option>Apenas 5 Estrelas</option>
                <option>4 Estrelas ou menos</option>
                <option>Críticas (1-2 Estrelas)</option>
              </select>
            </div>
            <div className="flex-1 min-w-[200px] px-4 py-2 bg-white rounded-xl flex items-center gap-3 shadow-sm">
              <Tag className="text-slate-400 w-4 h-4" />
              <select 
                value={filter.category}
                onChange={(e) => setFilter({ ...filter, category: e.target.value })}
                className="bg-transparent border-none text-sm font-medium w-full focus:ring-0"
              >
                <option>Todas as Categorias</option>
                <option>Elogio</option>
                <option>Reclamação</option>
                <option>Sugestão</option>
              </select>
            </div>
            <button className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors">
              Aplicar Filtros
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] uppercase tracking-[0.2em] font-bold text-slate-500">
                    <th className="px-8 py-5">Data</th>
                    <th className="px-6 py-5">Nome do Cliente</th>
                    <th className="px-6 py-5">Nota Média</th>
                    <th className="px-6 py-5">Comentário</th>
                    <th className="px-6 py-5">Categoria</th>
                    <th className="px-8 py-5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {feedbacks.map((fb) => (
                    <tr key={fb.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-8 py-6">
                        <p className="text-sm font-semibold">
                          {fb.timestamp?.toDate ? format(fb.timestamp.toDate(), 'dd MMM, yyyy', { locale: ptBR }) : 'Hoje'}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {fb.timestamp?.toDate ? format(fb.timestamp.toDate(), 'HH:mm aa') : ''}
                        </p>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-xs">
                            {fb.guestName.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                          <span className="text-sm font-bold text-slate-900">{fb.guestName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-1 bg-orange-50 w-fit px-2 py-1 rounded-lg">
                          <span className="text-sm font-black text-orange-700">{fb.ratings.food.toFixed(1)}</span>
                          <Star className="w-3 h-3 fill-orange-600 text-orange-600" />
                        </div>
                      </td>
                      <td className="px-6 py-6 max-w-xs">
                        <p className="text-sm text-slate-600 line-clamp-2">{fb.comment}</p>
                      </td>
                      <td className="px-6 py-6">
                        <span className={cn(
                          "inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          fb.category === 'ELOGIO' ? "bg-blue-100 text-blue-700" : 
                          fb.category === 'RECLAMAÇÃO' ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"
                        )}>
                          {fb.category}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button className="p-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-orange-600">
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-8 py-5 bg-slate-50 flex items-center justify-between border-t border-slate-100">
              <p className="text-xs text-slate-500 font-medium">Exibindo {feedbacks.length} feedbacks</p>
              <div className="flex gap-2">
                <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-white transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-orange-600 text-white font-bold text-xs">1</button>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-white transition-colors text-xs font-bold">2</button>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-white transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
