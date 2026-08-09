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
