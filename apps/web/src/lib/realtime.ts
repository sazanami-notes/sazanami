import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';

const LOCAL_WEBSOCKET_URL = 'ws://127.0.0.1:8788';

export function getWebsocketUrl() {
	const configuredUrl = env.PUBLIC_WEBSOCKET_URL?.trim();

	if (configuredUrl) {
		return configuredUrl.replace(/\/$/, '');
	}

	if (!browser) {
		return LOCAL_WEBSOCKET_URL;
	}

	const origin = new URL(window.location.origin);
	origin.protocol = origin.protocol === 'https:' ? 'wss:' : 'ws:';
	return origin.toString().replace(/\/$/, '');
}