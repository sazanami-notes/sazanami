import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { ulid } from 'ulid';
import { GET as getLinkTitle } from '../../src/routes/api/link-title/+server';

// authモック（既存のintegrationテストと同じ方式。ルートはcreateAuth()ファクトリを呼ぶ）
const { mockAuth } = vi.hoisted(() => ({
	mockAuth: {
		api: {
			getSession: vi.fn()
		}
	}
}));

vi.mock('$lib/server/auth', () => ({
	createAuth: vi.fn(() => mockAuth)
}));

const mockSession = {
	user: {
		id: 'linkTitleTestUser',
		email: 'link-title-test@example.com',
		name: 'Link Title Test',
		emailVerified: false,
		twoFactorEnabled: false,
		createdAt: new Date(),
		updatedAt: new Date()
	},
	session: {
		id: ulid(),
		userId: 'linkTitleTestUser',
		expiresAt: new Date(Date.now() + 60 * 60 * 1000),
		createdAt: new Date(),
		updatedAt: new Date(),
		token: 'dummy-token'
	}
};

type SessionLike = typeof mockSession;

type LinkTitleBody = {
	ok: boolean;
	url?: string;
	title?: string | null;
	error?: string;
};

const createMockRequestHandlerParams = (path: string): RequestEvent => {
	const request = new Request(`http://localhost${path}`, {
		method: 'GET',
		headers: { cookie: 'better-auth.session_token=dummy' }
	});

	return {
		request,
		url: new URL(request.url),
		params: {},
		cookies: {
			get: vi.fn(),
			set: vi.fn(),
			delete: vi.fn(),
			serialize: vi.fn(),
			getAll: vi.fn()
		},
		fetch: vi.fn(),
		getClientAddress: vi.fn(() => '127.0.0.1'),
		locals: { user: null, session: null, auth: mockAuth.api },
		platform: { env: {} },
		route: { id: '/api/link-title' },
		setHeaders: vi.fn(),
		isDataRequest: false,
		isSubRequest: false
	} as unknown as RequestEvent;
};

const apiPath = (url: string): string => `/api/link-title?url=${encodeURIComponent(url)}`;

const callApi = async (
	path: string,
	session: SessionLike | null = mockSession
): Promise<{ status: number; body: LinkTitleBody }> => {
	mockAuth.api.getSession.mockResolvedValueOnce(session);
	const event = createMockRequestHandlerParams(path);
	const response = await getLinkTitle(event as Parameters<typeof getLinkTitle>[0]);
	return { status: response.status, body: (await response.json()) as LinkTitleBody };
};

/** fetchのモック用レスポンス。res.urlはリダイレクト後の最終URLとして扱われる */
const htmlResponse = (
	html: string,
	finalUrl: string,
	contentType = 'text/html; charset=utf-8'
): Response => {
	const response = new Response(html, { status: 200, headers: { 'content-type': contentType } });
	// 実環境のResponse.urlは読み取り専用だが、モックでは最終URLを明示する必要がある
	Object.defineProperty(response, 'url', { value: finalUrl });
	return response;
};

const stubFetch = (response: Response): ReturnType<typeof vi.fn> => {
	const fetchMock = vi.fn(() => Promise.resolve(response));
	vi.stubGlobal('fetch', fetchMock);
	return fetchMock;
};

