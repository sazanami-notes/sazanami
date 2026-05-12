import { env } from '$env/dynamic/private';
import { escapeHtml } from '../../utils/sanitize';
import type { EmailDriver } from './types';
import { createSmtpDriver } from './smtp';
import { createResendDriver } from './resend';
import { createCloudflareDriver } from './cloudflare';

// ---------------------------------------------------------------------------
// Noop driver (fallback when no email config)
// ---------------------------------------------------------------------------

function createNoopDriver(): EmailDriver {
	return {
		async send({ to, subject, text }) {
			console.log('================================================================');
			console.log('Email sending is disabled (no credentials). Logging email instead:');
			console.log(`To: ${to}`);
			console.log(`Subject: ${subject}`);
			console.log(`Text Body:\n${text}`);
			console.log('================================================================');
			return { messageId: 'noop' };
		}
	};
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

let driverPromise: Promise<EmailDriver> | null = null;

async function getEmailDriver(): Promise<EmailDriver> {
	if (driverPromise) return driverPromise;

	driverPromise = (async () => {
		const driverName = env.EMAIL_DRIVER || 'auto';
		const envRecord = env as unknown as Record<string, string | undefined>;

		if (driverName === 'smtp' || driverName === 'auto') {
			const driver = await createSmtpDriver(envRecord);
			if (driver) return driver;
		}
		if (driverName === 'resend' || driverName === 'auto') {
			const driver = await createResendDriver(envRecord);
			if (driver) return driver;
		}
		if (driverName === 'cloudflare') {
			const driver = await createCloudflareDriver(envRecord);
			if (driver) return driver;
		}
		return createNoopDriver();
	})();

	return driverPromise;
}

// ---------------------------------------------------------------------------
// Public API (exact same signatures as before)
// ---------------------------------------------------------------------------

export async function sendEmail(to: string, subject: string, text: string, html: string) {
	const driver = await getEmailDriver();
	const from = (env.SMTP_FROM || env.RESEND_FROM_EMAIL || 'noreply@sazanami.local');
	return driver.send({ to, subject, text, html, from });
}

export async function sendVerificationEmail(user: { name: string; email: string }, url: string) {
	const username = user.name || '';
	const safeUsername = escapeHtml(username);
	const safeUrl = escapeHtml(url);
	const subject = '【Sazanami】メールアドレスの確認';
	const text =
		`こんにちは ${username}。\n` +
		`メールアドレスを確認するには、以下のリンクをクリックしてください：\n` +
		`${url}\n` +
		`もしこの操作に心当たりがない場合は、このメールを無視してください。`;

	const html = `
        <p>こんにちは ${safeUsername}。</p>
        <p>以下のボタンをクリックしてメールアドレスを確認してください。</p>
        <p><a href="${safeUrl}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;">メールアドレスを確認する</a></p>
        <p>リンクが機能しない場合はこちらの URL をコピーしてブラウザに貼り付けてください：</p>
        <p>${safeUrl}</p>
        <p>もしこの操作に心当たりがない場合は、このメールを無視してください。</p>`;

	return sendEmail(user.email, subject, text, html);
}

export async function sendMagicLink({ email, url }: { email: string; url: string }) {
	const safeUrl = escapeHtml(url);
	const subject = '【Sazanami】ログインしてください';
	const text =
		`ログインするには、以下のリンクをクリックしてください：\n` +
		`${url}\n` +
		`もしこの操作に心当たりがない場合は、このメールを無視してください。`;

	const html = `
        <p>以下のボタンをクリックしてログインしてください。</p>
        <p><a href="${safeUrl}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;">ログインする</a></p>
        <p>リンクが機能しない場合はこちらの URL をコピーしてブラウザに貼り付けてください：</p>
        <p>${safeUrl}</p>
        <p>もしこの操作に心当たりがない場合は、このメールを無視してください。</p>`;

	return sendEmail(email, subject, text, html);
}

export async function sendResetPasswordEmail(user: { name: string; email: string }, url: string) {
	const username = user.name || '';
	const safeUsername = escapeHtml(username);
	const safeUrl = escapeHtml(url);
	const subject = '【Sazanami】パスワードの再設定';
	const text =
		`こんにちは ${username}。\n` +
		`パスワードを再設定するには、以下のリンクをクリックしてください：\n` +
		`${url}\n` +
		`もしこの操作に心当たりがない場合は、このメールを無視してください。`;

	const html = `
        <p>こんにちは ${safeUsername}。</p>
        <p>以下のボタンをクリックしてパスワードを再設定してください。</p>
        <p><a href="${safeUrl}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;">パスワードを再設定する</a></p>
        <p>リンクが機能しない場合はこちらの URL をコピーしてブラウザに貼り付けてください：</p>
        <p>${safeUrl}</p>
        <p>もしこの操作に心当たりがない場合は、このメールを無視してください。</p>`;

	return sendEmail(user.email, subject, text, html);
}
