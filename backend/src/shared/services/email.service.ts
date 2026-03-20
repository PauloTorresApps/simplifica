import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../../config/env';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

function createTransporter(): Transporter {
  const hasAuth = env.SMTP_USER.length > 0 && env.SMTP_PASSWORD.length > 0;

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: hasAuth
      ? {
          user: env.SMTP_USER,
          pass: env.SMTP_PASSWORD,
        }
      : undefined,
  });
}

export class EmailService {
  private readonly transporter: Transporter;

  constructor(transporter?: Transporter) {
    this.transporter = transporter ?? createTransporter();
  }

  async sendEmail(input: SendEmailInput): Promise<void> {
    await this.transporter.sendMail({
      from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
  }
}
