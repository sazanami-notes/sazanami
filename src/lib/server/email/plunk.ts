import type { EmailDriver } from './types';

/**
 * Plunk email driver.
 * Uses Plunk's HTTP API (POST /v1/send) so it works on Cloudflare Workers
 * (no SMTP/TCP needed). Works with both:
 *  - Plunk SaaS (default https://api.useplunk.com)
 *  - Plunk self-hosted (set PLUNK_API_URL to your own instance)
 */
export async function createPlunkDriver(
	env: Record<string, string | undefined>
): Promise<EmailDriver | null> {
	const apiKey = env.PLUNK_API_KEY;
	const fromEmail = env.PLUNK_FROM_EMAIL || env.SMTP_FROM;
	const apiUrl = (env.PLUNK_API_URL || 'https://next-api.useplunk.com').replace(/\/$/, '');

	if (!apiKey || !fromEmail) return null;

	return {
		async send({ to, subject, text, html }) {
			const response = await fetch(`${apiUrl}/v1/send`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${apiKey}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					to,
					subject,
					body: html,
					text,
					from: { email: fromEmail }
				})
			});

			if (!response.ok) {
				const errorBody = await response.text();
				throw new Error(`Plunk error (${response.status}): ${errorBody}`);
			}

			const data = (await response.json()) as {
				data?: { emails?: Array<{ email?: string }> };
			};
			return { messageId: data?.data?.emails?.[0]?.email || 'unknown' };
		}
	};
}
