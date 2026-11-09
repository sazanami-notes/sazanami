#!/usr/bin/env node
/**
 * sazanami-mcp
 * Sazanami（個人用メモアプリ）の公開 REST API v1 を MCP ツールとして公開する stdio サーバー。
 *
 * 環境変数:
 *   SAZANAMI_BASE_URL  既定: https://sazanami-dev.kaedesato.work
 *   SAZANAMI_TOKEN     必須（個人アクセストークン sznm_...）
 *
 * 注意: stdio トランスポートでは stdout がプロトコル専用。
 *       ログは必ず stderr（console.error）へ出す。
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const DEFAULT_BASE_URL = 'https://sazanami-dev.kaedesato.work';
const BASE_URL = (process.env.SAZANAMI_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, '');
const TOKEN = process.env.SAZANAMI_TOKEN?.trim();

if (!TOKEN) {
	console.error(
		'[sazanami-mcp] 環境変数 SAZANAMI_TOKEN が設定されていません。' +
			'Sazanami の個人アクセストークン（sznm_...）を指定してください。'
	);
	process.exit(1);
}

try {
	new URL(BASE_URL);
} catch {
	console.error(`[sazanami-mcp] SAZANAMI_BASE_URL が不正なURLです: ${BASE_URL}`);
	process.exit(1);
}

/** API が返したエラーレスポンスを表す例外。 */
class ApiError extends Error {
	constructor(status, code, message, body) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
		this.code = code;
		this.body = body;
	}
}

