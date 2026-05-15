import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendWelcomeEmail(to: string, name: string) {
  try {
    const info = await transporter.sendMail({
      from: `"Gestão Trade" <${process.env.SMTP_USER}>`,
      to,
      subject: 'Bem-vindo(a) ao Gestão Trade! 🚀',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #2563eb;">Olá, ${name}!</h2>
          <p>Sua conta no <strong>Gestão Trade</strong> foi criada com sucesso.</p>
          <p>Estamos muito felizes em ter você conosco. Nossa plataforma foi desenhada para ajudar você a ter controle total sobre suas operações, capital e disciplina.</p>
          <p>Dicas para começar:</p>
          <ul>
            <li>Vá em <strong>Configurações</strong> e defina suas metas e capital inicial.</li>
            <li>Registre seus trades diariamente para construir seu relatório de performance.</li>
            <li>Acompanhe seus relatórios de disciplina e saiba exatamente onde melhorar.</li>
          </ul>
          <br/>
          <p>Bons trades e sucesso na sua jornada!</p>
          <p>Um abraço,<br/>Equipe Gestão Trade</p>
        </div>
      `,
    })
    console.log('E-mail de boas-vindas enviado:', info.messageId)
    return true
  } catch (error) {
    console.error('Erro ao enviar e-mail de boas-vindas:', error)
    return false
  }
}
