<script lang="ts">
	import { twoFactor } from '$lib/auth-client';
	import QrCode from '$lib/components/QrCode.svelte';

	let {
		twoFactorEnabled,
		invalidateAll
	}: {
		twoFactorEnabled: boolean | undefined;
		invalidateAll: () => Promise<void>;
	} = $props();

	let isEnabling2FA = $state(false);
	let totpURI: string | null = $state(null);
	let verificationCode = $state('');
	let backupCodes: string[] = $state([]);
	let passwordFor2FA = $state('');
	let isVerifying2FA = $state(false);
	let twoFactorError: string | null = $state(null);
	let twoFactorMessage: string | null = $state(null);

	async function startEnable2FA() {
		isEnabling2FA = true;
		twoFactorError = null;
		totpURI = null;
		backupCodes = [];
		passwordFor2FA = '';
	}

	async function getTotpUri() {
		if (!passwordFor2FA) {
			twoFactorError = 'パスワードを入力してください。';
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
				twoFactorError = res.error.message ?? null;
			}
		} catch (e) {
			console.error('Failed to enable 2FA:', e);
			twoFactorError = '2要素認証の開始に失敗しました。';
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
				twoFactorMessage = '2要素認証が有効になりました！';
				isEnabling2FA = false;
				passwordFor2FA = '';
				verificationCode = '';
				totpURI = null;
				await invalidateAll();
			} else if (res.error) {
				twoFactorError = res.error.message || '認証コードが正しくありません。';
			}
		} catch (e) {
			console.error('Verification failed:', e);
			twoFactorError = '認証に失敗しました。';
		} finally {
			isVerifying2FA = false;
		}
	}

	async function disable2FA() {
		if (!confirm('2要素認証を無効にしますか？これによりセキュリティレベルが低下します。')) return;
		const password = prompt('2要素認証を無効にするにはパスワードを入力してください');
		if (!password) return;

		try {
			const res = await twoFactor.disable({ password });
			if (res.data) {
				twoFactorMessage = '2要素認証を無効にしました。';
				await invalidateAll();
			} else {
				twoFactorError = res.error?.message || '無効化に失敗しました。';
			}
		} catch (e) {
			console.error('Error disabling 2FA:', e);
			twoFactorError = 'エラーが発生しました。';
		}
	}
</script>

<div class="mt-8">
	<h2 class="text-xl font-semibold">2要素認証 (TOTP)</h2>
	<p class="mt-2 text-sm text-gray-600">
		Google Authenticatorなどのアプリを使用して、ログイン時にワンタイムパスワードを要求します。
	</p>

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
		{#if twoFactorEnabled}
			<div class="flex items-center gap-4">
				<span class="badge badge-success p-3">有効</span>
				<button class="btn btn-error btn-outline btn-sm" onclick={disable2FA}>無効にする</button>
			</div>
		{:else if !isEnabling2FA}
			<button class="btn btn-primary" onclick={startEnable2FA}>2要素認証を設定する</button>
		{:else}
			<div class="card bg-base-100 border p-4 shadow-sm">
				<h3 class="text-lg font-bold">2要素認証の設定</h3>

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
							<button class="btn btn-ghost" onclick={() => (isEnabling2FA = false)}
								>キャンセル</button
							>
						</div>
					</div>
				{:else}
					<div class="mt-4 space-y-4">
						<div class="flex flex-col items-center gap-4">
							<p>以下のQRコードを認証アプリでスキャンしてください。</p>
							<div class="rounded bg-white p-2">
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
							<div class="collapse-arrow border-base-300 bg-base-100 rounded-box collapse border">
								<input type="checkbox" />
								<div class="collapse-title text-sm font-medium">
									バックアップコードを表示 (必ず保存してください)
								</div>
								<div class="collapse-content">
									<pre class="bg-base-200 overflow-x-auto rounded p-2 text-xs">{backupCodes.join(
											'\n'
										)}</pre>
									<p class="text-error mt-2 text-xs">
										※このコードは一度しか表示されません。安全な場所に保管してください。
									</p>
								</div>
							</div>
						{/if}

						<div class="text-right">
							<button class="btn btn-sm btn-ghost" onclick={() => (isEnabling2FA = false)}
								>キャンセル</button
							>
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
