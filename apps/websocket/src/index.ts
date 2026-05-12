import { DurableObject } from 'cloudflare:workers';

/**
 * RealtimeRoom - Durable Object for Yjs collaborative editing sessions.
 * Each room instance handles WebSocket connections for one document.
 */
export class RealtimeRoom extends DurableObject {
	/**
	 * Handle incoming WebSocket connections
	 */
	async fetch(request: Request): Promise<Response> {
		// Upgrade to WebSocket
		const webSocketPair = new WebSocketPair();
		const [client, server] = Object.values(webSocketPair);

		// Accept the WebSocket connection
		this.ctx.acceptWebSocket(server);

		return new Response(null, {
			status: 101,
			webSocket: client,
		});
	}

	/**
	 * Handle WebSocket messages (Yjs sync protocol messages will flow here)
	 */
	async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
		// Forward messages to all connected clients (Yjs awareness/sync)
		const sessions = this.ctx.getWebSockets();
		for (const session of sessions) {
			if (session !== ws) {
				session.send(message);
			}
		}
	}

	/**
	 * Handle WebSocket close
	 */
	async webSocketClose(ws: WebSocket): Promise<void> {
		// Cleanup: remove from room state
	}

	/**
	 * Handle WebSocket errors
	 */
	async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
		console.error('WebSocket error:', error);
	}
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		// Route to the appropriate Durable Object
		const url = new URL(request.url);
		const roomId = url.searchParams.get('room') || 'default';
		const id = env.ROOM_SYNC.idFromName(roomId);
		const stub = env.ROOM_SYNC.get(id);
		return stub.fetch(request);
	},
};

interface Env {
	ROOM_SYNC: DurableObjectNamespace<RealtimeRoom>;
}
