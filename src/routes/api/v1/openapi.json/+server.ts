// src/routes/api/v1/openapi.json/+server.ts
// OpenAPI 3.1 仕様を返す公開エンドポイント（認証不要）。
// /docs の Scalar はこのURLを読み込む。
import { json, type RequestHandler } from '@sveltejs/kit';
import { CORS_HEADERS } from '$lib/server/api-response';
import { openApiSpec } from '$lib/openapi-spec';

export const GET: RequestHandler = async () => {
	return json(openApiSpec, { headers: CORS_HEADERS });
};
