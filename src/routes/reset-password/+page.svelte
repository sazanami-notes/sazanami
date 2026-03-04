<script lang="ts">
	import { emailPassword } from '$lib/auth-client';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	let password = $state('');
	let confirmPassword = $state('');
	let error: string | null = $state(null);
	let message: string | null = $state(null);
	let isLoading = $state(false);

	const token = page.url.searchParams.get('token');

	async function handleSubmit(event: Event) {
		event.preventDefault();
		if (isLoading) return;

		if (password !== confirmPassword) {
			error = 'パスワードが一致しません。';
			return;
		}

		if (!token) {
			error = '無効なトークンです。';
			return;
		}

		isLoading = true;
		error = null;
		message = null;

		try {
			const { error: resetError } = await emailPassword.resetPassword({
				newPassword: password,
				token
			});

			if (resetError) {
				error = resetError.message || 'パスワードのリセットに失敗しました。';
			} else {
				message = 'パスワードが正常にリセットされました。5秒後にログインページに移動します。';
				setTimeout(() => {
					goto('/login');
				}, 5000);
			}
		} catch (e) {
			console.error('Reset password error:', e);
			error = '予期せぬエラーが発生しました。';
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="container" style="max-width: 400px; margin: 2rem auto;">
	<div class="card bg-base-100 shadow-xl">
		<div class="card-body">
			<h2 class="card-title">パスワードの再設定</h2>

			{#if error}
				<div role="alert" class="alert alert-error mt-4 mb-4">
					<span>{error}</span>
				</div>
			{/if}

			{#if message}
				<div role="alert" class="alert alert-success mt-4 mb-4">
					<span>{message}</span>
				</div>
			{:else if !token}
				<div role="alert" class="alert alert-error mt-4 mb-4">
					<span>無効なアクセスです。トークンが見つかりません。</span>
				</div>
			{:else}
				<form onsubmit={handleSubmit} class="mt-4 space-y-4">
					<div class="form-control">
						<label class="label" for="password">
							<span class="label-text">新しいパスワード</span>
						</label>
						<input
							id="password"
							type="password"
							class="input input-bordered"
							bind:value={password}
							required
							disabled={isLoading}
						/>
					</div>

					<div class="form-control">
						<label class="label" for="confirmPassword">
							<span class="label-text">新しいパスワード（確認）</span>
						</label>
						<input
							id="confirmPassword"
							type="password"
							class="input input-bordered"
							bind:value={confirmPassword}
							required
							disabled={isLoading}
						/>
					</div>

					<div class="card-actions mt-6">
						<button type="submit" class="btn btn-primary w-full" disabled={isLoading}>
							{#if isLoading}<span class="loading loading-spinner"></span>{/if}
							パスワードを更新する
						</button>
					</div>
				</form>
			{/if}
		</div>
	</div>
</div>
