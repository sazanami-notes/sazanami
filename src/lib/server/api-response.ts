// src/lib/server/api-response.ts
// /api/v1 系の共通レスポンス。CORSヘッダーを必ず付ける。
import { json } from '@sveltejs/kit';

export const CORS_HEADERS: Record<string, string> = {
	'access-control-allow-origin': '*',
	'access-control-allow-headers': 'authorization, content-type',
	'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
	'access-control-max-age': '86400'
};

export function apiJson(data: unknown, init: ResponseInit = {}): Response {
	return json(data, {
		...init,
		headers: { ...CORS_HEADERS, ...((init.headers as Record<string, string>) ?? {}) }
	});
}

export function apiError(status: number, code: string, message: string): Response {
	return apiJson({ error: { code, message } }, { status });
}

export function preflight(): Response {
	return new Response(null, { status: 204, headers: CORS_HEADERS });
}
