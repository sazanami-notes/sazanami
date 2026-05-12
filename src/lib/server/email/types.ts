/**
 * Email driver interface.
 * Implementations: smtp.ts, resend.ts, cloudflare.ts
 */
export interface EmailDriver {
	send(params: { to: string; subject: string; text: string; html: string; from: string }): Promise<{ messageId: string }>;
}

export type EmailDriverName = 'smtp' | 'resend' | 'cloudflare' | 'noop';
