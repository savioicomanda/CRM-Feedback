'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import { useAuth } from '../../components/FirebaseProvider';
import { db, handleFirestoreError, OperationType } from '@/firebase';
import { collection, query, orderBy, onSnapshot, where, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Star, Search, Filter, Calendar, Download, FileText, MoreVertical, Check, MessageSquare, Trash2, X, Send } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function FeedbackReport() {
  const { user, loading, companySettings } = useAuth();
  const canEdit = user?.isAdmin || user?.permissions?.canEdit;
  const canDelete = user?.isAdmin || user?.permissions?.canDelete;
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [categoryFilter, setCategoryFilter] = useState('TODOS');
  const [ratingFilter, setRatingFilter] = useState('TODOS');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'feedbacks'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFeedbacks(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'feedbacks');
    });

    return () => unsubscribe();
  }, [user]);

  const filteredFeedbacks = React.useMemo(() => {
    let result = feedbacks;

    if (searchTerm) {
      result = result.filter(fb => 
        fb.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fb.comment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fb.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fb.phone?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'TODOS') {
      result = result.filter(fb => fb.status === statusFilter);
    }

    if (categoryFilter !== 'TODOS') {
      result = result.filter(fb => fb.category === categoryFilter);
    }

    if (ratingFilter !== 'TODOS') {
      const minRating = parseInt(ratingFilter);
      result = result.filter(fb => {
        const avg = (fb.ratings.food + fb.ratings.service + fb.ratings.ambience) / 3;
        return avg >= minRating && avg < minRating + 1;
      });
    }

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      result = result.filter(fb => {
        const date = fb.timestamp?.toDate ? fb.timestamp.toDate() : new Date();
        return date >= start;
      });
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter(fb => {
        const date = fb.timestamp?.toDate ? fb.timestamp.toDate() : new Date();
        return date <= end;
      });
    }

    return result;
  }, [searchTerm, statusFilter, categoryFilter, ratingFilter, startDate, endDate, feedbacks]);

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'feedbacks', id), { status: newStatus });
      setActiveMenu(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `feedbacks/${id}`);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingTo || !replyText.trim()) return;
    
    try {
      await updateDoc(doc(db, 'feedbacks', replyingTo.id), { 
        status: 'RESPONDIDO',
        reply: replyText,
        repliedAt: serverTimestamp()
      });

      if (replyingTo.email) {
        try {
          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: replyingTo.email,
              subject: `Resposta ao seu feedback - ${companySettings.name}`,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                  <h2 style="color: #ea580c;">Olá, ${replyingTo.guestName}!</h2>
                  <p>Temos uma resposta para o seu feedback recente:</p>
                  <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #ea580c; margin: 20px 0;">
                    <p style="margin: 0; color: #334155;">${replyText}</p>
                  </div>
                  <p>Agradecemos imensamente sua visita e esperamos vê-lo novamente em breve!</p>
                  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                  <p style="font-size: 12px; color: #666;">Atenciosamente,<br>Equipe ${companySettings.name}</p>
                </div>
              `
            })
          });
        } catch (emailError) {
          console.error('Error sending reply email:', emailError);
        }
      }

      setReplyingTo(null);
      setReplyText('');
      alert('Resposta enviada com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `feedbacks/${replyingTo.id}`);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteDoc(doc(db, 'feedbacks', deletingId));
      setDeletingId(null);
      setActiveMenu(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `feedbacks/${deletingId}`);
    }
  };

  if (loading) return null;
  if (!user) return null;

  if (!user.isAdmin && !user.permissions?.canEdit && !user.permissions?.canDelete) {
    return (
      <div className="min-h-screen bg-surface">
        <Sidebar />
        <main className="ml-64 min-h-screen flex items-center justify-center p-10">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <Star className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 italic serif">Acesso Restrito</h2>
            <p className="text-slate-500 font-medium">
              Você não tem permissão para acessar esta área. Entre em contato com o administrador do sistema.
            </p>
            <button 
              onClick={() => window.location.href = '/'}
              className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all"
            >
              Voltar ao Início
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar />
      <main className="lg:ml-20 min-h-screen transition-all duration-300">
        <Header title="Relatório de Feedbacks" subtitle="Listagem completa e filtros avançados" />
        
        <div className="p-4 md:p-10 space-y-8">
          {/* Filters Bar */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 space-y-2 w-full">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Pesquisar</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Nome, e-mail, comentário ou telefone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border-none focus:ring-2 focus:ring-orange-600 rounded-xl pl-12 pr-4 py-3 text-sm font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2 w-full md:w-48">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Status</label>
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-slate-50 border-none focus:ring-2 focus:ring-orange-600 rounded-xl px-4 py-3 text-sm font-medium"
                >
                  <option value="TODOS">Todos os Status</option>
                  <option value="PENDENTE">Pendente</option>
                  <option value="VISUALIZADO">Visualizado</option>
                  <option value="RESPONDIDO">Respondido</option>
                </select>
              </div>

              <div className="space-y-2 w-full md:w-48">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Categoria</label>
                <select 
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full bg-slate-50 border-none focus:ring-2 focus:ring-orange-600 rounded-xl px-4 py-3 text-sm font-medium"
                >
                  <option value="TODOS">Todas Categorias</option>
                  <option value="ELOGIO">Elogio</option>
                  <option value="RECLAMAÇÃO">Reclamação</option>
                  <option value="SUGESTÃO">Sugestão</option>
                </select>
              </div>

              <div className="space-y-2 w-full md:w-48">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Avaliação</label>
                <select 
                  value={ratingFilter}
                  onChange={(e) => setRatingFilter(e.target.value)}
                  className="w-full bg-slate-50 border-none focus:ring-2 focus:ring-orange-600 rounded-xl px-4 py-3 text-sm font-medium"
                >
                  <option value="TODOS">Todas Estrelas</option>
                  <option value="5">5 Estrelas</option>
                  <option value="4">4 Estrelas</option>
                  <option value="3">3 Estrelas</option>
                  <option value="2">2 Estrelas</option>
                  <option value="1">1 Estrela</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-end pt-4 border-t border-slate-50">
              <div className="space-y-2 w-full md:w-64">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Data Inicial</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input 
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 border-none focus:ring-2 focus:ring-orange-600 rounded-xl pl-12 pr-4 py-3 text-sm font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2 w-full md:w-64">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Data Final</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input 
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-50 border-none focus:ring-2 focus:ring-orange-600 rounded-xl pl-12 pr-4 py-3 text-sm font-medium"
                  />
                </div>
              </div>

              <div className="flex-1"></div>

              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('TODOS');
                    setCategoryFilter('TODOS');
                    setRatingFilter('TODOS');
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Limpar Filtros
                </button>
                <button className="bg-slate-900 text-white p-3 rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200 flex items-center gap-2 px-6">
                  <Download className="w-5 h-5" />
                  <span className="text-sm font-bold">Exportar</span>
                </button>
              </div>
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 pb-20">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-900">Resultados ({filteredFeedbacks.length})</h3>
              <div className="flex gap-2">
                <span className="flex items-center gap-1 text-xs font-bold text-slate-400">
                  <Calendar className="w-3 h-3" />
                  Total Histórico
                </span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Data</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cliente</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Telefone</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Avaliação</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Comentário</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Status</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredFeedbacks.length > 0 ? (
                    filteredFeedbacks.map((fb) => (
                      <tr key={fb.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-8 py-5">
                          <p className="text-sm font-medium text-slate-900">
                            {fb.timestamp?.toDate ? format(fb.timestamp.toDate(), 'dd MMM, yyyy', { locale: ptBR }) : 'Recent'}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {fb.timestamp?.toDate ? format(fb.timestamp.toDate(), 'HH:mm', { locale: ptBR }) : ''}
                          </p>
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-sm font-bold text-slate-900">{fb.guestName}</p>
                          <p className="text-xs text-slate-400">{fb.email}</p>
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-sm text-slate-600">{fb.phone || <span className="text-slate-300 italic">Não informado</span>}</p>
                        </td>
                        <td className="px-6 py-5">
                          {(() => {
                            const avg = (fb.ratings.food + fb.ratings.service + fb.ratings.ambience) / 3;
                            return (
                              <div className="flex items-center gap-4 min-w-[160px]">
                                <div className={cn(
                                  "w-12 h-12 rounded-2xl flex flex-col items-center justify-center shadow-sm border transition-all",
                                  avg >= 4.5 ? "bg-green-50 border-green-200 text-green-700" :
                                  avg >= 3.5 ? "bg-blue-50 border-blue-200 text-blue-700" :
                                  avg >= 2.5 ? "bg-orange-50 border-orange-200 text-orange-700" :
                                  "bg-red-50 border-red-200 text-red-700"
                                )}>
                                  <span className="text-lg font-black leading-none">{avg.toFixed(1)}</span>
                                  <Star className="w-2.5 h-2.5 fill-current mt-0.5" />
                                </div>
                                <div className="flex flex-col gap-1.5 flex-1">
                                  {[
                                    { label: 'Comida', val: fb.ratings.food, color: 'bg-orange-500' },
                                    { label: 'Serviço', val: fb.ratings.service, color: 'bg-blue-500' },
                                    { label: 'Ambiente', val: fb.ratings.ambience, color: 'bg-slate-500' }
                                  ].map((r) => (
                                    <div key={r.label} className="flex items-center gap-2">
                                      <span className="text-[8px] font-bold text-slate-400 uppercase w-12 tracking-tighter">{r.label}</span>
                                      <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                                        <motion.div 
                                          initial={{ width: 0 }}
                                          animate={{ width: `${(r.val / 5) * 100}%` }}
                                          className={cn("h-full rounded-full", r.color)} 
                                        />
                                      </div>
                                      <span className="text-[9px] font-black text-slate-700 w-3">{r.val}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-5 max-w-xs">
                          <p className="text-sm text-slate-600 line-clamp-2">{fb.comment || <span className="text-slate-300 italic">Sem comentário</span>}</p>
                          {fb.category && (
                            <span className="inline-block mt-2 px-2 py-0.5 bg-slate-100 text-[9px] font-bold text-slate-500 rounded">
                              {fb.category}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className={cn(
                            "inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter",
                            fb.status === 'RESPONDIDO' ? "bg-green-100 text-green-700" : 
                            fb.status === 'VISUALIZADO' ? "bg-blue-100 text-blue-700" : 
                            "bg-red-100 text-red-700"
                          )}>
                            {fb.status}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right relative">
                          <button 
                            onClick={() => setActiveMenu(activeMenu === fb.id ? null : fb.id)}
                            className={cn(
                              "transition-all p-2 rounded-xl flex items-center justify-center ml-auto",
                              activeMenu === fb.id ? "bg-orange-600 text-white shadow-lg" : "text-slate-400 hover:text-orange-600 hover:bg-orange-50"
                            )}
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>

                          <AnimatePresence>
                            {activeMenu === fb.id && (
                              <>
                                <div 
                                  className="fixed inset-0 z-20" 
                                  onClick={() => setActiveMenu(null)}
                                />
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.95, x: 10 }}
                                  animate={{ opacity: 1, scale: 1, x: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, x: 10 }}
                                  className="absolute right-full top-0 mr-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 py-2"
                                >
                                  <div className="px-2 py-1">
                                    {fb.status === 'PENDENTE' && canEdit && (
                                      <button 
                                        onClick={() => handleStatusUpdate(fb.id, 'VISUALIZADO')}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors"
                                      >
                                        <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                                          <Check className="w-4 h-4" />
                                        </div>
                                        Marcar como Lido
                                      </button>
                                    )}
                                    {canEdit && (
                                      <button 
                                        onClick={() => {
                                          setReplyingTo(fb);
                                          setActiveMenu(null);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors"
                                      >
                                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                                          <MessageSquare className="w-4 h-4" />
                                        </div>
                                        Responder
                                      </button>
                                    )}
                                    {canDelete && (
                                      <>
                                        <div className="h-px bg-slate-50 my-1 mx-2" />
                                        <button 
                                          onClick={() => {
                                            setDeletingId(fb.id);
                                            setActiveMenu(null);
                                          }}
                                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                        >
                                          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
                                            <Trash2 className="w-4 h-4" />
                                          </div>
                                          Excluir
                                        </button>
                                      </>
                                    )}
                                    {!canEdit && !canDelete && (
                                      <div className="px-4 py-3 text-xs text-slate-400 italic text-center">
                                        Sem permissões de ação
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-8 py-20 text-center text-slate-400">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-10" />
                        <p className="font-medium">Nenhum feedback encontrado com estes filtros.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Reply Modal */}
        <AnimatePresence>
          {replyingTo && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setReplyingTo(null)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100"
              >
                <div className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-slate-900">Responder Feedback</h3>
                    <button 
                      onClick={() => setReplyingTo(null)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  
                  <div className="bg-slate-50 p-4 rounded-xl mb-6 border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Feedback de {replyingTo.guestName}</p>
                    <p className="text-sm text-slate-600 italic">&quot;{replyingTo.comment}&quot;</p>
                  </div>

                  <form onSubmit={handleReply} className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Sua Resposta</label>
                      <textarea 
                        autoFocus
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="w-full bg-slate-50 border-none focus:ring-2 focus:ring-orange-600 rounded-xl p-4 text-slate-900 font-medium placeholder:text-slate-400" 
                        placeholder="Digite sua resposta aqui..." 
                        rows={5}
                        required
                      />
                    </div>
                    <div className="flex gap-4">
                      <button 
                        type="button"
                        onClick={() => setReplyingTo(null)}
                        className="flex-1 px-6 py-3 rounded-full font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit"
                        className="flex-1 bg-orange-600 text-white px-6 py-3 rounded-full font-bold shadow-lg hover:bg-orange-700 transition-all flex items-center justify-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        Enviar Resposta
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {deletingId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDeletingId(null)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100"
              >
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Trash2 className="text-red-600 w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Excluir Feedback?</h3>
                  <p className="text-slate-500 mb-8">Esta ação não pode ser desfeita. O feedback será removido permanentemente.</p>
                  
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setDeletingId(null)}
                      className="flex-1 px-6 py-3 rounded-full font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handleDelete}
                      className="flex-1 bg-red-600 text-white px-6 py-3 rounded-full font-bold shadow-lg hover:bg-red-700 transition-all"
                    >
                      Confirmar Exclusão
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
