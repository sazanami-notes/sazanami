// src/routes/api/link-title/+server.ts
// エディタにURLを貼った時にページタイトルを取得する内部API（Obsidianの Auto Link Title 相当）。
// セッションCookie必須・同一オリジンからのみ利用する（CORSは付けない）。
//
// SSRF対策の方針:
// - http/https 以外を拒否
// - ホスト名がローカル/内部を指すもの（localhost・*.local・*.internal・プライベートIPv4・
//   ループバック・リンクローカル・IPv6の ::1/fc00::/7/fe80::/10）を拒否
// - ポートは 80/443/8080/8443 のみ許可
// - リダイレクト追従後に res.url（最終URL）へ同じ検証を再適用
// DNS解決はWorkersでは node:dns が使えないため行わない（DNSリバインディングは対象外）。
import { json, type RequestHandler } from '@sveltejs/kit';

import { getSessionCached } from '$lib/server/auth-session';

/** 取得を許可するポート（URL.port は既定ポートのとき空文字になるため空文字も許可） */
const ALLOWED_PORTS = new Set(['', '80', '443', '8080', '8443']);
/** 本文の読み込み上限（これを超えた分は打ち切る） */
const MAX_BYTES = 200 * 1024;
/** 1リクエストの取得タイムアウト */
const TIMEOUT_MS = 5_000;
/** タイトルの最大文字数 */
const MAX_TITLE_LENGTH = 200;
/** 内部ネットワーク扱いにするホスト名のサフィックス */
const BLOCKED_SUFFIXES = ['.local', '.internal'];

type ValidationError = 'invalid_url' | 'blocked_host' | 'blocked_port';
type ValidationResult = { ok: true; url: URL } | { ok: false; error: ValidationError };

/** IPv4リテラルを octet 配列に変換する（リテラルでなければ null） */
function parseIpv4(host: string): number[] | null {
	const parts = host.split('.');
	if (parts.length !== 4) return null;
	const octets: number[] = [];
	for (const part of parts) {
		if (!/^\d{1,3}$/.test(part)) return null;
		const value = Number(part);
		if (value > 255) return null;
		octets.push(value);
	}
	return octets;
}

/** プライベート・ループバック・リンクローカル等のIPv4か */
function isBlockedIpv4(octets: number[]): boolean {
	const [a, b] = octets;
	// 0.0.0.0/8（このネットワーク）・10.0.0.0/8・127.0.0.0/8（ループバック）
	if (a === 0 || a === 10 || a === 127) return true;
	// 169.254.0.0/16（リンクローカル。クラウドのメタデータAPIを含む）
	if (a === 169 && b === 254) return true;
	// 172.16.0.0/12
	if (a === 172 && b >= 16 && b <= 31) return true;
	// 192.168.0.0/16
	if (a === 192 && b === 168) return true;
	// 100.64.0.0/10（CGNAT）・198.18.0.0/15（ベンチマーク用）も内部扱いにする
	if (a === 100 && b >= 64 && b <= 127) return true;
	if (a === 198 && (b === 18 || b === 19)) return true;
	return false;
}

/** IPv4射影IPv6（::ffff:127.0.0.1 / ::ffff:7f00:1）をIPv4のoctet配列に変換する */
function mappedIpv4(rest: string): number[] | null {
	if (/^\d{1,3}(\.\d{1,3}){3}$/.test(rest)) return parseIpv4(rest);
	const groups = rest.split(':');
	if (groups.length !== 2) return null;
	const values = groups.map((group) =>
		/^[0-9a-f]{1,4}$/i.test(group) ? parseInt(group, 16) : NaN
	);
	if (values.some((value) => Number.isNaN(value))) return null;
	return [values[0] >> 8, values[0] & 0xff, values[1] >> 8, values[1] & 0xff];
}

/** ループバック・ULA(fc00::/7)・リンクローカル(fe80::/10)等のIPv6か。host は [ ] 付きを想定 */
function isBlockedIpv6(host: string): boolean {
	const bare = host.replace(/^\[/, '').replace(/\]$/, '').toLowerCase();
	// 未指定アドレス・ループバック（::1 / 0:0:0:0:0:0:0:1）
	if (bare === '::' || bare === '::1' || bare === '0:0:0:0:0:0:0:0' || bare === '0:0:0:0:0:0:0:1') {
		return true;
	}
	// IPv4射影アドレスはIPv4の判定に委譲する
	const mapped = /^::ffff:(.+)$/.exec(bare);
	if (mapped) {
		const octets = mappedIpv4(mapped[1]);
		if (octets && isBlockedIpv4(octets)) return true;
	}
	const firstHextet = bare.split(':')[0];
	const first = firstHextet ? parseInt(firstHextet, 16) : 0;
	if (Number.isNaN(first)) return true;
	// fc00::/7（ユニークローカルアドレス）
	if (first >= 0xfc00 && first <= 0xfdff) return true;
	// fe80::/10（リンクローカル）
	if (first >= 0xfe80 && first <= 0xfebf) return true;
	return false;
}

