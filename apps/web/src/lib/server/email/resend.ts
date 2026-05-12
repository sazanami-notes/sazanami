import type { EmailDriver } from './types';

export async function createResendDriver(env: Record<string, string | undefined>): Promise<EmailDriver | null> {
	const apiKey = env.RESEND_API_KEY;
	const fromEmail = env.RESEND_FROM_EMAIL || env.SMTP_FROM;

	if (!apiKey || !fromEmail) return null;

	const { Resend } = await import('resend');
	const resend = new Resend(apiKey);

	return {
		async send({ to, subject, text, html }) {
			const { data, error } = await resend.emails.send({
				from: `Sazanami <${fromEmail}>`,
				to: [to],
				subject,
				text,
				html
			});
			if (error) throw new Error(`Resend error: ${error.message}`);
			return { messageId: data?.id || 'unknown' };
		}
	};
}
