<script lang="ts">
	import { signIn, signUp } from '$lib/auth-client';
	import { goto, invalidateAll } from '$app/navigation';

	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { ulid } from 'ulid';

	import LoginForm from '$lib/components/auth/LoginForm.svelte';
	import MagicLinkModal from '$lib/components/auth/MagicLinkModal.svelte';
	import ForgotPasswordModal from '$lib/components/auth/ForgotPasswordModal.svelte';

	const queryParams = page.url.searchParams;

	let mode: 'login' | 'register' = $state(
		queryParams.get('mode') === 'register' ? 'register' : 'login'
	);
	let name = $state('');
	let email = $state('');
	let password = $state('');
	let error: string | null = $state(null);
	let message: string | null = $state(null);
	let isLoading = $state(false);
	let showPasswordModal = $state(false);
	let showMagicLinkModal = $state(false);
	let showForgotPasswordModal = $state(false);

	onMount(() => {
		if (queryParams.get('error') === 'invalid_token') {
			error = '無効なリンクです。';
		} else if (queryParams.get('error') === 'INVALID_TOKEN') {
			error = '無効なリンクです。';
		}
	});

	function changeMode(newMode: 'login' | 'register') {
		mode = newMode;
		error = null;
		message = null;
		showPasswordModal = false;
		showMagicLinkModal = false;
		showForgotPasswordModal = false;
	}

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
			} else if ((data as { twoFactorRedirect?: boolean }).twoFactorRedirect) {
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

	const signInWithDiscord = async () => {
		if (isLoading) return;
		isLoading = true;
		error = null;
		message = null;

		try {
			const { data, error: signInError } = await signIn.social({
				provider: 'discord',
				callbackURL: '/home'
			});

			if (signInError) {
				console.error('Signin error:', signInError);
				error = signInError.message || 'ログイン出来ませんでした。';
			} else if ((data as { twoFactorRedirect?: boolean }).twoFactorRedirect) {
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
			const { data, error: signInError } = (await signIn.passkey()) as {
				data?: { twoFactorRedirect?: boolean } | null;
				error?: { message?: string } | null;
			};
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

	const startAsGuest = async () => {
		if (isLoading) return;
		isLoading = true;
		error = null;
		message = null;

		try {
			const guestId = 'guest_' + ulid().toLowerCase();
			const guestPassword = ulid() + ulid(); // 十分に長くユニークなパスワード
			const guestEmail = `${guestId}@sazanami.local`;

			console.log('Registering guest user:', guestId);
			const { error: signUpError } = await signUp.email({
				name: `ゲスト (${guestId.slice(6, 12)})`,
				email: guestEmail,
				password: guestPassword,
				callbackURL: '/home'
			});

			if (signUpError) {
				console.error('Guest registration error:', signUpError);
				error = signUpError.message || 'ゲストログインに失敗しました。';
			} else {
				console.log('Guest registration successful, signing in...');
				const { error: signInError } = await signIn.email({
					email: guestEmail,
					password: guestPassword,
					callbackURL: '/home'
				});

				if (signInError) {
					console.error('Guest login error:', signInError);
					error = signInError.message || 'ゲストログインに失敗しました。';
				} else {
					await invalidateAll();
					await goto('/home');
				}
			}
		} catch (e: unknown) {
			console.error('Guest login unexpected error:', e);
			if (e instanceof Error) {
				error = e.message;
			} else {
				error = '予期せぬエラーが発生しました。';
			}
		} finally {
			isLoading = false;
		}
	};
</script>

<div class="container" style="max-width: 400px; margin: 2rem auto;">
	<LoginForm
		bind:mode
		bind:name
		bind:email
		bind:password
		bind:error
		bind:message
		bind:isLoading
		{showPasswordModal}
		onModeChange={changeMode}
		onclose={() => (showPasswordModal = false)}
		onForgotPassword={() => {
			showPasswordModal = false;
			showForgotPasswordModal = true;
		}}
	/>

	<div class="card bg-base-100 mt-4 shadow-xl">
		<div class="card-body">
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

			{#if mode === 'login'}
				<div class="card-actions mt-4">
					<button
						type="button"
						class="btn btn-secondary btn-outline w-full font-bold"
						disabled={isLoading}
						onclick={startAsGuest}
					>
						アカウント不要で始める (ゲスト)
					</button>
				</div>

				<div class="card-actions mt-4">
					<button
						type="button"
						class="btn btn-primary w-full font-bold"
						disabled={isLoading}
						onclick={signInWithPasskey}
					>
						パスキーでログイン
					</button>
				</div>
			{:else}
				<div class="card-actions mt-4">
					<button
						type="button"
						class="btn btn-secondary btn-outline w-full font-bold"
						disabled={isLoading}
						onclick={startAsGuest}
					>
						アカウント不要で始める (ゲスト)
					</button>
				</div>
			{/if}

			<div class="card-actions mt-4">
				<button
					type="button"
					class="btn w-full font-bold"
					disabled={isLoading}
					onclick={() => (showMagicLinkModal = true)}
				>
					{mode === 'login' ? 'マジックリンクでログイン' : 'マジックリンクで登録'}
				</button>
			</div>

			<div class="card-actions mt-4">
				<button
					type="button"
					class="btn w-full font-bold"
					disabled={isLoading}
					onclick={signInWithGoogle}
				>
					Googleで{mode === 'login' ? 'ログイン' : '登録'}
				</button>
			</div>

			<div class="card-actions mt-4">
				<button
					type="button"
					class="btn w-full border-none bg-[#5865F2] font-bold text-white hover:bg-[#4752C4]"
					disabled={isLoading}
					onclick={signInWithDiscord}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 127.14 96.36"
						class="h-5 w-5 fill-current"
						aria-hidden="true"
					>
						<path
							d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"
						/>
					</svg>
					Discordで{mode === 'login' ? 'ログイン' : '登録'}
				</button>
			</div>

			<div class="card-actions mt-4">
				<button
					type="button"
					class="btn btn-neutral w-full font-bold"
					disabled={isLoading}
					onclick={() => (showPasswordModal = true)}
				>
					{mode === 'login' ? 'IDとパスワードでログイン' : 'IDとパスワードで登録'}
				</button>
			</div>
		</div>
	</div>

	{#if showMagicLinkModal}
		<MagicLinkModal
			{mode}
			bind:name
			bind:email
			bind:error
			bind:message
			bind:isLoading
			onclose={() => (showMagicLinkModal = false)}
		/>
	{/if}

	{#if showForgotPasswordModal}
		<ForgotPasswordModal
			bind:email
			bind:error
			bind:message
			bind:isLoading
			onclose={() => (showForgotPasswordModal = false)}
		/>
	{/if}
</div>