/** 取得対象URLの検証。成功時は正規化済みの URL を返す */
function validateTarget(raw: string): ValidationResult {
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		return { ok: false, error: 'invalid_url' };
	}

	// http/https 以外（file: / javascript: / data: 等）は拒否
	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		return { ok: false, error: 'invalid_url' };
	}
	if (!url.hostname) {
		return { ok: false, error: 'invalid_url' };
	}

	// ポート制限（既定ポートは url.port が空文字になるのでプロトコル既定値を補う）
	const port = url.port || (url.protocol === 'https:' ? '443' : '80');
	if (!ALLOWED_PORTS.has(port)) {
		return { ok: false, error: 'blocked_port' };
	}

	// 末尾ドット（localhost. 等）を落としてからホスト名を判定する
	const host = url.hostname.toLowerCase().replace(/\.$/, '');
	if (!host) {
		return { ok: false, error: 'invalid_url' };
	}
	if (host === 'localhost' || BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
		return { ok: false, error: 'blocked_host' };
	}

	if (host.startsWith('[')) {
		if (isBlockedIpv6(host)) return { ok: false, error: 'blocked_host' };
	} else {
		const octets = parseIpv4(host);
		if (octets && isBlockedIpv4(octets)) return { ok: false, error: 'blocked_host' };
	}

	return { ok: true, url };
}

/** 数値参照を安全に文字へ変換する（不正値は空文字） */
function fromCodePointSafe(code: number): string {
	if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return '';
	try {
		return String.fromCodePoint(code);
	} catch {
		return '';
	}
}

/** HTMLエンティティの最低限のデコード（&amp; は二重デコードを避けるため最後） */
function decodeEntities(input: string): string {
	return input
		.replace(/&#x([0-9a-f]+);/gi, (_match, hex: string) => fromCodePointSafe(parseInt(hex, 16)))
		.replace(/&#(\d+);/g, (_match, dec: string) => fromCodePointSafe(parseInt(dec, 10)))
		.replace(/&nbsp;/g, ' ')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&amp;/g, '&');
}

/** 空白を正規化し、指定文字数（コードポイント単位）に切り詰める */
function normalizeTitle(raw: string): string {
	const text = decodeEntities(raw).replace(/\s+/g, ' ').trim();
	if (!text) return '';
	return Array.from(text).slice(0, MAX_TITLE_LENGTH).join('');
}

/** タグ内の属性値を取り出す */
function getAttribute(tag: string, name: string): string | null {
	const pattern = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i');
	const match = pattern.exec(tag);
	if (!match) return null;
	return match[1] ?? match[2] ?? match[3] ?? null;
}

/** og:title を優先し、無ければ <title> を返す。見つからなければ null */
function extractTitle(html: string): string | null {
	for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
		const key = (getAttribute(tag, 'property') ?? getAttribute(tag, 'name') ?? '').toLowerCase();
		if (key !== 'og:title') continue;
		const title = normalizeTitle(getAttribute(tag, 'content') ?? '');
		if (title) return title;
	}

	const match = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html);
	if (match) {
		// <title> 内にタグが混ざることは稀だが、念のため除去する
		const title = normalizeTitle(match[1].replace(/<[^>]*>/g, ' '));
		if (title) return title;
	}

	return null;
}

/** レスポンス本文を上限バイト数まで読む */
async function readBodyLimited(res: Response, maxBytes: number): Promise<string> {
	const body = res.body;
	if (!body) return '';

	const reader = body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;
	try {
		while (total < maxBytes) {
			const { done, value } = await reader.read();
			if (done) break;
			if (!value || value.byteLength === 0) continue;
			const remaining = maxBytes - total;
			const chunk = value.byteLength > remaining ? value.subarray(0, remaining) : value;
			chunks.push(chunk);
			total += chunk.byteLength;
		}
	} finally {
		await reader.cancel().catch(() => {});
	}

	const merged = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		merged.set(chunk, offset);
		offset += chunk.byteLength;
	}

	const charset = /charset\s*=\s*"?([\w-]+)/i.exec(res.headers.get('content-type') ?? '')?.[1];
	let decoder: TextDecoder;
	try {
		decoder = new TextDecoder(charset ?? 'utf-8');
	} catch {
		decoder = new TextDecoder('utf-8');
	}
	return decoder.decode(merged);
}

export const GET: RequestHandler = async ({ request, url }) => {
	// セッションCookie必須（外部トークンからの利用は想定しない）
	const session = await getSessionCached(request.headers);
	if (!session) {
		return json({ ok: false, error: 'unauthorized' }, { status: 401 });
	}

	const raw = url.searchParams.get('url');
	if (!raw) {
		return json({ ok: false, error: 'invalid_url' }, { status: 400 });
	}

	const target = validateTarget(raw);
	if (!target.ok) {
		return json({ ok: false, error: target.error }, { status: 400 });
	}

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

	try {
		const res = await fetch(target.url.toString(), {
			redirect: 'follow',
			signal: controller.signal,
			headers: {
				accept: 'text/html,application/xhtml+xml',
				'user-agent': 'SazanamiBot/0.1 (+https://sazanami.kaedesato.work)'
			}
		});

		// リダイレクト後の最終URLにも同じ検証を適用する（内部ネットワークへ飛ばすリダイレクト対策）
		const finalUrl = res.url || target.url.toString();
		const finalTarget = validateTarget(finalUrl);
		if (!finalTarget.ok) {
			return json({ ok: false, error: finalTarget.error }, { status: 400 });
		}

		// HTML以外（画像・PDF等）はタイトルを取らない
		const contentType = res.headers.get('content-type') ?? '';
		if (contentType && !/html|xhtml/i.test(contentType)) {
			return json({ ok: false, url: finalUrl, title: null });
		}

		const title = extractTitle(await readBodyLimited(res, MAX_BYTES));
		// タイトルが取れなかった場合も「失敗」として 200 で返す（クライアント側はURLをそのまま使う）
		return json({ ok: title !== null, url: finalUrl, title });
	} catch (error) {
		console.error('link-title fetch failed:', error);
		return json({ ok: false, error: 'fetch_failed' }, { status: 502 });
	} finally {
		clearTimeout(timer);
	}
};
