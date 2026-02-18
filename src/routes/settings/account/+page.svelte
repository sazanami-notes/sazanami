<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import type { Passkey } from 'better-auth/plugins/passkey';
	import { passkey, updateUser, linkSocial } from '$lib/auth-client';
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';

	let { data }: { data: PageData & { form?: ActionData } } = $props();

	let isRegisteringPasskey = $state(false);
	let passkeyError: string | null = $state(null);
	let passkeyMessage: string | null = $state(null);

	let passkeys: Passkey[] = $state([]);
	let isLoadingPasskeys = $state(false);
	let deletingPasskeys: string[] = $state([]);

	// User Name Update Logic
	let isEditingName = $state(false);
	let newName = $state(data.user.name);
	let isUpdatingName = $state(false);

	async function updateName() {
		if (!newName || newName === data.user.name) {
			isEditingName = false;
			return;
		}

		isUpdatingName = true;
		try {
			await updateUser({ name: newName });
			await invalidateAll(); // Refresh data to show new name
			isEditingName = false;
		} catch (e) {
			console.error('Failed to update name:', e);
			alert('名前の更新に失敗しました。');
		} finally {
			isUpdatingName = false;
		}
	}

	// Social Link Logic
	let isLinkingGoogle = $state(false);
	let googleLinked = $derived(data.accounts?.some((a) => a.providerId === 'google'));

	async function linkGoogle() {
		isLinkingGoogle = true;
		try {
			await linkSocial({ provider: 'google', callbackURL: '/settings/account' });
		} catch (e) {
			console.error('Failed to link Google:', e);
			alert('Google連携に失敗しました。');
			isLinkingGoogle = false;
		}
	}

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
			// call the client plugin which handles the WebAuthn flow (options+attestation)
			const result = await passkey.addPasskey();

			// result: Data<Passkey[]> | Error$1<{ code?: string; message?: string }>
			if (result && result.error) {
				passkeyError = result.error.message || 'パスキーの登録に失敗しました。';
			} else {
				passkeyMessage = 'パスキーの登録が完了しました。';
				// refresh list after successful registration
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
		// mark deleting
		deletingPasskeys = [...deletingPasskeys, id];
		passkeyError = null;
		try {
			let result = await passkey.deletePasskey({ id });

			if (result && result.error) {
				passkeyError = result.error.message || 'パスキーの削除に失敗しました。';
			} else {
				// success - refresh list
				await loadPasskeys();
			}
		} catch (e: unknown) {
			console.error('Error deleting passkey:', e);
			passkeyError = 'パスキーの削除中にエラーが発生しました。';
		} finally {
			// unmark deleting
			deletingPasskeys = deletingPasskeys.filter((x) => x !== id);
		}
	}

	onMount(() => {
		loadPasskeys();
	});
</script>

<h1 class="text-2xl font-bold">アカウント管理</h1>

<div class="mt-4">
	<h2 class="text-xl font-semibold">ユーザー情報</h2>
	<div class="mt-2 space-y-2">
		<p><strong>ユーザーID:</strong> {data.user.id}</p>

		<div class="flex items-center gap-2">
			<strong>ユーザー名:</strong>
			{#if isEditingName}
				<input
					type="text"
					bind:value={newName}
					class="input input-bordered input-sm"
					disabled={isUpdatingName}
				/>
				<button class="btn btn-sm btn-primary" onclick={updateName} disabled={isUpdatingName}>
					{isUpdatingName ? '保存中...' : '保存'}
				</button>
				<button
					class="btn btn-sm btn-ghost"
					onclick={() => {
						isEditingName = false;
						newName = data.user.name;
					}}
					disabled={isUpdatingName}
				>
					キャンセル
				</button>
			{:else}
				<span>{data.user.name}</span>
				<button
					class="btn btn-sm btn-ghost"
					onclick={() => {
						isEditingName = true;
						newName = data.user.name;
					}}
				>
					変更
				</button>
			{/if}
		</div>

		<p><strong>メールアドレス:</strong> {data.user.email}</p>
	</div>
</div>

<div class="mt-8">
	<h2 class="text-xl font-semibold">ソーシャル連携</h2>
	<div class="mt-4">
		<div class="flex items-center justify-between rounded-lg border p-4">
			<div class="flex items-center gap-3">
				<span class="font-medium">Google</span>
				{#if googleLinked}
					<span class="badge badge-success">連携済み</span>
				{:else}
					<span class="badge badge-ghost">未連携</span>
				{/if}
			</div>

			<div>
				{#if googleLinked}
					<form method="POST" action="?/unlinkAccount">
						<input type="hidden" name="providerId" value="google" />
						<button
							class="btn btn-sm btn-error btn-outline"
							onclick={(e) => {
								if (!confirm('Google連携を解除しますか？')) {
									e.preventDefault();
								}
							}}>解除</button
						>
					</form>
				{:else}
					<button class="btn btn-sm btn-primary" onclick={linkGoogle} disabled={isLinkingGoogle}>
						{isLinkingGoogle ? '連携中...' : '連携する'}
					</button>
				{/if}
			</div>
		</div>
	</div>
</div>

<div class="mt-8">
	<h2 class="text-xl font-semibold">パスキー（Passkey）</h2>
	<p class="mt-2">パスキーを登録すると、次回以降パスキーでログインできます。</p>

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
				{#each passkeys as pk}
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

<div class="mt-8">
	<h2 class="text-xl font-semibold">パスワード変更</h2>
	{#if data.form?.message}
		<div class="alert alert-info mt-4">
			<p>{data.form.message}</p>
		</div>
	{/if}
	<form method="POST" action="?/changePassword" class="mt-2 space-y-4">
		<div>
			<label for="currentPassword" class="block text-sm font-medium">現在のパスワード</label>
			<input
				type="password"
				id="currentPassword"
				name="currentPassword"
				class="input input-bordered mt-1 w-full"
				required
			/>
		</div>
		<div>
			<label for="newPassword" class="block text-sm font-medium">新しいパスワード</label>
			<input
				type="password"
				id="newPassword"
				name="newPassword"
				class="input input-bordered mt-1 w-full"
				required
			/>
		</div>
		<div>
			<label for="confirmPassword" class="block text-sm font-medium">新しいパスワード（確認）</label
			>
			<input
				type="password"
				id="confirmPassword"
				name="confirmPassword"
				class="input input-bordered mt-1 w-full"
				required
			/>
		</div>
		<button type="submit" class="btn btn-primary">パスワードを変更</button>
	</form>
</div>
