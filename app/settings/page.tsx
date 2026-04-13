'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { useAuth } from '../components/FirebaseProvider';
import { db, handleFirestoreError, OperationType } from '@/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Save, Building2, FileText, Image as ImageIcon, Loader2, Database, CheckCircle2, Play, Mail, Shield, Server, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { migrations, getExecutedMigrations, runMigration } from '@/lib/migrations';

export default function SettingsPage() {
  const { user, loading, companySettings } = useAuth();
  const [activeTab, setActiveTab] = useState<'company' | 'email' | 'migrations'>('company');
  
  // Company Settings State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [googleReviewUrl, setGoogleReviewUrl] = useState('');
  
  // Email Settings State
  const [emailProvider, setEmailProvider] = useState<'smtp' | 'resend'>('smtp');
  const [emailHost, setEmailHost] = useState('');
  const [emailPort, setEmailPort] = useState(587);
  const [emailUser, setEmailUser] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailResendApiKey, setEmailResendApiKey] = useState('');
  const [emailFromEmail, setEmailFromEmail] = useState('');
  const [emailFromName, setEmailFromName] = useState('');
  const [emailSecure, setEmailSecure] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [executedMigrations, setExecutedMigrations] = useState<string[]>([]);
  const [runningMigration, setRunningMigration] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (companySettings) {
      setName(companySettings.name);
      setDescription(companySettings.description);
      setLogoUrl(companySettings.logoUrl);
      setGoogleReviewUrl(companySettings.googleReviewUrl || '');
    }
  }, [companySettings]);

  useEffect(() => {
    if (user?.isAdmin) {
      fetchMigrations();
      fetchEmailSettings();
    }
  }, [user]);

  const fetchEmailSettings = async () => {
    try {
      const emailDoc = await getDoc(doc(db, 'settings', 'email'));
      if (emailDoc.exists()) {
        const data = emailDoc.data();
        setEmailProvider(data.provider || 'smtp');
        setEmailHost(data.host || '');
        setEmailPort(data.port || 587);
        setEmailUser(data.user || '');
        setEmailPassword(data.password || '');
        setEmailResendApiKey(data.resendApiKey || '');
        setEmailFromEmail(data.fromEmail || '');
        setEmailFromName(data.fromName || '');
        setEmailSecure(data.secure || false);
      }
    } catch (error) {
      console.error('Error fetching email settings:', error);
    }
  };

  const fetchMigrations = async () => {
    const executed = await getExecutedMigrations();
    setExecutedMigrations(executed);
  };

  const handleRunMigration = async (migration: any) => {
    if (!user) return;
    setRunningMigration(migration.id);
    try {
      await runMigration(migration, user.uid);
      await fetchMigrations();
      alert(`Migração "${migration.name}" executada com sucesso!`);
    } catch (error) {
      console.error(error);
    } finally {
      setRunningMigration(null);
    }
  };

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

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'company'), {
        name,
        description,
        logoUrl,
        googleReviewUrl,
        updatedAt: new Date(),
        updatedBy: user.uid
      });
      alert('Configurações da empresa salvas com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/company');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'email'), {
        provider: emailProvider,
        host: emailHost,
        port: Number(emailPort),
        user: emailUser,
        password: emailPassword,
        resendApiKey: emailResendApiKey,
        fromEmail: emailFromEmail,
        fromName: emailFromName,
        secure: emailSecure,
        updatedAt: new Date(),
        updatedBy: user.uid
      });
      alert('Configurações de e-mail salvas com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/email');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!user) return;
    setTestingEmail(true);
    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: user.email || `${user.login}@crmfeedback.com`,
          settings: {
            provider: emailProvider,
            host: emailHost,
            port: emailPort,
            user: emailUser,
            password: emailPassword,
            resendApiKey: emailResendApiKey,
            fromEmail: emailFromEmail,
            fromName: emailFromName,
            secure: emailSecure
          }
        })
      });

      const result = await response.json();
      if (response.ok) {
        alert('E-mail de teste enviado com sucesso! Verifique sua caixa de entrada.');
      } else {
        throw new Error(result.error || 'Erro ao enviar e-mail de teste.');
      }
    } catch (error: any) {
      alert(`Erro no teste: ${error.message}`);
    } finally {
      setTestingEmail(false);
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
      <main className="lg:ml-20 min-h-screen transition-all duration-300">
        <Header title="Configurações" subtitle="Gerencie as informações da sua empresa" />
        
        <div className="p-4 md:p-10 max-w-4xl space-y-8">
          {/* Tabs Navigation */}
          <div className="flex gap-2 p-1 bg-white rounded-2xl shadow-sm border border-slate-100 w-fit">
            <button 
              onClick={() => setActiveTab('company')}
              className={cn(
                "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                activeTab === 'company' ? "bg-orange-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <Building2 className="w-4 h-4" />
              Empresa
            </button>
            <button 
              onClick={() => setActiveTab('email')}
              className={cn(
                "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                activeTab === 'email' ? "bg-orange-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <Mail className="w-4 h-4" />
              Email Config
            </button>
            <button 
              onClick={() => setActiveTab('migrations')}
              className={cn(
                "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                activeTab === 'migrations' ? "bg-orange-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <Database className="w-4 h-4" />
              Migrações
            </button>
          </div>

          {activeTab === 'company' && (
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

              <form onSubmit={handleSaveCompany} className="p-8 space-y-8">
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

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Link de Avaliação do Google (Google Business Profile)</label>
                  <div className="relative">
                    <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="url"
                      value={googleReviewUrl}
                      onChange={(e) => setGoogleReviewUrl(e.target.value)}
                      placeholder="https://g.page/r/XXXXXXXXXXXX/review"
                      className="w-full bg-slate-50 border-none focus:ring-2 focus:ring-orange-600 rounded-xl pl-12 pr-4 py-3 text-sm font-medium"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 ml-1 italic">
                    Dica: Use este link para incentivar clientes satisfeitos a postarem no Google.
                  </p>
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
                    Salvar Empresa
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {activeTab === 'email' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden"
            >
              <div className="p-8 border-b border-slate-50">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-orange-600" />
                  Configuração de E-mail (SMTP)
                </h3>
                <p className="text-sm text-slate-500 mt-1">Configure o servidor de saída para notificações do sistema.</p>
              </div>

              <form onSubmit={handleSaveEmail} className="p-8 space-y-8">
                <div className="space-y-4">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Provedor de E-mail</label>
                  <div className="flex gap-4">
                    <button 
                      type="button"
                      onClick={() => setEmailProvider('smtp')}
                      className={cn(
                        "flex-1 p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                        emailProvider === 'smtp' ? "border-orange-600 bg-orange-50 text-orange-900" : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"
                      )}
                    >
                      <Server className="w-6 h-6" />
                      <span className="font-bold text-sm">Servidor SMTP</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setEmailProvider('resend')}
                      className={cn(
                        "flex-1 p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                        emailProvider === 'resend' ? "border-orange-600 bg-orange-50 text-orange-900" : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"
                      )}
                    >
                      <Mail className="w-6 h-6" />
                      <span className="font-bold text-sm">Resend API</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {emailProvider === 'smtp' ? (
                    <>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Servidor SMTP (Host)</label>
                        <div className="relative">
                          <Server className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            type="text"
                            value={emailHost}
                            onChange={(e) => setEmailHost(e.target.value)}
                            placeholder="smtp.gmail.com"
                            className="w-full bg-slate-50 border-none focus:ring-2 focus:ring-orange-600 rounded-xl pl-12 pr-4 py-3 text-sm font-medium"
                            required={emailProvider === 'smtp'}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Porta</label>
                        <div className="relative">
                          <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            type="number"
                            value={emailPort}
                            onChange={(e) => setEmailPort(Number(e.target.value))}
                            placeholder="465 ou 587"
                            className="w-full bg-slate-50 border-none focus:ring-2 focus:ring-orange-600 rounded-xl pl-12 pr-4 py-3 text-sm font-medium"
                            required={emailProvider === 'smtp'}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Usuário / E-mail</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            type="email"
                            value={emailUser}
                            onChange={(e) => setEmailUser(e.target.value)}
                            placeholder="seu-email@exemplo.com"
                            className="w-full bg-slate-50 border-none focus:ring-2 focus:ring-orange-600 rounded-xl pl-12 pr-4 py-3 text-sm font-medium"
                            required={emailProvider === 'smtp'}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Senha / App Password</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            type="password"
                            value={emailPassword}
                            onChange={(e) => setEmailPassword(e.target.value)}
                            placeholder="••••••••••••"
                            className="w-full bg-slate-50 border-none focus:ring-2 focus:ring-orange-600 rounded-xl pl-12 pr-4 py-3 text-sm font-medium"
                            required={emailProvider === 'smtp'}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Resend API Key</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            type="password"
                            value={emailResendApiKey}
                            onChange={(e) => setEmailResendApiKey(e.target.value)}
                            placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxx"
                            className="w-full bg-slate-50 border-none focus:ring-2 focus:ring-orange-600 rounded-xl pl-12 pr-4 py-3 text-sm font-medium"
                            required={emailProvider === 'resend'}
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 ml-1 italic">
                          Obtenha sua chave em <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">resend.com</a>
                        </p>
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">E-mail do Remetente</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="email"
                        value={emailFromEmail}
                        onChange={(e) => setEmailFromEmail(e.target.value)}
                        placeholder="contato@suaempresa.com"
                        className="w-full bg-slate-50 border-none focus:ring-2 focus:ring-orange-600 rounded-xl pl-12 pr-4 py-3 text-sm font-medium"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Nome do Remetente</label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text"
                        value={emailFromName}
                        onChange={(e) => setEmailFromName(e.target.value)}
                        placeholder="Ex: CRM Feedback"
                        className="w-full bg-slate-50 border-none focus:ring-2 focus:ring-orange-600 rounded-xl pl-12 pr-4 py-3 text-sm font-medium"
                      />
                    </div>
                  </div>

                  {emailProvider === 'smtp' && (
                    <div className="flex items-center gap-3 pt-6">
                      <input 
                        type="checkbox"
                        id="emailSecure"
                        checked={emailSecure}
                        onChange={(e) => setEmailSecure(e.target.checked)}
                        className="w-5 h-5 rounded border-slate-300 text-orange-600 focus:ring-orange-600"
                      />
                      <label htmlFor="emailSecure" className="text-sm font-bold text-slate-700 cursor-pointer">Usar SSL/TLS (Seguro)</label>
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs text-blue-800 font-bold">Nota sobre Segurança</p>
                    <p className="text-[10px] text-blue-700 leading-relaxed">
                      {emailProvider === 'smtp' 
                        ? 'Se estiver usando o Gmail, você precisará criar uma "Senha de App" nas configurações da sua conta Google.'
                        : 'O Resend é a opção recomendada para maior estabilidade e facilidade de configuração.'}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4">
                  <button 
                    type="button"
                    onClick={handleTestEmail}
                    disabled={testingEmail || saving}
                    className="bg-slate-100 text-slate-700 px-6 py-3 rounded-full font-bold hover:bg-slate-200 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {testingEmail ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    Enviar E-mail de Teste
                  </button>

                  <button 
                    type="submit"
                    disabled={saving || testingEmail}
                    className="bg-orange-600 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-orange-700 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Salvar Configurações
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {activeTab === 'migrations' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden"
            >
              <div className="p-8 border-b border-slate-50">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Database className="w-5 h-5 text-orange-600" />
                  Sistema de Migrações
                </h3>
                <p className="text-sm text-slate-500 mt-1">Gerencie a estrutura e os dados iniciais do banco de dados.</p>
              </div>

              <div className="p-8 space-y-4">
                {migrations.map((migration) => {
                  const isExecuted = executedMigrations.includes(migration.id);
                  const isRunning = runningMigration === migration.id;

                  return (
                    <div key={migration.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          isExecuted ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600"
                        )}>
                          {isExecuted ? <CheckCircle2 className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">{migration.name}</h4>
                          <p className="text-xs text-slate-500">{migration.description}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRunMigration(migration)}
                        disabled={isExecuted || isRunning}
                        className={cn(
                          "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                          isExecuted 
                            ? "bg-green-50 text-green-600 cursor-default" 
                            : "bg-orange-600 text-white hover:bg-orange-700 shadow-sm"
                        )}
                      >
                        {isRunning ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isExecuted ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            Executada
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            Executar
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
