// src/service-worker.ts
// SvelteKitの標準のService Workerファイル。
// $service-workerの仮想モジュールはここでしか使えない。

import { build, files, version } from '$service-worker';

// キャッシュ名とバージョンを定義
const CACHE_NAME = `sazanami-cache-${version}`;
const API_CACHE_NAME = `sazanami-api-cache-${version}`;

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
				console.log('[Service Worker] Caching static assets');
				return cache.addAll(ASSETS_TO_CACHE);
			})
			.catch((error) => {
				console.error('[Service Worker] Failed to cache static assets:', error);
			})
	);

	// 新しいService Workerを即座にアクティベートする
	(self as unknown as ServiceWorkerGlobalScope).skipWaiting();
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
	(self as unknown as ServiceWorkerGlobalScope).clients.claim();
});

/**
 * Service Workerのフェッチイベントハンドラ
 */
self.addEventListener('fetch', (event) => {
	const requestUrl = new URL((event as FetchEvent).request.url);

	// APIリクエストの場合 (Network First)
	if (requestUrl.pathname.startsWith('/api/')) {
		(event as FetchEvent).respondWith(
			fetch((event as FetchEvent).request)
				.then((response) => {
					if (response.status === 200) {
						const responseToCache = response.clone();
						caches.open(API_CACHE_NAME).then((cache) => {
							cache.put((event as FetchEvent).request, responseToCache);
						});
					}
					return response;
				})
				.catch(() => {
					return caches
						.match((event as FetchEvent).request)
						.then((cachedResponse) => {
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
		(event as FetchEvent).respondWith(
			caches.match((event as FetchEvent).request).then((cachedResponse) => {
				// キャッシュにあればそれを返す
				if (cachedResponse) {
					return cachedResponse;
				}

				// キャッシュになければネットワークから取得し、キャッシュにも保存する
				return fetch((event as FetchEvent).request).then((response) => {
					// `basic` タイプのレスポンスのみキャッシュする
					if (!response || response.status !== 200 || response.type !== 'basic') {
						return response;
					}

					const responseToCache = response.clone();
					caches.open(CACHE_NAME).then((cache) => {
						cache.put((event as FetchEvent).request, responseToCache);
					});

					return response;
				});
			})
		);
	}
});
