<script lang="ts">
	import type { Passkey } from '@better-auth/passkey';
	import { passkey } from '$lib/auth-client';
	import { onMount } from 'svelte';

	let isRegisteringPasskey = $state(false);
	let passkeyError: string | null = $state(null);
	let passkeyMessage: string | null = $state(null);
	let passkeys: Passkey[] = $state([]);
	let isLoadingPasskeys = $state(false);
	let deletingPasskeys: string[] = $state([]);

	async function loadPasskeys() {
		isLoadingPasskeys = true;
		passkeyError = null;
		try {
			const result = await passkey.listUserPasskeys();

			if (result && result.error) {
				passkeyError = result.error.message || 'パスキーの読み込みに失敗しました。';
				passkeys = [];
			} else if (result && result.data) {
				passkeys = result.data as Passkey[];
			}
		} catch (e: unknown) {
			console.error('Error loading passkeys:', e);
			passkeyError = 'パスキーの読み込みに失敗しました。';
		} finally {
			isLoadingPasskeys = false;
		}
	}

	async function registerPasskey() {
		if (isRegisteringPasskey) return;
		isRegisteringPasskey = true;
		passkeyError = null;
		passkeyMessage = null;

		try {
			const result = await passkey.addPasskey();

			if (result && result.error) {
				passkeyError = result.error.message || 'パスキーの登録に失敗しました。';
			} else {
				passkeyMessage = 'パスキーの登録が完了しました。';
				await loadPasskeys();
			}
		} catch (e: unknown) {
			console.error('Passkey registration error:', e);
			passkeyError = 'パスキーの登録中にエラーが発生しました。';
		} finally {
			isRegisteringPasskey = false;
		}
	}

	async function deletePasskey(id: string) {
		if (!confirm('このパスキーを削除してよろしいですか？')) return;
		deletingPasskeys = [...deletingPasskeys, id];
		passkeyError = null;
		try {
			let result = await passkey.deletePasskey({ id });

			if (result && result.error) {
				passkeyError = result.error.message || 'パスキーの削除に失敗しました。';
			} else {
				await loadPasskeys();
			}
		} catch (e: unknown) {
			console.error('Error deleting passkey:', e);
			passkeyError = 'パスキーの削除中にエラーが発生しました。';
		} finally {
			deletingPasskeys = deletingPasskeys.filter((x) => x !== id);
		}
	}

	onMount(() => {
		loadPasskeys();
	});
</script>

<div class="mt-8">
	<h2 class="text-xl font-semibold">パスキー（Passkey）</h2>
	<p class="mt-2 text-sm text-gray-600">
		パスキーを登録すると、次回以降パスキーでログインできます。
	</p>

	{#if passkeyError}
		<div class="alert alert-error mt-4">
			<p>{passkeyError}</p>
		</div>
	{/if}

	{#if passkeyMessage}
		<div class="alert alert-success mt-4">
			<p>{passkeyMessage}</p>
		</div>
	{/if}

	<div class="mt-4">
		<button class="btn btn-primary" onclick={registerPasskey} disabled={isRegisteringPasskey}>
			{#if isRegisteringPasskey}
				登録中...
			{:else}
				パスキーを登録する
			{/if}
		</button>
	</div>

	<div class="mt-4">
		{#if isLoadingPasskeys}
			<p class="text-muted text-sm">パスキーを読み込んでいます…</p>
		{:else if passkeys.length === 0}
			<p class="text-muted text-sm">登録済みのパスキーはありません。</p>
		{:else}
			<ul class="mt-2 space-y-2">
				{#each passkeys as pk (pk.id)}
					<li class="rounded border p-3">
						<div class="flex items-start justify-between">
							<div>
								<div><strong>{pk.name || pk.id}</strong></div>
								<div class="text-muted text-sm">{pk.deviceType}</div>
								<div class="text-muted text-sm">
									作成: {pk.createdAt ? new Date(Number(pk.createdAt)).toLocaleString() : '—'}
								</div>
							</div>
							<div class="ml-4 flex items-center gap-2">
								<button
									class="btn btn-sm btn-ghost text-red-600"
									onclick={() => deletePasskey(pk.id)}
									disabled={deletingPasskeys.includes(pk.id)}
								>
									{#if deletingPasskeys.includes(pk.id)}削除中...{:else}削除{/if}
								</button>
							</div>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
