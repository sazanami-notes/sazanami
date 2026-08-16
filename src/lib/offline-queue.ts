// src/lib/offline-queue.ts
// オフライン時の書き込み（PUT/POST）をIndexedDBにキューし、
// オンライン復帰後に自動再送する。
//
// 使い方:
//   const res = await offlineFetch(`/api/notes/${id}`, { method: 'PUT', ... });
//   if ('queued' in res) { /* オフライン保存された */ }
//
// オンライン復帰時は window の 'online' イベントで自動フラッシュされる。
// フラッシュ完了は CustomEvent('sazanami:sync-complete') で通知される。

const DB_NAME = 'sazanami-offline';
const DB_VERSION = 1;
const STORE_NAME = 'mutations';

export interface QueuedMutation {
	id: string;
	url: string;
	method: string;
	body?: string;
	queuedAt: number;
}

export interface SyncResult {
	synced: number;
	failed: number;
	offline: boolean;
}

function openDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME, { keyPath: 'id' });
			}
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

function withStore<T>(
	mode: IDBTransactionMode,
	fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
	return new Promise((resolve, reject) => {
		openDb().then(
			(db) => {
				const tx = db.transaction(STORE_NAME, mode);
				const request = fn(tx.objectStore(STORE_NAME));
				request.onsuccess = () => resolve(request.result);
				request.onerror = () => reject(request.error);
				tx.oncomplete = () => db.close();
			},
			(err) => reject(err)
		);
	});
}

function createId(): string {
	if (typeof crypto !== 'undefined' && crypto.randomUUID) {
		return crypto.randomUUID();
	}
	return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** ミューテーションをキューに追加 */
export async function queueMutation(
	url: string,
	method: string,
	body?: unknown
): Promise<QueuedMutation> {
	const mutation: QueuedMutation = {
		id: createId(),
		url,
		method: method.toUpperCase(),
		body: body !== undefined ? JSON.stringify(body) : undefined,
		queuedAt: Date.now()
	};
	await withStore('readwrite', (store) => store.add(mutation));
	return mutation;
}

/** キュー済みのミューテーション一覧（古い順） */
export async function getQueuedMutations(): Promise<QueuedMutation[]> {
	const all = await withStore('readonly', (store) => store.getAll());
	return all.sort((a, b) => a.queuedAt - b.queuedAt);
}

/** ミューテーションをキューから削除 */
export async function removeMutation(id: string): Promise<void> {
	await withStore('readwrite', (store) => store.delete(id));
}

/** キュー数を取得（UI表示用） */
export async function getQueuedCount(): Promise<number> {
	const all = await getQueuedMutations();
	return all.length;
}

/**
 * オフライン対応fetch。
 * - オンライン: 通常のfetchを実行し、Responseを返す
 * - オフライン（fetchがネットワークエラー）: キューに保存し、{ queued: true, id } を返す
 *
 * 注意: オフライン判定は「fetchがthrowしたか」で行う。
 * HTTPエラー（4xx/5xx）はオフラインではないので、そのままResponseを返す。
 */
export async function offlineFetch(
	url: string,
	options: RequestInit = {}
): Promise<Response | { queued: true; id: string }> {
	try {
		return await fetch(url, options);
	} catch {
		// ネットワークエラー（オフライン or サーバー到達不能）
		const body = options.body !== undefined && options.body !== null ? options.body : undefined;
		let parsedBody: unknown;
		if (typeof body === 'string') {
			try {
				parsedBody = JSON.parse(body);
			} catch {
				parsedBody = body;
			}
		} else {
			parsedBody = body;
		}
		const queued = await queueMutation(url, options.method || 'GET', parsedBody);
		return { queued: true, id: queued.id };
	}
}

/**
 * キューをフラッシュ（再送）する。
 * オンライン復帰時（window 'online' イベント）に自動呼び出しされる。
 */
export async function flushMutations(): Promise<SyncResult> {
	const mutations = await getQueuedMutations();
	if (mutations.length === 0) {
		return { synced: 0, failed: 0, offline: false };
	}

	let synced = 0;
	let failed = 0;

	for (const mutation of mutations) {
		try {
			const res = await fetch(mutation.url, {
				method: mutation.method,
				headers: { 'Content-Type': 'application/json' },
				body: mutation.body
			});
			if (res.ok) {
				await removeMutation(mutation.id);
				synced++;
			} else {
				// 409（タイトル重複）等、再送しても直らないものは諦めてキューから外す
				// （古い順に再送するため、後のミューテーションを止めない）
				if (res.status === 409 || res.status === 404) {
					await removeMutation(mutation.id);
				}
				failed++;
			}
		} catch {
			// まだオフライン → 残りの再送は止めて、次のonlineイベントに任せる
			return { synced, failed, offline: true };
		}
	}

	return { synced, failed, offline: false };
}

/** オンライン復帰時の自動フラッシュを設定（クライアントでのみ実行） */
export function setupOfflineSync(): void {
	if (typeof window === 'undefined') return;

	window.addEventListener('online', async () => {
		const result = await flushMutations();
		if (result.synced > 0 || result.failed > 0) {
			window.dispatchEvent(
				new CustomEvent<SyncResult>('sazanami:sync-complete', { detail: result })
			);
		}
	});

	// 初回ロード時にも残キューがあればフラッシュ（前回セッションの未送信分）
	if (navigator.onLine) {
		flushMutations().then((result) => {
			if (result.synced > 0 || result.failed > 0) {
				window.dispatchEvent(
					new CustomEvent<SyncResult>('sazanami:sync-complete', { detail: result })
				);
			}
		});
	}
}
