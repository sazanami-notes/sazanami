// src/routes/+layout.server.ts

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// hooks.server.tsで検証されたセッション情報を取得し、
	// simplesmente page dataとしてクライアントに渡す
	const { user, session } = locals;
	return { user, session };
};