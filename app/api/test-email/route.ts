import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { to, settings } = await req.json();

    if (!to || !settings) {
      return NextResponse.json({ error: 'Destinatário e configurações são obrigatórios.' }, { status: 400 });
    }

    const { provider, host, port, user, password, resendApiKey, fromEmail, fromName, secure } = settings;

    if (provider === 'resend') {
      const apiKey = resendApiKey || process.env.RESEND_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ error: 'Chave de API do Resend não configurada.' }, { status: 400 });
      }

      const resend = new Resend(apiKey);
      const { data, error } = await resend.emails.send({
        from: fromName ? `${fromName} <${fromEmail || 'onboarding@resend.dev'}>` : (fromEmail || 'onboarding@resend.dev'),
        to: [to],
        subject: 'E-mail de Teste - CRM Feedback',
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #ea580c;">Teste de Configuração</h2>
            <p>Olá!</p>
            <p>Este é um e-mail de teste enviado para confirmar que suas configurações de e-mail no <strong>CRM Feedback</strong> estão funcionando corretamente.</p>
            <p>Se você recebeu este e-mail, o provedor <strong>Resend</strong> foi configurado com sucesso.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #666;">Enviado em: ${new Date().toLocaleString('pt-BR')}</p>
          </div>
        `,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, data });
    } else if (provider === 'smtp') {
      if (!host || !port || !user || !password) {
        return NextResponse.json({ error: 'Configurações SMTP incompletas.' }, { status: 400 });
      }

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: secure || port === 465,
        auth: {
          user,
          pass: password,
        },
      });

      await transporter.sendMail({
        from: fromName ? `${fromName} <${fromEmail || user}>` : (fromEmail || user),
        to,
        subject: 'E-mail de Teste - CRM Feedback',
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #ea580c;">Teste de Configuração</h2>
            <p>Olá!</p>
            <p>Este é um e-mail de teste enviado para confirmar que suas configurações de e-mail no <strong>CRM Feedback</strong> estão funcionando corretamente.</p>
            <p>Se você recebeu este e-mail, o provedor <strong>SMTP</strong> foi configurado com sucesso.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #666;">Enviado em: ${new Date().toLocaleString('pt-BR')}</p>
          </div>
        `,
      });

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Provedor inválido.' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error sending test email:', error);
    return NextResponse.json({ error: error.message || 'Erro interno ao enviar e-mail.' }, { status: 500 });
  }
}
