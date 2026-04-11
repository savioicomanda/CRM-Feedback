'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { useAuth } from '../components/FirebaseProvider';
import { db, handleFirestoreError, OperationType } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Save, Building2, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function SettingsPage() {
  const { user, loading, companySettings } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (companySettings) {
      setName(companySettings.name);
      setDescription(companySettings.description);
      setLogoUrl(companySettings.logoUrl);
    }
  }, [companySettings]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      alert('Por favor, selecione uma imagem PNG ou JPEG.');
      return;
    }

    if (file.size > 800 * 1024) {
      alert('A imagem é muito grande. Por favor, escolha uma imagem com menos de 800KB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'company'), {
        name,
        description,
        logoUrl,
        updatedAt: new Date(),
        updatedBy: user.uid
      });
      alert('Configurações salvas com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/company');
    } finally {
      setSaving(false);
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
              <Building2 className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 italic serif">Acesso Restrito</h2>
            <p className="text-slate-500 font-medium">
              Apenas administradores podem acessar as configurações da empresa.
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
      <main className="lg:ml-64 min-h-screen">
        <Header title="Configurações" subtitle="Gerencie as informações da sua empresa" />
        
        <div className="p-4 md:p-10 max-w-4xl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden"
          >
            <div className="p-8 border-b border-slate-50">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-orange-600" />
                Perfil da Empresa
              </h3>
              <p className="text-sm text-slate-500 mt-1">Essas informações serão exibidas no formulário de feedback e no painel.</p>
            </div>

            <form onSubmit={handleSave} className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Nome da Empresa</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: The Culinary Ledger"
                      className="w-full bg-slate-50 border-none focus:ring-2 focus:ring-orange-600 rounded-xl pl-12 pr-4 py-3 text-sm font-medium"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Logo da Empresa</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="url"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        placeholder="https://exemplo.com/logo.png ou Base64"
                        className="w-full bg-slate-50 border-none focus:ring-2 focus:ring-orange-600 rounded-xl pl-12 pr-4 py-3 text-sm font-medium"
                      />
                    </div>
                    <input 
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/png, image/jpeg"
                      className="hidden"
                    />
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
                    >
                      <ImageIcon className="w-4 h-4" />
                      Upload
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 ml-1 italic">Dica: Formatos PNG ou JPEG (máx. 800KB).</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Descrição / Slogan</label>
                <div className="relative">
                  <FileText className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Edição Maître D'"
                    rows={3}
                    className="w-full bg-slate-50 border-none focus:ring-2 focus:ring-orange-600 rounded-xl pl-12 pr-4 py-3 text-sm font-medium"
                  />
                </div>
              </div>

              {/* Preview Section */}
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Prévia do Cabeçalho</h4>
                <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100 max-w-sm">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-orange-600 flex items-center justify-center flex-shrink-0">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="text-white w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h1 className="font-bold text-slate-900 text-lg leading-tight">{name || 'Nome da Empresa'}</h1>
                    <p className="text-[10px] uppercase tracking-widest text-slate-500">{description || 'Descrição'}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button 
                  type="submit"
                  disabled={saving}
                  className="bg-orange-600 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-orange-700 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Salvar Alterações
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
