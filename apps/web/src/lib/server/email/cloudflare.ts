import type { EmailDriver } from './types';

/**
 * Cloudflare Email Sending driver.
 * Requires Workers Paid plan.
 *
 * TODO: Implement when Cloudflare Email Sending is available.
 * API: https://developers.cloudflare.com/email-routing/email-workers/send-email/
 */
export async function createCloudflareDriver(env: Record<string, string | undefined>): Promise<EmailDriver | null> {
	// Cloudflare Workers Paid only - skip for now
	void env; // unused for now
	return null;
}
