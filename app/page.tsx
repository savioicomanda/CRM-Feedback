'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { useAuth } from './components/FirebaseProvider';
import { db, handleFirestoreError, OperationType } from '@/firebase';
import { collection, query, orderBy, limit, onSnapshot, getDocs, addDoc, serverTimestamp, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Star, Utensils, UserCheck, Sofa, FileText, MoreVertical, Check, Trash2, MessageSquare, Send, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const { user, loading, login, loginWithCredentials, companySettings } = useAuth();
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showCredentialsLogin, setShowCredentialsLogin] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [stats, setStats] = useState({
    nps: 0,
    food: 0,
    service: 0,
    ambience: 0,
    total: 0
  });

  useEffect(() => {
    if (!user) return;

    // Listen to ALL feedbacks for stats calculation
    const qAll = query(collection(db, 'feedbacks'));
    const unsubscribeStats = onSnapshot(qAll, (snapshot) => {
      const docs = snapshot.docs.map(doc => doc.data());
      if (docs.length === 0) {
        setStats({ nps: 0, food: 0, service: 0, ambience: 0, total: 0 });
        return;
      }

      const total = docs.length;
      let sumFood = 0;
      let sumService = 0;
      let sumAmbience = 0;
      let promoters = 0;
      let detractors = 0;

      docs.forEach((fb: any) => {
        sumFood += fb.ratings.food;
        sumService += fb.ratings.service;
        sumAmbience += fb.ratings.ambience;

        // Simple NPS calculation based on average rating
        const avg = (fb.ratings.food + fb.ratings.service + fb.ratings.ambience) / 3;
        if (avg >= 4.5) promoters++;
        if (avg <= 3) detractors++;
      });

      const nps = Math.round(((promoters - detractors) / total) * 100);

      setStats({
        nps: nps,
        food: parseFloat((sumFood / total).toFixed(1)),
        service: parseFloat((sumService / total).toFixed(1)),
        ambience: parseFloat((sumAmbience / total).toFixed(1)),
        total: total
      });
    });

    // Listen to recent feedbacks for the table
    const qRecent = query(collection(db, 'feedbacks'), orderBy('timestamp', 'desc'), limit(10));
    const unsubscribeRecent = onSnapshot(qRecent, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFeedbacks(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'feedbacks');
    });

    return () => {
      unsubscribeStats();
      unsubscribeRecent();
    };
  }, [user]);

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
      // For now, we just mark as RESPONDIDO and log the reply
      // In a real app, you might save the reply to a subcollection or send an email
      await updateDoc(doc(db, 'feedbacks', replyingTo.id), { 
        status: 'RESPONDIDO',
        reply: replyText,
        repliedAt: serverTimestamp()
      });

      // Send reply email
      if (replyingTo.email) {
        try {
          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: replyingTo.email,
              subject: 'Resposta ao seu feedback - The Culinary Ledger',
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

  const seedData = async () => {
    if (!user) return;
    const feedbackCollection = collection(db, 'feedbacks');
    const sampleFeedbacks = [
      {
        guestId: 'sample-1',
        guestName: 'Ana Martins',
        ratings: { food: 5, service: 5, ambience: 5 },
        comment: 'O risoto de açafrão estava divino, voltarei com certeza!',
        status: 'RESPONDIDO',
        category: 'ELOGIO',
        timestamp: serverTimestamp()
      },
      {
        guestId: 'sample-2',
        guestName: 'Ricardo Costa',
        ratings: { food: 5, service: 4, ambience: 5 },
        comment: 'Ótimo ambiente, mas o vinho demorou um pouco.',
        status: 'PENDENTE',
        category: 'RECLAMAÇÃO',
        timestamp: serverTimestamp()
      },
      {
        guestId: 'sample-3',
        guestName: 'Julia Paiva',
        ratings: { food: 5, service: 5, ambience: 5 },
        comment: 'Aniversário inesquecível, obrigado pela atenção!',
        status: 'RESPONDIDO',
        category: 'ELOGIO',
        timestamp: serverTimestamp()
      }
    ];

    for (const fb of sampleFeedbacks) {
      await addDoc(feedbackCollection, fb);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Carregando...</div>;

  if (!user) {
    const handleCredentialsLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoginError('');
      try {
        const success = await loginWithCredentials(username, password);
        if (!success) {
          setLoginError('Usuário ou senha inválidos.');
        }
      } catch (error: any) {
        console.error('Login error details:', error);
        if (error.code === 'auth/operation-not-allowed') {
          setLoginError('O login por usuário/senha não está ativado no Firebase Console. Por favor, ative-o em Authentication > Sign-in method.');
        } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
          setLoginError('Usuário ou senha inválidos.');
        } else {
          setLoginError('Erro ao fazer login: ' + (error.message || 'Tente novamente.'));
        }
      }
    };

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-surface p-4 text-center">
        <div className="w-20 h-20 bg-orange-600 rounded-xl flex items-center justify-center mb-6 shadow-lg overflow-hidden">
          {companySettings.logoUrl ? (
            <img src={companySettings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <Utensils className="text-white w-10 h-10" />
          )}
        </div>
        <h1 className="text-3xl font-bold mb-2">{companySettings.name}</h1>
        <p className="text-slate-500 mb-8 max-w-md">Faça login para gerenciar o feedback dos seus clientes e métricas de satisfação.</p>
        
        <div className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-xl border border-slate-100 space-y-6">
          {!showCredentialsLogin ? (
            <>
              <button 
                onClick={login}
                className="w-full bg-white border-2 border-slate-100 text-slate-700 px-8 py-4 rounded-2xl font-bold shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-3"
              >
                <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                Entrar com Google
              </button>
              
              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-slate-100"></div>
                <span className="flex-shrink mx-4 text-slate-400 text-xs font-bold uppercase tracking-widest">ou</span>
                <div className="flex-grow border-t border-slate-100"></div>
              </div>

              <button 
                onClick={() => setShowCredentialsLogin(true)}
                className="w-full bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold shadow-lg hover:bg-slate-800 transition-all"
              >
                Entrar com Usuário
              </button>
            </>
          ) : (
            <form onSubmit={handleCredentialsLogin} className="space-y-4 text-left">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Usuário</label>
                <input 
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50 border-none focus:ring-2 focus:ring-orange-600 rounded-xl px-4 py-3 text-sm font-medium"
                  placeholder="Seu usuário"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Senha</label>
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border-none focus:ring-2 focus:ring-orange-600 rounded-xl px-4 py-3 text-sm font-medium"
                  placeholder="Sua senha"
                  required
                />
              </div>
              
              {loginError && (
                <p className="text-red-500 text-xs font-bold ml-1">{loginError}</p>
              )}

              <button 
                type="submit"
                className="w-full bg-orange-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg hover:bg-orange-700 transition-all"
              >
                Entrar
              </button>
              
              <button 
                type="button"
                onClick={() => setShowCredentialsLogin(false)}
                className="w-full text-slate-400 text-xs font-bold hover:text-slate-600 transition-colors"
              >
                Voltar para opções de login
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar />
      <main className="ml-64 min-h-screen">
        <Header title="Dashboard do Gerente" subtitle="Visão geral de métricas de satisfação" />
        
        <div className="p-10 space-y-10">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-slate-900">Bem-vindo, {user?.displayName || (user?.email === 'admin@crmfeedback.com' ? 'Administrador' : 'Gerente')}</h1>
            <Link href="/feedback" target="_blank" className="bg-white border border-slate-200 px-6 py-2 rounded-full text-sm font-bold shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Ver Formulário de Feedback
            </Link>
          </div>

          {feedbacks.length === 0 && (
            <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl flex justify-between items-center">
              <p className="text-orange-800 font-medium">Parece que você ainda não tem dados. Deseja popular com exemplos?</p>
              <button onClick={seedData} className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold">Gerar Dados Exemplo</button>
            </div>
          )}

          {/* Bento Grid Metrics */}
          <div className="grid grid-cols-12 gap-8">
            {/* NPS Hero Card - Modern Circular Gauge Format */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="col-span-12 lg:col-span-7 bg-white rounded-[2rem] p-10 shadow-sm border border-slate-100 relative overflow-hidden flex flex-col md:flex-row gap-10 min-h-[340px]"
            >
              <div className="relative z-10 flex-1 flex flex-col justify-between">
                <div>
                  <span className="bg-orange-100 text-orange-700 px-4 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase mb-6 inline-block">Métrica Global</span>
                  <h3 className="text-3xl font-black text-slate-900 mb-2 leading-tight">Net Promoter Score</h3>
                  <p className="text-slate-500 max-w-xs text-sm font-medium">
                    O NPS mede a lealdade dos seus clientes e a probabilidade de recomendação.
                  </p>
                </div>
                
                <div className="space-y-4 mt-8">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 font-bold uppercase tracking-tighter text-[10px]">Desempenho</span>
                    <span className="text-orange-600 font-black">+{stats.nps > 0 ? '12%' : '0%'}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '72%' }}
                      className="h-full bg-orange-600 rounded-full"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium italic">
                    * Comparado ao mesmo período do mês anterior
                  </p>
                </div>
              </div>

              <div className="relative z-10 flex flex-col items-center justify-center bg-slate-50 rounded-[1.5rem] p-8 min-w-[240px]">
                <div className="relative w-40 h-40">
                  {/* Background Circle */}
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle 
                      cx="50" cy="50" r="45" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="8" 
                      className="text-slate-200"
                    />
                    {/* Progress Circle */}
                    <motion.circle 
                      cx="50" cy="50" r="45" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="8" 
                      strokeDasharray="282.7"
                      initial={{ strokeDashoffset: 282.7 }}
                      animate={{ strokeDashoffset: 282.7 - (282.7 * (stats.nps + 100) / 200) }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className="text-orange-600"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-black text-slate-900">{stats.nps}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Score</span>
                  </div>
                </div>
                <div className="mt-6 text-center">
                  <span className={cn(
                    "px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                    stats.nps > 70 ? "bg-green-100 text-green-700" : 
                    stats.nps > 40 ? "bg-blue-100 text-blue-700" : 
                    "bg-orange-100 text-orange-700"
                  )}>
                    {stats.nps > 70 ? 'Excelente' : stats.nps > 40 ? 'Bom' : 'Pode Melhorar'}
                  </span>
                </div>
              </div>
              
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-orange-50 rounded-full blur-3xl opacity-50" />
            </motion.div>

            {/* Snapshot Metrics Stack */}
            <div className="col-span-12 lg:col-span-5 grid grid-cols-2 gap-6">
              {[
                { label: 'Satisfação Comida', val: stats.food, icon: Utensils },
                { label: 'Serviço', val: stats.service, icon: UserCheck },
                { label: 'Ambiente', val: stats.ambience, icon: Sofa },
                { label: 'Total Avaliações', val: stats.total, icon: Star, fill: true },
              ].map((m, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white p-8 rounded-xl flex flex-col justify-between shadow-sm border border-slate-100"
                >
                  <m.icon className={cn("w-6 h-6 mb-4", m.fill ? "text-orange-600 fill-orange-600" : "text-orange-600")} />
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-tighter mb-1">{m.label}</p>
                    <h4 className="text-3xl font-bold">{m.val}{m.label !== 'Total Avaliações' ? '/5.0' : ''}</h4>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Detailed Analysis Section */}
          <div className="grid grid-cols-12 gap-10">
            {/* Pie Charts - Satisfaction by Category */}
            <div className="col-span-12 xl:col-span-4 space-y-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-slate-900">Satisfação por Categoria</h3>
                <button className="text-orange-600 text-sm font-semibold hover:underline">Ver detalhes</button>
              </div>
              <div className="bg-white p-8 rounded-[1.5rem] shadow-sm space-y-8 border border-slate-100">
                {[
                  { label: 'Qualidade da Comida', desc: 'Sabor, apresentação e temperatura.', pct: Math.round((stats.food / 5) * 100), color: 'stroke-orange-600' },
                  { label: 'Agilidade do Serviço', desc: 'Tempo de espera e atendimento.', pct: Math.round((stats.service / 5) * 100), color: 'stroke-blue-600' },
                  { label: 'Atmosfera e Ambiente', desc: 'Limpeza, música e decoração.', pct: Math.round((stats.ambience / 5) * 100), color: 'stroke-slate-600' },
                ].map((c, i) => (
                  <div key={i} className="flex items-center gap-6">
                    <div className="relative w-20 h-20 flex-shrink-0">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <circle className="stroke-slate-100" cx="18" cy="18" fill="none" r="16" strokeWidth="4"></circle>
                        <circle className={c.color} cx="18" cy="18" fill="none" r="16" strokeDasharray={`${c.pct}, 100`} strokeLinecap="round" strokeWidth="4"></circle>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">{c.pct}%</div>
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-900">{c.label}</h5>
                      <p className="text-sm text-slate-500">{c.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              {/* CTA Promo Card */}
              <div className="bg-blue-50 rounded-[1.5rem] p-6 relative overflow-hidden group border border-blue-100">
                <div className="relative z-10">
                  <h4 className="font-bold text-blue-900 text-lg">Relatórios Mensais</h4>
                  <p className="text-sm text-blue-700 mb-4">Exporte os dados completos de satisfação.</p>
                  <button className="bg-white px-4 py-2 rounded-full text-xs font-bold text-blue-900 shadow-sm group-hover:scale-105 transition-transform">Baixar PDF</button>
                </div>
                <FileText className="absolute -right-2 -bottom-2 w-16 h-16 text-blue-200" />
              </div>
            </div>

            {/* Recent Feedback Table */}
            <div className="col-span-12 xl:col-span-8 space-y-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-slate-900">Feedbacks Recentes</h3>
                <div className="flex gap-2">
                  <button className="bg-slate-200 px-4 py-2 rounded-full text-xs font-bold">Todos</button>
                  <button className="bg-white px-4 py-2 rounded-full text-xs font-bold text-slate-500 border border-slate-100">Pendentes</button>
                </div>
              </div>
              <div className="bg-white rounded-[1.5rem] shadow-sm overflow-hidden border border-slate-100">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Convidado</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Avaliação</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Comentário</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {feedbacks.map((fb) => (
                      <tr key={fb.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center font-bold text-orange-700">
                              {fb.guestName.split(' ').map((n: string) => n[0]).join('')}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{fb.guestName}</p>
                              <p className="text-xs text-slate-400">
                                {fb.timestamp?.toDate ? formatDistanceToNow(fb.timestamp.toDate(), { addSuffix: true, locale: ptBR }) : 'Agora'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-6 text-orange-600">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} className={cn("w-3 h-3", s <= fb.ratings.food ? "fill-orange-600" : "text-slate-200")} />
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <p className="text-sm text-slate-600 line-clamp-1">{fb.comment}</p>
                        </td>
                        <td className="px-6 py-6">
                          <span className={cn(
                            "inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter",
                            fb.status === 'RESPONDIDO' ? "bg-green-100 text-green-700" : 
                            fb.status === 'VISUALIZADO' ? "bg-blue-100 text-blue-700" : 
                            "bg-red-100 text-red-700"
                          )}>
                            {fb.status}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-right relative">
                          <button 
                            onClick={() => setActiveMenu(activeMenu === fb.id ? null : fb.id)}
                            className="text-slate-400 hover:text-orange-600 transition-colors p-2 rounded-full hover:bg-slate-100"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>

                          <AnimatePresence>
                            {activeMenu === fb.id && (
                              <>
                                <div 
                                  className="fixed inset-0 z-10" 
                                  onClick={() => setActiveMenu(null)}
                                />
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                  className="absolute right-8 top-16 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-20 overflow-hidden"
                                >
                                  <div className="p-2 space-y-1">
                                    {fb.status === 'PENDENTE' && (
                                      <button 
                                        onClick={() => handleStatusUpdate(fb.id, 'VISUALIZADO')}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-colors"
                                      >
                                        <Check className="w-4 h-4" />
                                        Marcar como Lido
                                      </button>
                                    )}
                                    <button 
                                      onClick={() => {
                                        setReplyingTo(fb);
                                        setActiveMenu(null);
                                      }}
                                      className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-colors"
                                    >
                                      <MessageSquare className="w-4 h-4" />
                                      Responder
                                    </button>
                                    <div className="h-px bg-slate-100 my-1" />
                                    <button 
                                      onClick={() => {
                                        setDeletingId(fb.id);
                                        setActiveMenu(null);
                                      }}
                                      className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Excluir
                                    </button>
                                  </div>
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-6 text-center bg-slate-50/50">
                  <button className="text-orange-600 font-bold text-sm hover:underline">Carregar mais feedbacks</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="p-10 border-t border-slate-100">
          <div className="flex justify-between items-center opacity-40">
            <p className="text-xs font-medium">© 2026 {companySettings.name}. Todos os direitos reservados.</p>
            <div className="flex gap-4">
              <span className="text-xs">Privacidade</span>
              <span className="text-xs">Termos</span>
            </div>
          </div>
        </footer>

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
                        <Send className="w-4 h-4" /> {/* I need to import Send or use another icon */}
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

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
