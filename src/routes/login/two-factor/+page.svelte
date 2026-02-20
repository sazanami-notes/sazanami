<script lang="ts">
	import { twoFactor } from '$lib/auth-client';
	import { goto, invalidateAll } from '$app/navigation';

	import { page } from '$app/state';

	let mode = $state<'totp' | 'backup'>('totp');
	let code = $state('');
	let error = $state<string | null>(null);
	let isLoading = $state(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (isLoading) return;
		isLoading = true;
		error = null;

		try {
			let result;
			if (mode === 'totp') {
				result = await twoFactor.verifyTotp({
					code: code
				});
			} else {
				result = await twoFactor.verifyBackupCode({
					code: code
				});
			}

			if (result.error) {
				error = result.error.message || '認証に失敗しました。';
			} else {
				// 認証成功
				await invalidateAll();

				// リダイレクト先を決定
				const callbackURL = page.url.searchParams.get('callbackURL') || '/home';
				await goto(callbackURL);
			}
		} catch (e) {
			console.error('2FA verification error:', e);
			error = '予期せぬエラーが発生しました。';
		} finally {
			isLoading = false;
		}
	}

	function toggleMode() {
		mode = mode === 'totp' ? 'backup' : 'totp';
		code = '';
		error = null;
	}
</script>

<div class="container" style="max-width: 400px; margin: 4rem auto;">
	<div class="card bg-base-100 border-base-200 border shadow-xl">
		<div class="card-body">
			<h2 class="card-title mb-2 text-2xl font-bold">2要素認証</h2>

			{#if mode === 'totp'}
				<p class="mb-6 text-sm opacity-70">
					認証アプリ（Google Authenticator等）に表示されている6桁のコードを入力してください。
				</p>
			{:else}
				<p class="mb-6 text-sm opacity-70">保存しておいたバックアップコードを入力してください。</p>
			{/if}

			<form onsubmit={handleSubmit} class="space-y-4">
				{#if error}
					<div role="alert" class="alert alert-error">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-6 w-6 shrink-0 stroke-current"
							fill="none"
							viewBox="0 0 24 24"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M10 14l2-2m0 0l2-2m-2 2l-2 2m2-2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
							/></svg
						>
						<span>{error}</span>
					</div>
				{/if}

				<div class="form-control">
					<label class="label" for="code">
						<span class="label-text font-medium">
							{mode === 'totp' ? '認証コード' : 'バックアップコード'}
						</span>
					</label>
					<input
						id="code"
						name="code"
						type="text"
						inputmode={mode === 'totp' ? 'numeric' : 'text'}
						placeholder={mode === 'totp' ? '123456' : 'バックアップコードを入力'}
						class="input input-bordered h-16 text-center font-mono text-2xl"
						class:tracking-[0.5em]={mode === 'totp'}
						bind:value={code}
						required
						disabled={isLoading}
						maxlength={mode === 'totp' ? 6 : undefined}
						autofocus
						autocomplete="one-time-code"
					/>
				</div>

				<div class="card-actions mt-6">
					<button
						type="submit"
						class="btn btn-primary w-full"
						disabled={isLoading ||
							(mode === 'totp' && code.length !== 6) ||
							(mode === 'backup' && !code)}
					>
						{#if isLoading}
							<span class="loading loading-spinner"></span>
						{/if}
						認証してログイン
					</button>
				</div>
			</form>

			<div class="mt-4 text-center">
				<button type="button" class="btn btn-ghost btn-sm text-sm opacity-70" onclick={toggleMode}>
					{mode === 'totp' ? 'バックアップコードを使用する' : '認証アプリを使用する'}
				</button>
			</div>

			<div class="divider"></div>

			<div class="text-center">
				<a href="/login" class="link link-hover text-sm opacity-70">ログインに戻る</a>
			</div>
		</div>
	</div>
</div>
