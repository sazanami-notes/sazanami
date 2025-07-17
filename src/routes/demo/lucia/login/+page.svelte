<script lang="ts">
	import { signIn, signUp } from '$lib/auth-client';
	import { goto } from '$app/navigation';

	let mode: 'login' | 'register' = 'login';
	let name = '';
	let email = '';
	let password = '';
	let error: string | null = null;
	let message: string | null = null;
	let isLoading = false;

	async function handleSubmit() {
		if (isLoading) return;
		isLoading = true;
		error = null;
		message = null;

		try {
			if (mode === 'login') {
				// ドキュメント[cite: 9]に沿ったログイン処理
				const { data, error: apiError } = await signIn.email({
					email,
					password
				});

				if (apiError) {
					error = apiError.message || 'ログインに失敗しました。';
				} else {
					// ログイン成功後、リダイレクト
					await goto('/demo/lucia');
				}
			} else {
				// ドキュメント[cite: 3]に沿った登録処理
				const { data, error: apiError } = await signUp.email({
					name,
					email,
					password
				});

				if (apiError) {
					error = apiError.message || '登録に失敗しました。';
				} else {
					message = '確認メールを送信しました。メール内のリンクをクリックして登録を完了してください。';
					// 必要であればログインページに留まるか、特定のページに遷移
					// await goto('/some-page');
				}
			}
		} catch (e: any) {
			error = '予期せぬエラーが発生しました。';
			console.error(e);
		} finally {
			isLoading = false;
		}
	}

	function changeMode(newMode: 'login' | 'register') {
		mode = newMode;
		error = null;
		message = null;
	}
</script>

<div class="container" style="max-width: 400px; margin: 2rem auto;">
	<div role="tablist" class="tabs tabs-bordered">
		<button
			role="tab"
			class="tab"
			class:tab-active={mode === 'login'}
			on:click={() => changeMode('login')}>ログイン</button
		>
		<button
			role="tab"
			class="tab"
			class:tab-active={mode === 'register'}
			on:click={() => changeMode('register')}>新規登録</button
		>
	</div>

	<div class="card bg-base-100 shadow-xl mt-4">
		<div class="card-body">
			<form on:submit|preventDefault={handleSubmit}>
				<h2 class="card-title">
					{mode === 'login' ? 'ログイン' : '新規登録'}
				</h2>

				{#if mode === 'register'}
					<div class="form-control">
						<label class="label" for="name">
							<span class="label-text">Name</span>
						</label>
						<input
							id="name"
							name="name"
							type="text"
							class="input input-bordered"
							bind:value={name}
							required
							disabled={isLoading}
						/>
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

				<div class="form-control">
					<label class="label" for="password">
						<span class="label-text">Password</span>
					</label>
					<input
						id="password"
						name="password"
						type="password"
						class="input input-bordered"
						bind:value={password}
						required
						disabled={isLoading}
					/>
				</div>

				<div class="card-actions mt-6">
					<button type="submit" class="btn btn-primary w-full" disabled={isLoading}>
						{#if isLoading}
							<span class="loading loading-spinner"></span>
						{/if}
						{mode === 'login' ? 'ログイン' : '登録する'}
					</button>
				</div>
			</form>

			{#if error}
				<div role="alert" class="alert alert-error mt-4">
					<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2 2m2-2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
					<span>{error}</span>
				</div>
			{/if}

			{#if message}
				<div role="alert" class="alert alert-success mt-4">
					<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
					<span>{message}</span>
				</div>
			{/if}
		</div>
	</div>
</div>