/** HTML レスポンスを短い1行テキストへ（SvelteKit のエラーページ対策）。 */
function htmlToText(html) {
	return html
		.replace(/<script[\s\S]*?<\/script>/gi, ' ')
		.replace(/<style[\s\S]*?<\/style>/gi, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * /api/v1 配下を叩く。HTTP エラーは ApiError、ネットワーク断は Error を投げる
 * （呼び出し側のツールハンドラが人間可読な文字列に変換する）。
 */
async function api(path, { method = 'GET', query, body } = {}) {
	const url = new URL(`${BASE_URL}/api/v1${path}`);
	if (query) {
		for (const [key, value] of Object.entries(query)) {
			if (value === undefined || value === null || value === '') continue;
			url.searchParams.set(key, String(value));
		}
	}

	let res;
	try {
		res = await fetch(url, {
			method,
			headers: {
				authorization: `Bearer ${TOKEN}`,
				accept: 'application/json',
				...(body === undefined ? {} : { 'content-type': 'application/json' })
			},
			body: body === undefined ? undefined : JSON.stringify(body)
		});
	} catch (err) {
		const cause = err?.cause?.code || err?.cause?.message || err?.message || String(err);
		throw new Error(`Sazanami API に接続できませんでした (${BASE_URL}): ${cause}`);
	}

	const raw = await res.text();
	let data = null;
	if (raw) {
		try {
			data = JSON.parse(raw);
		} catch {
			data = raw;
		}
	}

	if (!res.ok) {
		const contentType = res.headers.get('content-type') || '';
		const errObj =
			data && typeof data === 'object' && !Array.isArray(data) ? data.error : undefined;
		const code = errObj && typeof errObj === 'object' ? errObj.code : undefined;

		let message = errObj && typeof errObj === 'object' ? errObj.message : undefined;
		if (!message && typeof data === 'string' && data.trim()) {
			const text = data.trim().startsWith('<') ? htmlToText(data) : data.trim();
			message = text.length > 300 ? `${text.slice(0, 300)}…` : text;
		}
		if (!message) message = res.statusText || '不明なエラー';
		if (!contentType.includes('json'))
			message += ` (非JSONレスポンス: content-type=${contentType || '不明'})`;

		throw new ApiError(res.status, code, message, data);
	}

	return data;
}

/** 成功レスポンス。 */
function jsonResult(data) {
	return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

/** 失敗レスポンス（MCP の isError 付き。プロセスは落とさない）。 */
function errorResult(message) {
	return { content: [{ type: 'text', text: message }], isError: true };
}

/** 例外を「status + error.code + message」形式の人間可読テキストへ。 */
function describeError(err) {
	if (err instanceof ApiError) {
		const code = err.code ? String(err.code) : '(なし)';
		return `Sazanami API エラー: HTTP ${err.status} / error.code=${code} / ${err.message}`;
	}
	return `エラー: ${err?.message ?? String(err)}`;
}

/** ツールハンドラの共通ラッパー（例外を握って isError を返す）。 */
function tool(handler) {
	return async (args) => {
		try {
			return await handler(args ?? {});
		} catch (err) {
			return errorResult(describeError(err));
		}
	};
}

const NOTE_STATUSES = ['inbox', 'box', 'archived', 'trash', 'box-archived', 'box-deleted'];

const server = new McpServer(
	{ name: 'sazanami-mcp', version: '0.1.0' },
	{
		instructions:
			'Sazanami のノートを検索・閲覧・作成・更新する MCP サーバーです。' +
			'一覧は list_notes、検索は search_notes（semantic: true で意味検索）、単体取得は get_note、' +
			'バックアップ/移行は export_notes と import_notes を使います。'
	}
);

// 1. list_notes
server.registerTool(
	'list_notes',
	{
		title: 'ノート一覧',
		description:
			'Sazanami のノートを更新順に一覧し、ステータス・キーワード・件数・オフセットで絞り込めます。',
		inputSchema: {
			status: z
				.string()
				.optional()
				.describe(
					'カンマ区切りのステータス（inbox,box,archived,trash,box-archived,box-deleted）。省略時は box-deleted 以外すべて'
				),
			q: z.string().optional().describe('タイトル・本文の部分一致キーワード'),
			limit: z.number().int().min(1).max(100).optional().describe('取得件数（1〜100、既定20）'),
			offset: z.number().int().min(0).optional().describe('読み飛ばす件数（既定0）')
		}
	},
	tool(async ({ status, q, limit, offset }) => {
		const data = await api('/notes', { query: { status, q, limit, offset } });
		return jsonResult(data);
	})
);

// 2. get_note
server.registerTool(
	'get_note',
	{
		title: 'ノート取得',
		description: '指定した ID のノートを本文・タグ・リンク解決結果まで含めて取得します。',
		inputSchema: {
			id: z.string().min(1).describe('ノートID')
		}
	},
	tool(async ({ id }) => {
		const data = await api(`/notes/${encodeURIComponent(id)}`);
		return jsonResult(data);
	})
);

// 3. search_notes
server.registerTool(
	'search_notes',
	{
		title: 'ノート検索',
		description:
			'ノートを検索します。既定はキーワードの全文一致、semantic: true にすると意味（埋め込み）検索になり、似ている順にスコア付きで返ります。',
		inputSchema: {
			q: z.string().min(1).describe('検索クエリ（必須）'),
			semantic: z
				.boolean()
				.optional()
				.describe('trueで意味検索（言い回しが違っても近い内容を返す・score付き）'),
			limit: z.number().int().min(1).max(50).optional().describe('取得件数（1〜50、既定20）')
		}
	},
	tool(async ({ q, semantic, limit }) => {
		const data = await api(semantic ? '/search/semantic' : '/search', { query: { q, limit } });
		return jsonResult(data);
	})
);

// 4. create_note
server.registerTool(
	'create_note',
	{
		title: 'ノート作成',
		description: '新しいノートをタイトル・本文・ステータス・タグを指定して作成します。',
		inputSchema: {
			title: z.string().optional().describe('タイトル（省略時 Untitled Note）'),
			content: z.string().optional().describe('本文（Markdown）'),
			status: z.enum(NOTE_STATUSES).optional().describe('ステータス（省略時 inbox）'),
			tags: z.array(z.string()).optional().describe('付与するタグ名の配列')
		}
	},
	tool(async ({ title, content, status, tags }) => {
		const body = {};
		if (title !== undefined) body.title = title;
		if (content !== undefined) body.content = content;
		if (status !== undefined) body.status = status;
		if (tags !== undefined) body.tags = tags;

		const data = await api('/notes', { method: 'POST', body });
		const note = data?.note ?? data ?? {};
		const lines = [
			`ノートを作成しました: ${note.title ?? '(無題)'}`,
			`id: ${note.id ?? '(不明)'}`,
			'',
			JSON.stringify(data, null, 2)
		];
		return { content: [{ type: 'text', text: lines.join('\n') }] };
	})
);

// 5. update_note
server.registerTool(
	'update_note',
	{
		title: 'ノート更新',
		description: '既存ノートのタイトル・本文・ステータス・公開設定を部分更新します。',
		inputSchema: {
			id: z.string().min(1).describe('ノートID'),
			title: z.string().optional().describe('新しいタイトル'),
			content: z.string().optional().describe('新しい本文（Markdown）'),
			status: z.enum(NOTE_STATUSES).optional().describe('新しいステータス'),
			isPublic: z.boolean().optional().describe('公開するかどうか')
		}
	},
	tool(async ({ id, title, content, status, isPublic }) => {
		const body = {};
		if (title !== undefined) body.title = title;
		if (content !== undefined) body.content = content;
		if (status !== undefined) body.status = status;
		if (isPublic !== undefined) body.isPublic = isPublic;

		if (Object.keys(body).length === 0) {
			return errorResult(
				'エラー: 更新するフィールドが指定されていません。title / content / status / isPublic のいずれかを指定してください。'
			);
		}

		const data = await api(`/notes/${encodeURIComponent(id)}`, { method: 'PUT', body });
		const note = data?.note ?? data ?? {};
		const lines = [
			`ノートを更新しました: ${note.title ?? '(無題)'}`,
			`id: ${note.id ?? id}`,
			'',
			JSON.stringify(data, null, 2)
		];
		return { content: [{ type: 'text', text: lines.join('\n') }] };
	})
);

// 6. get_links
server.registerTool(
	'get_links',
	{
		title: 'リンク取得',
		description: 'ノートの1ホップリンク・2ホップリンク・被リンク（バックリンク）を取得します。',
		inputSchema: {
			id: z.string().min(1).describe('ノートID')
		}
	},
	tool(async ({ id }) => {
		const data = await api(`/notes/${encodeURIComponent(id)}/links`);
		return jsonResult(data);
	})
);

// 7. export_notes
server.registerTool(
	'export_notes',
	{
		title: 'ノート全件エクスポート',
		description:
			'ノートをJSONでまとめて吸い出します（バックアップ・移行用）。limit/cursorで分割取得できます。',
		inputSchema: {
			limit: z.number().int().min(1).max(500).optional().describe('取得件数（1〜500、既定100）'),
			cursor: z.string().optional().describe('前回の nextCursor（続きを取るとき）')
		}
	},
	tool(async ({ limit, cursor }) => {
		const data = await api('/export', { query: { limit, cursor } });
		return jsonResult(data);
	})
);

// 8. import_notes
server.registerTool(
	'import_notes',
	{
		title: 'ノート一括インポート',
		description:
			'export_notes が返した notes 配列をそのまま投入します。同名タイトルは既定でスキップ。',
		inputSchema: {
			notes: z
				.array(
					z.object({
						title: z.string().optional(),
						content: z.string().optional(),
						status: z.enum(NOTE_STATUSES).optional(),
						tags: z.array(z.string()).optional(),
						createdAt: z.string().optional(),
						updatedAt: z.string().optional()
					})
				)
				.min(1)
				.max(500)
				.describe('投入するノート配列（1〜500件）'),
			skipExistingTitles: z.boolean().optional().describe('既存タイトルをスキップ（既定true）')
		}
	},
	tool(async ({ notes, skipExistingTitles }) => {
		const data = await api('/import', { method: 'POST', body: { notes, skipExistingTitles } });
		return jsonResult(data);
	})
);

async function main() {
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error(`[sazanami-mcp] ready (base: ${BASE_URL})`);
}

main().catch((err) => {
	console.error('[sazanami-mcp] 起動に失敗しました:', err);
	process.exit(1);
});
