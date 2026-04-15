import { Hocuspocus } from '@hocuspocus/server';
import { applyUpdate, encodeStateAsUpdate } from 'yjs';

type Env = {
	ROOM_SYNC: DurableObjectNamespace;
};

function storageKey(documentName: string) {
	return `document:${documentName}`;
}

function toUint8Array(message: string | ArrayBuffer | ArrayBufferView) {
	if (typeof message === 'string') {
		return new TextEncoder().encode(message);
	}

	if (message instanceof ArrayBuffer) {
		return new Uint8Array(message);
	}

	return new Uint8Array(message.buffer, message.byteOffset, message.byteLength);
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const upgrade = request.headers.get('Upgrade')?.toLowerCase();

		if (upgrade !== 'websocket') {
			return new Response('WebSocket endpoint only', {
				status: 426
			});
		}

		const id = env.ROOM_SYNC.idFromName('global');
		return env.ROOM_SYNC.get(id).fetch(request);
	}
};

export class RealtimeRoom {
	private readonly hocuspocus: Hocuspocus;
	private readonly connections = new Map<WebSocket, ReturnType<Hocuspocus['handleConnection']>>();

	constructor(private readonly state: DurableObjectState) {
		this.hocuspocus = new Hocuspocus({
			name: 'sazanami-realtime',
			quiet: true,
			async onLoadDocument({ document, documentName }) {
				const storedDocument = await state.storage.get<ArrayBuffer>(storageKey(documentName));
				if (storedDocument) {
					applyUpdate(document, new Uint8Array(storedDocument));
				}
			},
			async onStoreDocument({ document, documentName }) {
				const update = encodeStateAsUpdate(document);
				await state.storage.put(storageKey(documentName), update.slice().buffer);
			}
		});
	}

	async fetch(request: Request): Promise<Response> {
		const pair = new WebSocketPair();
		const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
		this.state.acceptWebSocket(server);

		const connection = this.hocuspocus.handleConnection(server, request);
		this.connections.set(server, connection);

		return new Response(null, {
			status: 101,
			webSocket: client
		});
	}

	webSocketMessage(webSocket: WebSocket, message: string | ArrayBuffer | ArrayBufferView) {
		const connection = this.connections.get(webSocket);
		if (!connection) {
			return;
		}

		connection.handleMessage(toUint8Array(message));
	}

	webSocketClose(webSocket: WebSocket, code: number, reason: string, wasClean: boolean) {
		const connection = this.connections.get(webSocket);
		connection?.handleClose({ code, reason, wasClean } as never);
		this.connections.delete(webSocket);
	}

	webSocketError(webSocket: WebSocket) {
		const connection = this.connections.get(webSocket);
		connection?.handleClose();
		this.connections.delete(webSocket);
	}
}