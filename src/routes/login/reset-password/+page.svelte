<script lang="ts">
	import { resetPassword } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	let newPassword = $state('');
	let confirmPassword = $state('');
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let message = $state<string | null>(null);
	let token = $state<string | null>(null);

	onMount(() => {
		token = $page.url.searchParams.get('token');
		if (!token) {
			error = '無効なリセットリンクです。';
		}
	});

	async function handleSubmit(event: Event) {
		event.preventDefault();
		if (isLoading) return;
		if (newPassword !== confirmPassword) {
			error = 'パスワードが一致しません。';
			return;
		}
		if (!token) {
			error = 'トークンが見つかりません。もう一度メールのリンクをクリックしてください。';
			return;
		}

		isLoading = true;
		error = null;
		message = null;

		try {
			const { data, error: apiError } = await resetPassword({
				newPassword,
				token
			});

			if (apiError) {
				error = apiError.message || 'パスワードのリセットに失敗しました。';
			} else {
				message = 'パスワードをリセットしました。ログインページへ移動します...';
				setTimeout(() => {
					goto('/login');
				}, 2000);
			}
		} catch (e: unknown) {
			console.error('Unexpected error:', e);
			error = '予期せぬエラーが発生しました。';
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="container" style="max-width: 400px; margin: 2rem auto;">
	<div class="card bg-base-100 mt-4 shadow-xl">
		<div class="card-body">
			<h2 class="card-title">新しいパスワードの設定</h2>

			<form onsubmit={handleSubmit}>
				{#if error}
					<div role="alert" class="alert alert-error mb-4">
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

				{#if message}
					<div role="alert" class="alert alert-success mb-4">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-6 w-6 shrink-0 stroke-current"
							fill="none"
							viewBox="0 0 24 24"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
							/></svg
						>
						<span>{message}</span>
					</div>
				{/if}

				<div class="form-control">
					<label class="label" for="newPassword">
						<span class="label-text">新しいパスワード</span>
					</label>
					<input
						id="newPassword"
						name="newPassword"
						type="password"
						class="input input-bordered"
						bind:value={newPassword}
						required
						disabled={isLoading || !token}
					/>
				</div>

				<div class="form-control">
					<label class="label" for="confirmPassword">
						<span class="label-text">新しいパスワード（確認）</span>
					</label>
					<input
						id="confirmPassword"
						name="confirmPassword"
						type="password"
						class="input input-bordered"
						bind:value={confirmPassword}
						required
						disabled={isLoading || !token}
					/>
				</div>

				<div class="card-actions mt-6">
					<button type="submit" class="btn btn-primary w-full" disabled={isLoading || !token}>
						{#if isLoading}
							<span class="loading loading-spinner"></span>
						{/if}
						パスワードを変更
					</button>
				</div>
			</form>
		</div>
	</div>
</div>
