// static/sw.js

// SvelteKitのビルド成果物と、手動でキャッシュしたい静的ファイルを取得
import { build, files } from '$service-worker';

// キャッシュ名とバージョンを定義
const CACHE_NAME = 'sazanami-cache-v2';
const API_CACHE_NAME = 'sazanami-api-cache-v2';

// キャッシュするアセットのリストを動的に生成
// build: SvelteKitが生成した全ファイル（JS, CSSなど）
// files: staticフォルダ内の全ファイル
const ASSETS_TO_CACHE = [...build, ...files];

/**
 * Service Workerのインストールイベントハンドラ
 */
self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE_NAME)
			.then((cache) => {
				console.log('[Service Worker] Caching static assets:', ASSETS_TO_CACHE);
				return cache.addAll(ASSETS_TO_CACHE);
			})
			.catch((error) => {
				console.error('[Service Worker] Failed to cache static assets:', error);
			})
	);
});

/**
 * Service Workerのアクティベートイベントハンドラ
 * 古いキャッシュをクリアする
 */
self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames
					.filter((name) => {
						return name !== CACHE_NAME && name !== API_CACHE_NAME;
					})
					.map((name) => {
						console.log(`[Service Worker] Deleting old cache: ${name}`);
						return caches.delete(name);
					})
			);
		})
	);
	self.clients.claim();
});

/**
 * Service Workerのフェッチイベントハンドラ
 */
self.addEventListener('fetch', (event) => {
	const requestUrl = new URL(event.request.url);

	// APIリクエストの場合 (Network First)
	if (requestUrl.pathname.startsWith('/api/')) {
		event.respondWith(
			fetch(event.request)
				.then((response) => {
					if (response.status === 200) {
						const responseToCache = response.clone();
						caches.open(API_CACHE_NAME).then((cache) => {
							console.log(`[Service Worker] Caching API response: ${requestUrl.pathname}`);
							cache.put(event.request, responseToCache);
						});
					}
					return response;
				})
				.catch(() => {
					console.log(
						`[Service Worker] Network failed, trying API cache for: ${requestUrl.pathname}`
					);
					return caches.match(event.request).then((cachedResponse) => {
						if (cachedResponse) {
							return cachedResponse;
						}
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
			caches.match(event.request).then((cachedResponse) => {
				// キャッシュにあればそれを返す
				if (cachedResponse) {
					return cachedResponse;
				}

				// キャッシュになければネットワークから取得し、キャッシュにも保存する
				return fetch(event.request).then((response) => {
					// `basic` タイプのレスポンスのみキャッシュする
					// (Chrome拡張機能などが原因で `opaque` レスポンスが返ってくることがあるため)
					if (!response || response.status !== 200 || response.type !== 'basic') {
						return response;
					}

					const responseToCache = response.clone();
					caches.open(CACHE_NAME).then((cache) => {
						cache.put(event.request, responseToCache);
					});

					return response;
				});
			})
		);
	}
});
