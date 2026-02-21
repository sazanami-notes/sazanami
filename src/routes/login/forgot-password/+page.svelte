<script lang="ts">
	import { forgetPassword } from '$lib/auth-client';
	import { goto } from '$app/navigation';

	let email = $state('');
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let message = $state<string | null>(null);

	async function handleSubmit(event: Event) {
		event.preventDefault();
		if (isLoading) return;
		isLoading = true;
		error = null;
		message = null;

		try {
			const { data, error: apiError } = await forgetPassword({
				email,
				redirectTo: '/login/reset-password'
			});

			if (apiError) {
				error = apiError.message || 'リセットメールの送信に失敗しました。';
			} else {
				message = 'パスワードリセット用のメールを送信しました。メールをご確認ください。';
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
			<h2 class="card-title">パスワードをお忘れですか？</h2>
			<p class="mb-4 text-sm text-gray-500">
				登録済みのメールアドレスを入力してください。パスワードリセット用のリンクをお送りします。
			</p>

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
					<label class="label" for="email">
						<span class="label-text">Email</span>
					</label>
					<input
						id="email"
						name="email"
						type="email"
						class="input input-bordered"
						bind:value={email}
						required
						disabled={isLoading}
					/>
				</div>

				<div class="card-actions mt-6">
					<button type="submit" class="btn btn-primary w-full" disabled={isLoading}>
						{#if isLoading}
							<span class="loading loading-spinner"></span>
						{/if}
						メールを送信
					</button>
				</div>

				<div class="mt-4 text-center">
					<a href="/login" class="link link-primary text-sm">ログイン画面に戻る</a>
				</div>
			</form>
		</div>
	</div>
</div>
