'use client';

import React, { useState } from 'react';
import { Utensils, Star, ThumbsUp, ThumbsDown, Send, CheckCircle, Building2 } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { useAuth } from '../components/FirebaseProvider';

export default function FeedbackForm() {
  const { companySettings } = useAuth();
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    food: 5,
    service: 4,
    ambience: 5,
    comment: '',
    guestName: '',
    email: '',
    phone: '',
    category: 'ELOGIO'
  });

  const formatPhone = (value: string) => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    const phoneNumberLength = phoneNumber.length;
    if (phoneNumberLength < 3) return phoneNumber;
    if (phoneNumberLength < 7) {
      return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2)}`;
    }
    return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 7)}-${phoneNumber.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatPhone(e.target.value);
    setFormData({ ...formData, phone: formattedValue });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.guestName || !formData.email) {
      alert('Por favor, preencha seu nome e e-mail.');
      return;
    }

    try {
      const feedbackData = {
        guestId: 'anonymous',
        guestName: formData.guestName,
        email: formData.email,
        phone: formData.phone,
        ratings: {
          food: formData.food,
          service: formData.service,
          ambience: formData.ambience
        },
        comment: formData.comment,
        status: 'PENDENTE',
        category: formData.category,
        timestamp: serverTimestamp()
      };

      await addDoc(collection(db, 'feedbacks'), feedbackData);

      // Send notification email
      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: formData.email,
            subject: `Recebemos seu feedback! - ${companySettings.name}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #ea580c;">Olá, ${formData.guestName}!</h2>
                <p>Obrigado por compartilhar sua experiência conosco no <strong>${companySettings.name}</strong>.</p>
                <p>Recebemos sua avaliação e ela é muito importante para nós. Nossa equipe irá analisá-la com carinho.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #666;">Este é um e-mail automático, por favor não responda.</p>
              </div>
            `
          })
        });
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError);
      }

      setSubmitted(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'feedbacks');
    }
  };

  if (submitted) {
    const avgRating = (formData.food + formData.service + formData.ambience) / 3;
    const isPositive = avgRating >= 4;

    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-12 rounded-3xl shadow-xl text-center max-w-md w-full border border-slate-100"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-green-600 w-10 h-10" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Obrigado!</h2>
          <p className="text-slate-500 mb-8">Sua avaliação foi enviada com sucesso e nos ajudará a melhorar nossos serviços.</p>
          
          <div className="space-y-4">
            {isPositive && companySettings.googleReviewUrl && (
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-orange-50 p-6 rounded-2xl border border-orange-100 mb-6"
              >
                <p className="text-sm font-bold text-orange-900 mb-4">
                  Ficamos felizes que gostou! Que tal compartilhar sua experiência no Google para nos ajudar?
                </p>
                <a 
                  href={companySettings.googleReviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-white text-orange-600 px-6 py-3 rounded-xl font-bold shadow-sm hover:shadow-md transition-all border border-orange-200"
                >
                  <Star className="w-4 h-4 fill-orange-600" />
                  Avaliar no Google
                </a>
              </motion.div>
            )}

            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-slate-900 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-slate-800 transition-all"
            >
              Enviar outro feedback
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-surface text-slate-900 min-h-screen flex flex-col items-center justify-center p-4">
      <main className="w-full max-w-2xl">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-20 h-20 bg-orange-600 rounded-xl flex items-center justify-center mb-4 shadow-sm overflow-hidden">
            {companySettings.logoUrl ? (
              <img src={companySettings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Building2 className="text-white w-10 h-10" />
            )}
          </div>
          <h1 className="text-3xl font-black tracking-tight">{companySettings.name}</h1>
          <p className="text-slate-500 mt-2 text-sm uppercase tracking-widest font-bold">{companySettings.description}</p>
        </div>

        {/* Feedback Card */}
        <div className="bg-white rounded-xl p-8 md:p-12 shadow-xl relative overflow-hidden border border-slate-100">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-orange-100 opacity-50 rounded-full blur-3xl"></div>
          
          <header className="mb-10">
            <h2 className="text-2xl font-bold mb-2">Sua experiência nos importa.</h2>
            <p className="text-slate-500 font-medium">Compartilhe sua opinião sobre o jantar de hoje.</p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-12">
            {/* Guest Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700" htmlFor="guestName">Nome e Sobrenome *</label>
                <input 
                  id="guestName"
                  required
                  type="text"
                  value={formData.guestName}
                  onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                  className="w-full bg-slate-100 border-none focus:ring-2 focus:ring-orange-600 rounded-xl p-4 text-slate-900 font-medium placeholder:text-slate-400" 
                  placeholder="Seu nome completo" 
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700" htmlFor="email">E-mail *</label>
                <input 
                  id="email"
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-100 border-none focus:ring-2 focus:ring-orange-600 rounded-xl p-4 text-slate-900 font-medium placeholder:text-slate-400" 
                  placeholder="seu@email.com" 
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-bold text-slate-700" htmlFor="phone">Telefone (opcional)</label>
                <input 
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  className="w-full bg-slate-100 border-none focus:ring-2 focus:ring-orange-600 rounded-xl p-4 text-slate-900 font-medium placeholder:text-slate-400" 
                  placeholder="(xx) xxxxx-xxxx" 
                />
              </div>
            </div>

            {/* Question 1: Food */}
            <div className="space-y-4">
              <label className="block text-lg font-bold">Como estava sua comida?</label>
              <div className="flex items-center gap-4">
                {[
                  { val: 1, label: 'Fraca', emoji: '😞' },
                  { val: 3, label: 'Boa', emoji: '😊' },
                  { val: 5, label: 'Incrível', emoji: '🤩' }
                ].map((item) => (
                  <button 
                    key={item.val}
                    type="button"
                    onClick={() => setFormData({ ...formData, food: item.val })}
                    className={cn(
                      "group flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200 border-2",
                      formData.food === item.val ? "bg-orange-50 border-orange-600" : "bg-white border-transparent hover:bg-slate-50"
                    )}
                  >
                    <span className="text-3xl">{item.emoji}</span>
                    <span className={cn("text-xs font-bold", formData.food === item.val ? "text-orange-600" : "text-slate-400")}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Question 2: Service */}
            <div className="space-y-4">
              <label className="block text-lg font-bold">Como foi o atendimento?</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button 
                    key={s}
                    type="button"
                    onClick={() => setFormData({ ...formData, service: s })}
                    className="transition-transform active:scale-90"
                  >
                    <Star className={cn("w-10 h-10", s <= formData.service ? "fill-orange-600 text-orange-600" : "text-slate-200")} />
                  </button>
                ))}
              </div>
              <p className="text-xs font-bold text-slate-400">Toque para avaliar ({formData.service}/5)</p>
            </div>

            {/* Question 3: Ambience */}
            <div className="space-y-4">
              <label className="block text-lg font-bold">O ambiente estava agradável?</label>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  type="button"
                  onClick={() => setFormData({ ...formData, ambience: 5 })}
                  className={cn(
                    "flex items-center justify-center gap-3 py-4 px-6 rounded-xl border-2 transition-all",
                    formData.ambience === 5 ? "border-orange-600 bg-orange-50 text-orange-600" : "border-transparent bg-slate-100 text-slate-500"
                  )}
                >
                  <ThumbsUp className={cn("w-5 h-5", formData.ambience === 5 && "fill-orange-600")} />
                  Sim, excelente
                </button>
                <button 
                  type="button"
                  onClick={() => setFormData({ ...formData, ambience: 2 })}
                  className={cn(
                    "flex items-center justify-center gap-3 py-4 px-6 rounded-xl border-2 transition-all",
                    formData.ambience === 2 ? "border-orange-600 bg-orange-50 text-orange-600" : "border-transparent bg-slate-100 text-slate-500"
                  )}
                >
                  <ThumbsDown className={cn("w-5 h-5", formData.ambience === 2 && "fill-orange-600")} />
                  Poderia melhorar
                </button>
              </div>
            </div>

            {/* Comments */}
            <div className="space-y-4">
              <label className="block text-lg font-bold" htmlFor="comments">Comentários adicionais</label>
              <textarea 
                id="comments"
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                className="w-full bg-slate-100 border-none focus:ring-2 focus:ring-orange-600 rounded-xl p-4 text-slate-900 font-medium placeholder:text-slate-400" 
                placeholder="Conte-nos mais sobre os detalhes do seu jantar..." 
                rows={4}
              ></textarea>
            </div>

            {/* Footer CTA */}
            <div className="pt-6 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
              <p className="text-sm text-slate-500 font-medium italic">Seus dados estão seguros e nos ajudam a evoluir. Obrigado pela visita!</p>
              <button 
                type="submit"
                className="w-full md:w-auto bg-gradient-to-br from-orange-700 to-orange-500 text-white px-10 py-4 rounded-full font-bold text-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" />
                Enviar Avaliação
              </button>
            </div>
          </form>
        </div>

        {/* Photo Highlight 
        <div className="mt-12 grid grid-cols-12 gap-4">
          <div className="col-span-8 h-32 rounded-xl overflow-hidden shadow-sm">
            <img 
              src="https://picsum.photos/seed/restaurant/800/400" 
              alt="Restaurant" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="col-span-4 h-32 bg-orange-100 rounded-xl flex items-center justify-center p-4 text-center">
            <p className="text-orange-900 font-bold text-sm leading-tight">Obrigado pela visita!</p>
          </div>
        </div>*/}
        

        <footer className="mt-12 text-center text-slate-400 text-xs font-medium uppercase tracking-widest pb-8">
          © 2026 {companySettings.name}. Todos os direitos reservados.
        </footer>
      </main>
    </div>
  );
}
