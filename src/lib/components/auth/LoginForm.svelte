<script lang="ts">
	import { signIn, signUp } from '$lib/auth-client';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';

	const queryParams = page.url.searchParams;

	let {
		mode = $bindable('login'),
		name = $bindable(''),
		email = $bindable(''),
		password = $bindable(''),
		error = $bindable(null),
		message = $bindable(null),
		isLoading = $bindable(false),
		showPasswordModal = false,
		onModeChange,
		onclose,
		onForgotPassword
	}: {
		mode?: 'login' | 'register';
		name?: string;
		email?: string;
		password?: string;
		error?: string | null;
		message?: string | null;
		isLoading?: boolean;
		showPasswordModal?: boolean;
		onModeChange?: (mode: 'login' | 'register') => void;
		onclose?: () => void;
		onForgotPassword?: () => void;
	} = $props();

	function getFormattedEmail(input: string) {
		const trimmed = input.trim();
		if (trimmed.includes('@')) {
			return trimmed;
		}
		// IDの場合はダミードメインを付与してメールアドレス化
		return `${trimmed.toLowerCase()}@sazanami.local`;
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();
		if (isLoading) return;
		isLoading = true;
		error = null;
		message = null;

		const targetEmail = getFormattedEmail(email);

		try {
			if (mode === 'login') {
				console.log('Attempting login with target email:', targetEmail);
				const { data, error: apiError } = await signIn.email({
					email: targetEmail,
					password,
					callbackURL: '/home'
				});

				if (apiError) {
					console.error('Login error:', apiError);
					error = apiError.message || 'ログインに失敗しました。';
				} else if ((data as { twoFactorRedirect?: boolean }).twoFactorRedirect) {
					console.log('2FA required, redirecting to two-factor page');
					await goto(
						'/login/two-factor' + (queryParams.toString() ? '?' + queryParams.toString() : '')
					);
				} else {
					console.log('Login successful:', data);
					console.log('Redirecting to home page');
					await invalidateAll();
					await goto('/home');
				}
			} else {
				console.log('Attempting registration with target email:', targetEmail);
				const { data: signUpdata, error: signUpError } = await signUp.email({
					name: name.trim() || email.trim(),
					email: targetEmail,
					password,
					callbackURL: '/home'
				});

				if (signUpError) {
					console.error('Registration error:', signUpError);
					error = signUpError.message || '登録に失敗しました。';
				} else {
					console.log('Registration successful:', signUpdata);
					// ダミードメインの場合はメールが届かないため、自動でログインを試みる
					if (targetEmail.endsWith('@sazanami.local')) {
						console.log('Virtual domain registration, attempting auto login...');
						const { error: signInError } = await signIn.email({
							email: targetEmail,
							password,
							callbackURL: '/home'
						});

						if (signInError) {
							console.error('Auto signin error:', signInError);
							// 自動ログインに失敗した場合はログイン画面に戻す
							message = '登録が完了しました。作成したIDとパスワードでログインしてください。';
							mode = 'login';
						} else {
							await invalidateAll();
							await goto('/home');
						}
					} else {
						message =
							'確認用メールを送信しました。メールのリンクをクリックし登録を完了してください。';
						mode = 'login';
					}
				}
			}
		} catch (e: unknown) {
			console.error('Unexpected error:', e);
			if (e instanceof Error) {
				error = e.message;
			} else {
				error = '予期せぬエラーが発生しました。';
			}
		} finally {
			isLoading = false;
		}
	}
</script>

<div role="tablist" class="tabs tabs-bordered">
	<button
		role="tab"
		class="tab"
		class:tab-active={mode === 'login'}
		onclick={() => onModeChange?.('login')}>ログイン</button
	>
	<button
		role="tab"
		class="tab"
		class:tab-active={mode === 'register'}
		onclick={() => onModeChange?.('register')}>新規登録</button
	>
</div>

{#if showPasswordModal}
	<dialog class="modal modal-open">
		<div class="modal-box">
			<form method="dialog">
				<button class="btn btn-sm btn-circle btn-ghost absolute top-2 right-2" onclick={onclose}
					>✕</button
				>
			</form>
			<h3 class="mb-4 text-lg font-bold">
				{mode === 'login' ? 'IDとパスワードでログイン' : 'IDとパスワードで登録'}
			</h3>
			{#if error}
				<div role="alert" class="alert alert-error mb-4">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-4 w-4 shrink-0 stroke-current"
						fill="none"
						viewBox="0 0 24 24"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 14l2-2m0 0l2-2m-2 2l-2 2m2-2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
						/></svg
					>
					<span class="text-sm">{error}</span>
				</div>
			{/if}
			{#if message}
				<div role="alert" class="alert alert-success mt-4 mb-4">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-4 w-4 shrink-0 stroke-current"
						fill="none"
						viewBox="0 0 24 24"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
						/></svg
					>
					<span class="text-sm">{message}</span>
				</div>
			{/if}
			<form onsubmit={handleSubmit}>
				{#if mode === 'register'}
					<div class="form-control mb-4">
						<label class="label" for="name"
							><span class="label-text">表示名（省略時はIDと同じ）</span></label
						>
						<input
							id="name"
							name="name"
							type="text"
							class="input input-bordered w-full"
							placeholder="例: たろう"
							bind:value={name}
							disabled={isLoading}
						/>
					</div>
				{/if}
				<div class="form-control mb-4">
					<label class="label" for="email"
						><span class="label-text">ユーザーID または メールアドレス</span></label
					>
					<input
						id="email"
						name="email"
						type="text"
						class="input input-bordered w-full"
						placeholder="ユーザーID または email@example.com"
						bind:value={email}
						required
						disabled={isLoading}
					/>
				</div>
				<div class="form-control mb-2">
					<label class="label" for="password"><span class="label-text">Password</span></label>
					<input
						id="password"
						name="password"
						type="password"
						class="input input-bordered w-full"
						bind:value={password}
						required
						disabled={isLoading}
					/>
				</div>
				{#if mode === 'login'}
					<div class="mb-6 flex justify-end">
						<button type="button" class="link link-primary text-xs" onclick={onForgotPassword}>
							パスワードを忘れた場合
						</button>
					</div>
				{:else}
					<div class="mb-6"></div>
				{/if}
				<div class="modal-action">
					<button type="submit" class="btn btn-primary w-full" disabled={isLoading}>
						{#if isLoading}<span class="loading loading-spinner"></span>{/if}
						{mode === 'login' ? 'ログイン' : '登録する'}
					</button>
				</div>
			</form>
		</div>
		<form method="dialog" class="modal-backdrop">
			<button onclick={onclose}>close</button>
		</form>
	</dialog>
{/if}
