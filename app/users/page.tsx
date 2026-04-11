'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { useAuth } from '../components/FirebaseProvider';
import { db, firebaseConfig, handleFirestoreError, OperationType } from '@/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updatePassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Plus, Trash2, Edit2, Shield, X, Check, AlertCircle, Key } from 'lucide-react';

// Helper to get secondary auth without affecting main session
const getSecondaryAuth = () => {
  const secondaryAppName = 'SecondaryAuthApp';
  let secondaryApp;
  if (getApps().find(app => app.name === secondaryAppName)) {
    secondaryApp = getApp(secondaryAppName);
  } else {
    secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  }
  return getAuth(secondaryApp);
};

export default function UsersPage() {
  const { user, loading } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    login: '',
    password: '',
    confirmPassword: '',
    canEdit: true,
    canDelete: false,
    role: 'user' as 'admin' | 'user'
  });

  useEffect(() => {
    if (!user || !user.isAdmin) return;

    const q = query(collection(db, 'users'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(docs);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'users');
    });

    return () => unsubscribe();
  }, [user]);

  const handleOpenModal = (userToEdit?: any) => {
    if (userToEdit) {
      setEditingUser(userToEdit);
      setFormData({
        name: userToEdit.name,
        login: userToEdit.login,
        password: '',
        confirmPassword: '',
        canEdit: userToEdit.permissions?.canEdit ?? true,
        canDelete: userToEdit.permissions?.canDelete ?? false,
        role: userToEdit.role || 'user'
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        login: '',
        password: '',
        confirmPassword: '',
        canEdit: true,
        canDelete: false,
        role: 'user'
      });
    }
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFormLoading(true);

    try {
      if (!editingUser) {
        // Create new user
        if (formData.password !== formData.confirmPassword) {
          throw new Error('As senhas não coincidem.');
        }
        if (formData.password.length < 6) {
          throw new Error('A senha deve ter pelo menos 6 caracteres.');
        }

        const secondaryAuth = getSecondaryAuth();
        const mappedEmail = formData.login.includes('@') ? formData.login : `${formData.login}@crmfeedback.com`;
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, mappedEmail, formData.password);
        const newUid = userCredential.user.uid;

        // Save metadata to Firestore
        await setDoc(doc(db, 'users', newUid), {
          name: formData.name,
          login: formData.login,
          role: formData.role,
          permissions: {
            canEdit: formData.canEdit,
            canDelete: formData.canDelete
          }
        });

        // Sign out from secondary app to avoid session issues
        await signOut(secondaryAuth);
      } else {
        // Update existing user
        await setDoc(doc(db, 'users', editingUser.id), {
          name: formData.name,
          login: formData.login,
          role: formData.role,
          permissions: {
            canEdit: formData.canEdit,
            canDelete: formData.canDelete
          }
        }, { merge: true });

        // Password update is more complex as it requires re-authentication
        // For simplicity in this CRUD, we'll focus on metadata
        if (formData.password) {
           setError('Aviso: A alteração de senha para usuários existentes não está disponível neste painel por motivos de segurança.');
        }
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Error saving user:', err);
      setError(err.message || 'Erro ao salvar usuário.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'users', id));
      setIsDeleting(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${id}`);
    }
  };

  if (loading) return null;
  if (!user) return null;

  if (!user.isAdmin) {
    return (
      <div className="min-h-screen bg-surface">
        <Sidebar />
        <main className="ml-64 min-h-screen flex items-center justify-center p-10">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <Shield className="w-10 h-10 text-red-600" />
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
        <Header title="Gerenciamento de Usuários" subtitle="Cadastro e controle de permissões" />
        
        <div className="p-4 md:p-10 space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-2xl font-bold text-slate-900">Usuários do Sistema</h2>
            <button 
              onClick={() => handleOpenModal()}
              className="w-full sm:w-auto bg-orange-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-orange-700 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Novo Usuário
            </button>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-bottom border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nome</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Login / E-mail</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cargo</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Permissões</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-slate-900">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-slate-600 font-medium">{u.login}</td>
                    <td className="px-6 py-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {u.role === 'admin' ? 'Administrador' : 'Usuário'}
                      </span>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex gap-2">
                        {u.permissions?.canEdit && (
                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-bold uppercase">Editar</span>
                        )}
                        {u.permissions?.canDelete && (
                          <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-bold uppercase">Excluir</span>
                        )}
                        {!u.permissions?.canEdit && !u.permissions?.canDelete && (
                          <span className="text-slate-400 text-[10px] font-bold uppercase italic">Apenas Leitura</span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleOpenModal(u)}
                          className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setIsDeleting(u.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {users.length === 0 && (
              <div className="p-20 text-center">
                <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-medium">Nenhum usuário cadastrado.</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Cadastro/Edição */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsModalOpen(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100"
              >
                <div className="p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-bold text-slate-900">
                      {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                        <input 
                          type="text"
                          required
                          value={formData.name}
                          onChange={e => setFormData({...formData, name: e.target.value})}
                          className="w-full bg-slate-50 border-none focus:ring-2 focus:ring-orange-600 rounded-xl px-4 py-3 text-sm font-medium"
                          placeholder="Ex: João Silva"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Login (Usuário)</label>
                        <input 
                          type="text"
                          required
                          disabled={!!editingUser}
                          value={formData.login}
                          onChange={e => setFormData({...formData, login: e.target.value})}
                          className="w-full bg-slate-50 border-none focus:ring-2 focus:ring-orange-600 rounded-xl px-4 py-3 text-sm font-medium disabled:opacity-50"
                          placeholder="Ex: joaosilva"
                        />
                      </div>

                      {!editingUser && (
                        <>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Senha</label>
                            <input 
                              type="password"
                              required
                              value={formData.password}
                              onChange={e => setFormData({...formData, password: e.target.value})}
                              className="w-full bg-slate-50 border-none focus:ring-2 focus:ring-orange-600 rounded-xl px-4 py-3 text-sm font-medium"
                              placeholder="Mínimo 6 caracteres"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Confirmar Senha</label>
                            <input 
                              type="password"
                              required
                              value={formData.confirmPassword}
                              onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                              className="w-full bg-slate-50 border-none focus:ring-2 focus:ring-orange-600 rounded-xl px-4 py-3 text-sm font-medium"
                              placeholder="Repita a senha"
                            />
                          </div>
                        </>
                      )}

                      <div className="space-y-3 pt-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Permissões e Cargo</label>
                        
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <Shield className="w-4 h-4 text-orange-600" />
                            <span className="text-sm font-bold text-slate-700">Administrador</span>
                          </div>
                          <input 
                            type="checkbox"
                            checked={formData.role === 'admin'}
                            onChange={e => setFormData({...formData, role: e.target.checked ? 'admin' : 'user'})}
                            className="w-5 h-5 rounded border-slate-300 text-orange-600 focus:ring-orange-600"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <label className={`flex items-center gap-2 p-3 rounded-xl border transition-all cursor-pointer ${formData.canEdit ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-100'}`}>
                            <input 
                              type="checkbox"
                              className="hidden"
                              checked={formData.canEdit}
                              onChange={e => setFormData({...formData, canEdit: e.target.checked})}
                            />
                            <Edit2 className={`w-4 h-4 ${formData.canEdit ? 'text-orange-600' : 'text-slate-400'}`} />
                            <span className={`text-xs font-bold ${formData.canEdit ? 'text-orange-900' : 'text-slate-500'}`}>Editar</span>
                          </label>

                          <label className={`flex items-center gap-2 p-3 rounded-xl border transition-all cursor-pointer ${formData.canDelete ? 'bg-red-50 border-red-200' : 'bg-white border-slate-100'}`}>
                            <input 
                              type="checkbox"
                              className="hidden"
                              checked={formData.canDelete}
                              onChange={e => setFormData({...formData, canDelete: e.target.checked})}
                            />
                            <Trash2 className={`w-4 h-4 ${formData.canDelete ? 'text-red-600' : 'text-slate-400'}`} />
                            <span className={`text-xs font-bold ${formData.canDelete ? 'text-red-900' : 'text-slate-500'}`}>Excluir</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {error && (
                      <div className="bg-red-50 p-4 rounded-xl flex items-start gap-3 border border-red-100">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-700 font-medium leading-relaxed">{error}</p>
                      </div>
                    )}

                    <button 
                      type="submit"
                      disabled={formLoading}
                      className="w-full bg-orange-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg hover:bg-orange-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {formLoading ? 'Salvando...' : (editingUser ? 'Salvar Alterações' : 'Criar Usuário')}
                    </button>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation */}
        <AnimatePresence>
          {isDeleting && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsDeleting(null)}
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
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Excluir Usuário?</h3>
                  <p className="text-slate-500 mb-8">O usuário perderá o acesso ao sistema imediatamente. Esta ação não pode ser desfeita.</p>
                  
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setIsDeleting(null)}
                      className="flex-1 px-6 py-3 rounded-full font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={() => handleDelete(isDeleting)}
                      className="flex-1 bg-red-600 text-white px-6 py-3 rounded-full font-bold shadow-lg hover:bg-red-700 transition-all"
                    >
                      Confirmar
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
