// src/routes/api/v1/health/+server.ts
// API v1 のヘルスチェック。認証不要（監視・疎通確認用）。
import type { RequestHandler } from './$types';
import { apiJson, preflight } from '$lib/server/api-response';

export const OPTIONS: RequestHandler = () => preflight();

export const GET: RequestHandler = () => apiJson({ ok: true, version: 'v1' });
