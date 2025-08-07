// static/sw.js

// キャッシュ名とバージョンを定義
const CACHE_NAME = 'sazanami-cache-v1';
const API_CACHE_NAME = 'sazanami-api-cache-v1';

// キャッシュする静的アセットのリスト
const ASSETS_TO_CACHE = [
	'/',
	'/index.html', // SvelteKitはSPAなので、ルートがHTMLを返す
	'/global.css', // アプリケーションのグローバルCSS
	// 必要に応じて、他の静的アセット（画像、JSファイルなど）を追加
	'/favicon.png',
	'/manifest.json',
	'/sazanami-icon-H185-dark-48x48.png',
	'/sazanami-icon-H185-dark-192x192.png',
	'/sazanami-icon-H185-dark-512x512.png'
];

/**
 * Service Workerのインストールイベントハンドラ
 * Service Workerが登録されたときに一度だけ実行される
 * 静的アセットをキャッシュする
 */
self.addEventListener('install', (event) => {
	// インストール処理が完了するまで待機
	event.waitUntil(
		// 'sazanami-cache-v1'という名前のキャッシュを開く
		caches
			.open(CACHE_NAME)
			.then((cache) => {
				// キャッシュするアセットをログに出力
				console.log('[Service Worker] Caching static assets:', ASSETS_TO_CACHE);
				// 指定されたアセットをキャッシュに追加
				return cache.addAll(ASSETS_TO_CACHE);
			})
			.catch((error) => {
				// キャッシュ失敗時のエラーログ
				console.error('[Service Worker] Failed to cache static assets:', error);
			})
	);
});

/**
 * Service Workerのアクティベートイベントハンドラ
 * 古いキャッシュをクリアする
 */
self.addEventListener('activate', (event) => {
	// アクティベート処理が完了するまで待機
	event.waitUntil(
		// すべてのキャッシュキーを取得
		caches.keys().then((cacheNames) => {
			// Promise.allを使用して、すべての古いキャッシュの削除が完了するまで待機
			return Promise.all(
				// 現在のキャッシュ名とAPIキャッシュ名以外のキャッシュをフィルタリング
				cacheNames
					.filter((name) => {
						return name !== CACHE_NAME && name !== API_CACHE_NAME;
					})
					.map((name) => {
						// 古いキャッシュを削除
						console.log(`[Service Worker] Deleting old cache: ${name}`);
						return caches.delete(name);
					})
			);
		})
	);
	// Service Workerが即座に制御を開始するようにする
	self.clients.claim();
});

/**
 * Service Workerのフェッチイベントハンドラ
 * ネットワークリクエストをインターセプトし、キャッシュ戦略を適用する
 */
self.addEventListener('fetch', (event) => {
	const requestUrl = new URL(event.request.url);

	// APIリクエストの場合 (Network First)
	if (requestUrl.pathname.startsWith('/api/')) {
		event.respondWith(
			// ネットワークから先に取得を試みる
			fetch(event.request)
				.then((response) => {
					// ネットワークからのレスポンスが正常かつキャッシュ可能な場合
					if (response.status === 200 && response.type === 'basic') {
						// レスポンスをクローンしてキャッシュに保存
						const responseToCache = response.clone();
						caches.open(API_CACHE_NAME).then((cache) => {
							console.log(`[Service Worker] Caching API response: ${requestUrl.pathname}`);
							cache.put(event.request, responseToCache);
						});
					}
					// ネットワークからのレスポンスを返す
					return response;
				})
				.catch(() => {
					// ネットワークが利用できない場合、APIキャッシュから取得を試みる
					console.log(
						`[Service Worker] Network failed, trying API cache for: ${requestUrl.pathname}`
					);
					return caches.match(event.request).then((cachedResponse) => {
						if (cachedResponse) {
							console.log(`[Service Worker] Found in API cache: ${requestUrl.pathname}`);
							return cachedResponse;
						}
						// キャッシュにもない場合は、オフラインを通知するレスポンスを返す
						console.warn(
							`[Service Worker] Not found in API cache, returning offline fallback for: ${requestUrl.pathname}`
						);
						return new Response('API is offline', {
							status: 503,
							statusText: 'Service Unavailable'
						});
					});
				})
		);
	} else {
		// その他の静的アセットの場合 (Cache First)
		event.respondWith(
			// キャッシュから先に取得を試みる
			caches.match(event.request).then((cachedResponse) => {
				if (cachedResponse) {
					// キャッシュに存在する場合
					console.log(`[Service Worker] Found in cache: ${requestUrl.pathname}`);
					return cachedResponse;
				}
				// キャッシュに存在しない場合、ネットワークから取得
				console.log(
					`[Service Worker] Not found in cache, fetching from network: ${requestUrl.pathname}`
				);
				return fetch(event.request)
					.then((response) => {
						// ネットワークからのレスポンスが正常かつキャッシュ可能な場合
						if (response.status === 200 && response.type === 'basic') {
							const responseToCache = response.clone();
							caches.open(CACHE_NAME).then((cache) => {
								console.log(`[Service Worker] Caching network response: ${requestUrl.pathname}`);
								cache.put(event.request, responseToCache);
							});
						}
						return response;
					})
					.catch(() => {
						// ネットワークも利用できない場合のフォールバック（オフラインページなど）
						console.warn(
							`[Service Worker] Network failed and not in cache, returning offline fallback for: ${requestUrl.pathname}`
						);
						// 例: オフラインページを返す (ここでは簡略化のため空のレスポンス)
						return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
					});
			})
		);
	}
});
