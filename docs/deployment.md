# Deployment

This repository is organized as a monorepo with two deployable apps:

- `apps/web`: SvelteKit application deployed to Cloudflare Workers
- `apps/websocket`: Hocuspocus-compatible realtime server deployed to Cloudflare Workers with Durable Objects

## Environment variables

### Web app

- `PUBLIC_WEBSOCKET_URL`: public WebSocket endpoint used by the editor
- `BETTER_AUTH_URL`: canonical application URL
- `BETTER_AUTH_SECRET`: Better Auth secret
- `TURSO_DATABASE_URL`: Turso database URL
- `TURSO_AUTH_TOKEN`: Turso auth token

### WebSocket app

- Cloudflare bindings are configured in `apps/websocket/wrangler.toml`

## Local development

1. Install dependencies.
2. Start both apps from the repository root.

```bash
npm run dev
```

That runs the SvelteKit app and the websocket server side by side.

If you want to test the Cloudflare build locally for the web app, run:

```bash
npm run dev:web:cloudflare
```

## Deploy the web app

1. Build the Cloudflare worker output.
2. Deploy the generated worker with Wrangler.

```bash
npm run deploy:web
```

The deployment uses `apps/web/wrangler.toml` and expects Cloudflare environment variables to be configured in the target environment.

## Deploy the websocket server

1. Deploy the Worker / Durable Object bundle with Wrangler.

```bash
npm run deploy:ws
```

The websocket server stores Yjs document state in Durable Object storage.

## WebSocket URL

Set `PUBLIC_WEBSOCKET_URL` in the web app to the public websocket endpoint, for example:

```bash
PUBLIC_WEBSOCKET_URL=wss://realtime.example.com
```

For local development, use:

```bash
PUBLIC_WEBSOCKET_URL=ws://127.0.0.1:8788
```