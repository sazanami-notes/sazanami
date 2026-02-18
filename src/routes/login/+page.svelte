<script lang="ts">
	import { signIn, signUp, authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	const queryParams = page.url.searchParams;

	let mode: 'login' | 'register' = 'login';
	let name = '';
	let email = '';
	let password = '';
	let error: string | null = null;
	let message: string | null = null;
	let isLoading = false;

	onMount(() => {
		if (queryParams.get('error') === 'invalid_token') {
			error = '無効なリンクです。';
		} else if (queryParams.get('error') === 'INVALID_TOKEN') {
			error = '無効なリンクです。';
		}
	});

	async function handleSubmit() {
		if (isLoading) return;
		isLoading = true;
		error = null;
		message = null;

		try {
			if (mode === 'login') {
				console.log('Attempting login with email:', email);
				const { data, error: apiError } = await signIn.email({
					email,
					password,
					callbackURL: '/home'
				});

				if (apiError) {
					console.error('Login error:', apiError);
					error = apiError.message || 'ログインに失敗しました。';
				} else if (data?.twoFactorRedirect) {
					console.log('2FA required, redirecting to two-factor page');
					await goto(
						'/login/two-factor' + (queryParams.toString() ? '?' + queryParams.toString() : '')
					);
				} else {
					console.log('Login successful:', data);
					// ユーザー名を取得してリダイレクト
					console.log('Redirecting to home page');
					// Invalidate all data to ensure fresh data is loaded
					await invalidateAll();
					// Redirect to home page
					await goto('/home');
				}
			} else {
				console.log('Attempting registration with email:', email);
				const { data: signUpdata, error: signUpError } = await signUp.email({
					name,
					email,
					password,
					callbackURL: '/home'
				});

				if (signUpError) {
					console.error('Registration error:', signUpError);
					error = signUpError.message || '登録に失敗しました。';
				} else {
					console.log('Registration successful:', signUpdata);
					message =
						'確認用メールを送信しました。メールのリンクをクリックし登録を完了してください。';
					mode = 'login';
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

	function changeMode(newMode: 'login' | 'register') {
		mode = newMode;
		error = null;
		message = null;
	}

	const signInWithMagicLink = async () => {
		if (isLoading) return;

		if (email === '') {
			error = 'メールアドレスを入力してください。';
			return;
		}

		if (mode === 'register' && name === '') {
			error = 'ユーザーネームを入力してください。';
			return;
		}

		isLoading = true;
		error = null;
		message = null;

		try {
			const { data, error: signInError } = await authClient.signIn.magicLink({
				email,
				name,
				callbackURL: '/home',
				errorCallbackURL: '/home'
			});

			if (signInError) {
				console.error('Signin error:', signInError);
				error = signInError.message || 'ログイン出来ませんでした。';
			} else {
				message = 'メールを送信しました。メールのリンクからログインしてください。';
			}
		} catch (e) {
			console.error('Signin error', e);
			error = '予期せぬエラーが発生しました。';
		} finally {
			isLoading = false;
		}
	};

	const signInWithGoogle = async () => {
		if (isLoading) return;
		isLoading = true;
		error = null;
		message = null;

		try {
			const { data, error: signInError } = await signIn.social({
				provider: 'google',
				callbackURL: '/home'
			});

			if (signInError) {
				console.error('Signin error:', signInError);
				error = signInError.message || 'ログイン出来ませんでした。';
			} else if (data?.twoFactorRedirect) {
				await goto(
					'/login/two-factor' + (queryParams.toString() ? '?' + queryParams.toString() : '')
				);
			}
		} catch (e) {
			console.error('Signin error', e);
			error = '予期せぬエラーが発生しました。';
		} finally {
			isLoading = false;
		}
	};

	const signInWithPasskey = async () => {
		if (isLoading) return;
		isLoading = true;
		error = null;
		message = null;

		try {
			const { data, error: signInError } = (await signIn.passkey()) as any;
			if (signInError) {
				error =
					typeof signInError === 'string'
						? signInError
						: signInError?.message || 'パスキーによるログインに失敗しました。';
			} else if (data?.twoFactorRedirect) {
				await goto(
					'/login/two-factor' + (queryParams.toString() ? '?' + queryParams.toString() : '')
				);
			} else {
				await invalidateAll();
				await goto('/home');
			}
		} catch (e: unknown) {
			console.error('Passkey login error:', e);
			error = '予期せぬエラーが発生しました。';
		} finally {
			isLoading = false;
		}
	};
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

	<div class="card bg-base-100 mt-4 shadow-xl">
		<div class="card-body">
			<form on:submit|preventDefault={handleSubmit}>
				<h2 class="card-title">
					{mode === 'login' ? 'ログイン' : '新規登録'}
				</h2>

				{#if error}
					<div role="alert" class="alert alert-error mt-4 mb-4">
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
					<div role="alert" class="alert alert-success mt-4 mb-4">
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
				<div class="card-actions mt-6">
					<button
						type="button"
						class="btn w-full"
						disabled={isLoading}
						on:click={signInWithMagicLink}
					>
						{mode === 'login' ? 'メールを受け取ってログイン' : 'メールを受け取って登録'}
					</button>
				</div>
				<div class="card-actions mt-6">
					<button type="button" class="btn w-full" disabled={isLoading} on:click={signInWithGoogle}>
						Continue with Google
					</button>
				</div>
				{#if mode === 'login'}
					<div class="card-actions mt-6">
						<button
							type="button"
							class="btn w-full"
							disabled={isLoading}
							on:click={signInWithPasskey}
						>
							パスキーでログイン
						</button>
					</div>
				{/if}
			</form>
		</div>
	</div>
</div>
