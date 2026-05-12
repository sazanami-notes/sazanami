import type { EmailDriver } from './types';

export async function createSmtpDriver(env: Record<string, string | undefined>): Promise<EmailDriver | null> {
	const user = env.SMTP_USER;
	const pass = env.SMTP_PASS;
	const from = env.SMTP_FROM;

	if (!user || !pass || !from) return null;

	const nodemailer = await import('nodemailer');
	const transporter = nodemailer.default.createTransport({
		host: env.SMTP_HOST || 'smtp.gmail.com',
		port: Number(env.SMTP_PORT) || 465,
		secure: env.SMTP_SECURE === undefined ? true : env.SMTP_SECURE === 'true',
		auth: { user, pass }
	});

	return {
		async send({ to, subject, text, html }) {
			const info = await transporter.sendMail({ from: `"Sazanami" <${from}>`, to, subject, text, html });
			return { messageId: info.messageId };
		}
	};
}
