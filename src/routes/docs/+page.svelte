<!-- src/routes/docs/+page.svelte -->
<!-- Sazanami API v1 のリファレンス。Scalar（CDN）で /api/v1/openapi.json を表示する。 -->
<script lang="ts">
	import { onMount } from 'svelte';

	type ScalarApiReference = {
		createApiReference: (element: string | HTMLElement, options: { url: string }) => unknown;
	};

	const SPEC_URL = '/api/v1/openapi.json';
	const CDN_URL = 'https://cdn.jsdelivr.net/npm/@scalar/api-reference';

	// CDNの読み込みが終わって window.Scalar が生えたら初期化する
	let loaded = $state(false);
	let failed = $state(false);

	function getScalar(): ScalarApiReference | undefined {
		if (typeof window === 'undefined') return undefined;
		return (window as unknown as { Scalar?: ScalarApiReference }).Scalar;
	}

	onMount(() => {
		let timer: ReturnType<typeof setTimeout> | undefined;
		let attempts = 0;
		let disposed = false;

		const tryMount = (): boolean => {
			const scalar = getScalar();
			const target = document.getElementById('app');
			if (!scalar || !target) return false;
			scalar.createApiReference(target, { url: SPEC_URL });
			loaded = true;
			return true;
		};

		if (tryMount()) return;

		const poll = () => {
			if (disposed) return;
			if (tryMount()) return;
			attempts += 1;

			// svelte:head のスクリプトが挿入されていない場合の保険（二重挿入は避ける）
			if (attempts === 5 && !document.querySelector(`script[src="${CDN_URL}"]`)) {
				const script = document.createElement('script');
				script.src = CDN_URL;
				script.async = true;
				document.head.appendChild(script);
			}

			// 約10秒待っても初期化できなければフォールバックを出す
			if (attempts >= 50) {
				failed = true;
				return;
			}
			timer = setTimeout(poll, 200);
		};

		timer = setTimeout(poll, 200);

		return () => {
			disposed = true;
			if (timer) clearTimeout(timer);
		};
	});
</script>

<svelte:head>
	<title>Sazanami API v1 ドキュメント</title>
	<meta name="description" content="Sazanami API v1（外部クライアント向け公開API）のリファレンス" />
	<script src={CDN_URL} async></script>
</svelte:head>

<div class="bg-base-100 min-h-full">
	<div class="border-base-300 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4">
		<div>
			<h1 class="text-xl font-bold">Sazanami API v1</h1>
			<p class="text-base-content/60 text-sm">
				外部クライアント（MCP・スクリプト・モバイルアプリ）向け公開APIのリファレンス
			</p>
		</div>
		<a class="btn btn-outline btn-sm" href={SPEC_URL} target="_blank" rel="noopener noreferrer">
			openapi.json
		</a>
	</div>

	{#if failed}
		<div class="alert alert-warning m-4" role="alert">
			<div>
				<p class="font-semibold">APIドキュメントを読み込めませんでした</p>
				<p class="text-sm">
					CDN（jsDelivr）に接続できない可能性があります。仕様JSONは
					<a class="link" href={SPEC_URL}>openapi.json</a>
					から直接取得できます。
				</p>
			</div>
		</div>
	{/if}

	{#if !loaded && !failed}
		<p class="text-base-content/60 p-6 text-center text-sm" role="status">
			APIドキュメントを読み込み中…
		</p>
	{/if}

	<noscript>
		<div class="alert alert-info m-4">
			<span>
				APIドキュメントの表示にはJavaScriptが必要です。仕様JSONは
				<a class="link" href={SPEC_URL}>openapi.json</a>
				から取得できます。
			</span>
		</div>
	</noscript>

	<div id="app"></div>
</div>
