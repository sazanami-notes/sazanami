// src/service-worker.ts
// SvelteKitの標準のService Workerファイル。
// $service-workerの仮想モジュールはここでしか使えない。
//
// 戦略（2026-08-17整理・オフライン対応）:
// - 静的アセット（JS/CSS/static）: Cache First（インストール時にプリキャッシュ）
// - ナビゲーション（ページHTML）: Network First → オフライン時はキャッシュ
//   （一度訪れたページはオフラインでも表示できる。認証状態込みのHTMLが
//    ユーザーごとに混ざらないよう、シングルユーザー用途として許容）
// - API GET: Network First → オフライン時はキャッシュ
// - API 非GET（PUT/POST/DELETE）: キャッシュせずそのまま通す
//   （オフライン時の書き込みはクライアント側のoffline-queue.tsがIndexedDBに
//    キューし、オンライン復帰後に再送する）

import { build, files, version } from '$service-worker';

// キャッシュ名とバージョンを定義
const CACHE_NAME = `sazanami-cache-${version}`;
const API_CACHE_NAME = `sazanami-api-cache-${version}`;

// キャッシュするアセットのリストを動的に生成
// build: SvelteKitが生成した全ファイル（JS, CSSなど）
// files: staticフォルダ内の全ファイル
const ASSETS_TO_CACHE = [...build, ...files];

declare let self: ServiceWorkerGlobalScope;

/**
 * Service Workerのインストールイベントハンドラ
 */
self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE_NAME)
			.then((cache) => cache.addAll(ASSETS_TO_CACHE))
			.catch((error) => {
				console.error('[Service Worker] Failed to cache static assets:', error);
			})
	);

	// 新しいService Workerを即座にアクティベートする
	self.skipWaiting();
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
					.filter((name) => name !== CACHE_NAME && name !== API_CACHE_NAME)
					.map((name) => caches.delete(name))
			);
		})
	);
	self.clients.claim();
});

/**
 * Service Workerのフェッチイベントハンドラ
 */
self.addEventListener('fetch', (event) => {
	const request = event.request;
	const requestUrl = new URL(request.url);

	// 同オリジンのみ処理（外部CDN等はそのまま通す）
	if (requestUrl.origin !== self.location.origin) return;

	// ナビゲーション（ページHTML）: Network First → キャッシュフォールバック
	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request)
				.then((response) => {
					if (response.status === 200) {
						const responseToCache = response.clone();
						caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
					}
					return response;
				})
				.catch(async () => {
					const cached = await caches.match(request);
					if (cached) return cached;
					// 未訪問ページはホーム（またはログイン）のキャッシュをフォールバック
					const fallback = (await caches.match('/home')) || (await caches.match('/login'));
					return (
						fallback ||
						new Response('Offline', {
							status: 503,
							statusText: 'Service Unavailable'
						})
					);
				})
		);
		return;
	}

	// APIリクエスト
	if (requestUrl.pathname.startsWith('/api/')) {
		// GETのみキャッシュ（Network First）
		if (request.method === 'GET') {
			event.respondWith(
				fetch(request)
					.then((response) => {
						if (response.status === 200) {
							const responseToCache = response.clone();
							caches.open(API_CACHE_NAME).then((cache) => {
								cache.put(request, responseToCache);
							});
						}
						return response;
					})
					.catch(async () => {
						const cached = await caches.match(request);
						if (cached) return cached;
						return new Response(
							JSON.stringify({ message: 'You are offline' }),
							{
								status: 503,
								statusText: 'Service Unavailable',
								headers: { 'Content-Type': 'application/json' }
							}
						);
					})
			);
			return;
		}
		// 非GET（PUT/POST/DELETE）: そのまま通す（キャッシュしない）
		// オフライン時はfetchが失敗し、クライアント側のoffline-queueが処理する
		return;
	}

	// その他の静的アセット（Cache First）
	event.respondWith(
		caches.match(request).then((cachedResponse) => {
			if (cachedResponse) {
				return cachedResponse;
			}

			return fetch(request).then((response) => {
				if (!response || response.status !== 200 || response.type !== 'basic') {
					return response;
				}

				const responseToCache = response.clone();
				caches.open(CACHE_NAME).then((cache) => {
					cache.put(request, responseToCache);
				});

				return response;
			});
		})
	);
});