beforeEach(() => {
	mockAuth.api.getSession.mockReset();
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('GET /api/link-title 認証とURLバリデーション', () => {
	it('セッションが無ければ401', async () => {
		const { status, body } = await callApi(apiPath('https://example.com/'), null);
		expect(status).toBe(401);
		expect(body.ok).toBe(false);
	});

	it('urlパラメータが無ければ400 invalid_url', async () => {
		const { status, body } = await callApi('/api/link-title');
		expect(status).toBe(400);
		expect(body.ok).toBe(false);
		expect(body.error).toBe('invalid_url');
	});

	it('urlパラメータが空文字なら400 invalid_url', async () => {
		const { status, body } = await callApi('/api/link-title?url=');
		expect(status).toBe(400);
		expect(body.error).toBe('invalid_url');
	});

	it.each([
		'file:///etc/passwd',
		'javascript:alert(1)',
		'data:text/html,<title>x</title>',
		'ftp://example.com/'
	])('http/https以外のスキーム %s は400 invalid_url', async (url) => {
		const { status, body } = await callApi(apiPath(url));
		expect(status).toBe(400);
		expect(body.ok).toBe(false);
		expect(body.error).toBe('invalid_url');
	});

	it('URLとして解釈できない文字列は400 invalid_url', async () => {
		const { status, body } = await callApi(apiPath('not a url'));
		expect(status).toBe(400);
		expect(body.error).toBe('invalid_url');
	});

	it.each([
		'http://localhost/',
		'http://localhost./',
		'http://LOCALHOST/admin',
		'http://127.0.0.1/',
		'http://127.1.2.3:8080/',
		'http://10.0.0.5/',
		'http://172.16.0.1/',
		'http://172.31.255.254/',
		'http://192.168.1.1/',
		'http://169.254.169.254/latest/meta-data/',
		'http://0.0.0.0/',
		'http://[::1]/',
		'http://[::ffff:127.0.0.1]/',
		'http://[fc00::1]/',
		'http://[fd12:3456:789a::1]/',
		'http://[fe80::1]/',
		'http://router.local/',
		'http://metadata.internal/'
	])('内部ネットワークを指すホスト %s は400 blocked_host', async (url) => {
		const { status, body } = await callApi(apiPath(url));
		expect(status).toBe(400);
		expect(body.ok).toBe(false);
		expect(body.error).toBe('blocked_host');
	});

	it('8進/16進/10進のIPv4表記でもループバックとして拒否する', async () => {
		// URL APIが 127.0.0.1 に正規化するため、文字列表記の抜け道は塞がれる
		const { status, body } = await callApi(apiPath('http://0x7f000001/'));
		expect(status).toBe(400);
		expect(body.error).toBe('blocked_host');
	});

	it.each(['http://example.com:3000/', 'https://example.com:22/', 'http://example.com:6379/'])(
		'許可外ポート %s は400 blocked_port',
		async (url) => {
			const { status, body } = await callApi(apiPath(url));
			expect(status).toBe(400);
			expect(body.ok).toBe(false);
			expect(body.error).toBe('blocked_port');
		}
	);

	it.each(['http://example.com:8080/page', 'https://example.com:8443/page'])(
		'許可ポート %s は取得できる',
		async (url) => {
			stubFetch(htmlResponse('<html><head><title>許可ポート</title></head></html>', url));
			const { status, body } = await callApi(apiPath(url));
			expect(status).toBe(200);
			expect(body.ok).toBe(true);
			expect(body.title).toBe('許可ポート');
		}
	);
});

describe('GET /api/link-title タイトル抽出', () => {
	it('og:title を <title> より優先する', async () => {
		const html = `<!doctype html>
			<html><head>
				<title>HTMLのタイトル</title>
				<meta property="og:title" content="OGのタイトル">
			</head><body></body></html>`;
		const fetchMock = stubFetch(htmlResponse(html, 'https://example.com/article'));

		const { status, body } = await callApi(apiPath('https://example.com/article'));

		expect(status).toBe(200);
		expect(body).toEqual({
			ok: true,
			url: 'https://example.com/article',
			title: 'OGのタイトル'
		});
		expect(fetchMock).toHaveBeenCalledWith(
			'https://example.com/article',
			expect.objectContaining({ redirect: 'follow' })
		);
	});

	it('og:title が content 属性より後ろにあっても取得する', async () => {
		const html = '<html><head><meta content="順序が逆のOG" property="og:title"></head></html>';
		stubFetch(htmlResponse(html, 'https://example.com/'));
		const { body } = await callApi(apiPath('https://example.com/'));
		expect(body.title).toBe('順序が逆のOG');
	});

	it('og:title が無ければ <title> を使う', async () => {
		const html = '<html><head><title>ページタイトル</title></head><body>本文</body></html>';
		stubFetch(htmlResponse(html, 'https://example.com/'));
		const { status, body } = await callApi(apiPath('https://example.com/'));
		expect(status).toBe(200);
		expect(body).toEqual({ ok: true, url: 'https://example.com/', title: 'ページタイトル' });
	});

	it('タイトルが無ければ ok:false / title:null', async () => {
		const html = '<html><head></head><body>タイトルなし</body></html>';
		stubFetch(htmlResponse(html, 'https://example.com/'));
		const { status, body } = await callApi(apiPath('https://example.com/'));
		expect(status).toBe(200);
		expect(body.ok).toBe(false);
		expect(body.url).toBe('https://example.com/');
		expect(body.title).toBeNull();
	});

	it('HTMLエンティティをデコードし空白を正規化する', async () => {
		const html =
			'<html><head><title>  A &amp; B&nbsp;&#39;s&#x27; &quot;quoted&quot; &lt;tag&gt;  </title></head></html>';
		stubFetch(htmlResponse(html, 'https://example.com/'));
		const { body } = await callApi(apiPath('https://example.com/'));
		expect(body.title).toBe('A & B \'s\' "quoted" <tag>');
	});

	it('タイトルは200文字に切り詰める', async () => {
		const longTitle = 'あ'.repeat(250);
		stubFetch(
			htmlResponse(`<html><head><title>${longTitle}</title></head></html>`, 'https://example.com/')
		);
		const { body } = await callApi(apiPath('https://example.com/'));
		expect(Array.from(body.title ?? '')).toHaveLength(200);
	});

	it('200KBを超えた部分は読み込まない', async () => {
		// タイトルタグを上限より後ろに置く（打ち切りが効いていれば見つからない）
		const padding = 'x'.repeat(210 * 1024);
		const html = `<html><head>${padding}<title>遅いタイトル</title></head></html>`;
		stubFetch(htmlResponse(html, 'https://example.com/'));
		const { status, body } = await callApi(apiPath('https://example.com/'));
		expect(status).toBe(200);
		expect(body.ok).toBe(false);
		expect(body.title).toBeNull();
	});

	it('HTML以外のContent-Typeはタイトルを取らない', async () => {
		stubFetch(htmlResponse('%PDF-1.7', 'https://example.com/doc.pdf', 'application/pdf'));
		const { status, body } = await callApi(apiPath('https://example.com/doc.pdf'));
		expect(status).toBe(200);
		expect(body.ok).toBe(false);
		expect(body.title).toBeNull();
	});
});

describe('GET /api/link-title リダイレクト後の再検証', () => {
	it('リダイレクト後の最終URLが内部ホストなら400 blocked_host', async () => {
		const html = '<html><head><title>内部ページ</title></head></html>';
		stubFetch(htmlResponse(html, 'http://192.168.1.1/admin'));
		const { status, body } = await callApi(apiPath('https://example.com/redirect'));
		expect(status).toBe(400);
		expect(body.ok).toBe(false);
		expect(body.error).toBe('blocked_host');
	});

	it('リダイレクト後の最終URLがlocalhostなら400 blocked_host', async () => {
		stubFetch(htmlResponse('<html><head><title>x</title></head></html>', 'http://localhost:8080/'));
		const { status, body } = await callApi(apiPath('https://example.com/redirect'));
		expect(status).toBe(400);
		expect(body.error).toBe('blocked_host');
	});

	it('リダイレクト後の最終URLが許可外ポートなら400 blocked_port', async () => {
		stubFetch(
			htmlResponse('<html><head><title>x</title></head></html>', 'http://example.com:3000/')
		);
		const { status, body } = await callApi(apiPath('https://example.com/redirect'));
		expect(status).toBe(400);
		expect(body.error).toBe('blocked_port');
	});

	it('取得が失敗したら502 fetch_failed', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(() => Promise.reject(new Error('network error')))
		);
		const { status, body } = await callApi(apiPath('https://example.com/'));
		expect(status).toBe(502);
		expect(body.ok).toBe(false);
		expect(body.error).toBe('fetch_failed');
	});
});
