<script lang="ts">
	import '../app.css';
	import { authClient } from '$lib/auth-client';
	import LoginPage from './login/+page.svelte';

	let { children, data } = $props();

	// サーバーから渡された初回セッション情報と、
	// クライアントでリアクティブに更新されるセッション情報を統合
	const session = authClient.useSession({
		initialStore: {
			// `data`は load 関数から渡される
			data: data.session,
			isPending: false,
			error: null
		}
	});
</script>

<div class="bg-base-300 rounded-box mx-auto my-10 h-[80vh] w-2/3 shadow-xl">
	{#if $session.isPending}
		<div class="flex h-full items-center justify-center">
			<span class="loading loading-lg"></span>
		</div>
	{:else if $session.data}
		{@render children()}
	{:else}
		<LoginPage />
	{/if}
</div>