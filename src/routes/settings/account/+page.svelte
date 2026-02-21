<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import type { Passkey } from '@better-auth/passkey';
	import { passkey, twoFactor, updateUser, linkSocial } from '$lib/auth-client';
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import QrCode from '$lib/components/QrCode.svelte';

	let { data }: { data: PageData & { form?: ActionData } } = $props();

	// Passkey Logic
	let isRegisteringPasskey = $state(false);
	let passkeyError: string | null = $state(null);
	let passkeyMessage: string | null = $state(null);
	let passkeys: Passkey[] = $state([]);
	let isLoadingPasskeys = $state(false);
	let deletingPasskeys: string[] = $state([]);

	// TOTP Logic
	let isEnabling2FA = $state(false);
	let totpURI: string | null = $state(null);
	let verificationCode = $state('');
	let backupCodes: string[] = $state([]);
	let passwordFor2FA = $state('');
	let isVerifying2FA = $state(false);
	let twoFactorError: string | null = $state(null);
	let twoFactorMessage: string | null = $state(null);

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

	// TOTP Functions
	async function startEnable2FA() {
		isEnabling2FA = true;
		twoFactorError = null;
		totpURI = null;
		backupCodes = [];
		passwordFor2FA = '';
	}

	async function getTotpUri() {
		if (!passwordFor2FA) {
			twoFactorError = "パスワードを入力してください。";
			return;
		}
		twoFactorError = null;
		try {
			const res = await twoFactor.enable({
				password: passwordFor2FA
			});
			if (res.data) {
				totpURI = res.data.totpURI;
				backupCodes = res.data.backupCodes || [];
			} else if (res.error) {
				twoFactorError = res.error.message;
			}
		} catch (e) {
			console.error("Failed to enable 2FA:", e);
			twoFactorError = "2要素認証の開始に失敗しました。";
		}
	}

	async function verifyAndEnable() {
		if (!verificationCode) return;
		isVerifying2FA = true;
		twoFactorError = null;
		try {
			const res = await twoFactor.verifyTotp({
				code: verificationCode
			});
			if (res.data) {
				twoFactorMessage = "2要素認証が有効になりました！";
				isEnabling2FA = false;
				passwordFor2FA = '';
				verificationCode = '';
				totpURI = null;
				await invalidateAll();
			} else if (res.error) {
				twoFactorError = res.error.message || "認証コードが正しくありません。";
			}
		} catch(e) {
			console.error("Verification failed:", e);
			twoFactorError = "認証に失敗しました。";
		} finally {
			isVerifying2FA = false;
		}
	}

	async function disable2FA() {
		if (!confirm("2要素認証を無効にしますか？これによりセキュリティレベルが低下します。")) return;
		const password = prompt("2要素認証を無効にするにはパスワードを入力してください");
		if (!password) return;

		try {
			const res = await twoFactor.disable({ password });
			if (res.data) {
				twoFactorMessage = "2要素認証を無効にしました。";
				await invalidateAll();
			} else {
				twoFactorError = res.error?.message || "無効化に失敗しました。";
			}
		} catch (e) {
			console.error("Error disabling 2FA:", e);
			twoFactorError = "エラーが発生しました。";
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
						<button class="btn btn-sm btn-error btn-outline" onclick={(e) => {
                            if (!confirm('Google連携を解除しますか？')) {
                                e.preventDefault();
                            }
                        }}>解除</button>
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
	<h2 class="text-xl font-semibold">2要素認証 (TOTP)</h2>
	<p class="mt-2 text-sm text-gray-600">Google Authenticatorなどのアプリを使用して、ログイン時にワンタイムパスワードを要求します。</p>

	{#if twoFactorMessage}
		<div class="alert alert-success mt-4">
			<p>{twoFactorMessage}</p>
		</div>
	{/if}

	{#if twoFactorError}
		<div class="alert alert-error mt-4">
			<p>{twoFactorError}</p>
		</div>
	{/if}

	<div class="mt-4">
		{#if data.user.twoFactorEnabled}
			<div class="flex items-center gap-4">
				<span class="badge badge-success p-3">有効</span>
				<button class="btn btn-error btn-outline btn-sm" onclick={disable2FA}>無効にする</button>
			</div>
		{:else}
			{#if !isEnabling2FA}
				<button class="btn btn-primary" onclick={startEnable2FA}>2要素認証を設定する</button>
			{:else}
				<div class="card bg-base-100 border p-4 shadow-sm">
					<h3 class="font-bold text-lg">2要素認証の設定</h3>

					{#if !totpURI}
						<div class="mt-4">
							<p class="mb-2">設定を開始するには現在のパスワードを入力してください。</p>
							<div class="flex gap-2">
								<input
									type="password"
									placeholder="パスワード"
									class="input input-bordered w-full max-w-xs"
									bind:value={passwordFor2FA}
								/>
								<button class="btn btn-primary" onclick={getTotpUri}>次へ</button>
								<button class="btn btn-ghost" onclick={() => isEnabling2FA = false}>キャンセル</button>
							</div>
						</div>
					{:else}
						<div class="mt-4 space-y-4">
							<div class="flex flex-col items-center gap-4">
								<p>以下のQRコードを認証アプリでスキャンしてください。</p>
								<div class="bg-white p-2 rounded">
									<QrCode value={totpURI} />
								</div>
							</div>

							<div class="divider"></div>

							<div>
								<p class="mb-2 font-bold">認証コードの確認</p>
								<p class="mb-2 text-sm">アプリに表示された6桁のコードを入力してください。</p>
								<div class="flex gap-2">
									<input
										type="text"
										placeholder="123456"
										class="input input-bordered w-32"
										bind:value={verificationCode}
									/>
									<button class="btn btn-success" onclick={verifyAndEnable} disabled={isVerifying2FA}>
										{isVerifying2FA ? '確認中...' : '有効にする'}
									</button>
								</div>
							</div>

							{#if backupCodes.length > 0}
								<div class="collapse collapse-arrow border border-base-300 bg-base-100 rounded-box">
									<input type="checkbox" />
									<div class="collapse-title text-sm font-medium">
										バックアップコードを表示 (必ず保存してください)
									</div>
									<div class="collapse-content">
										<pre class="bg-base-200 p-2 rounded text-xs overflow-x-auto">{backupCodes.join('\n')}</pre>
										<p class="text-xs mt-2 text-error">※このコードは一度しか表示されません。安全な場所に保管してください。</p>
									</div>
								</div>
							{/if}

							<div class="text-right">
								<button class="btn btn-sm btn-ghost" onclick={() => isEnabling2FA = false}>キャンセル</button>
							</div>
						</div>
					{/if}
				</div>
			{/if}
		{/if}
	</div>
</div>

<div class="mt-8">
	<h2 class="text-xl font-semibold">パスキー（Passkey）</h2>
	<p class="mt-2 text-sm text-gray-600">パスキーを登録すると、次回以降パスキーでログインできます。</p>

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
