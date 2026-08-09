<script lang="ts">
	import { authClient } from '$lib/auth-client';

	let {
		mode = 'login',
		name = $bindable(''),
		email = $bindable(''),
		error = $bindable(null),
		message = $bindable(null),
		isLoading = $bindable(false),
		onclose
	}: {
		mode?: 'login' | 'register';
		name?: string;
		email?: string;
		error?: string | null;
		message?: string | null;
		isLoading?: boolean;
		onclose?: () => void;
	} = $props();

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
			const { error: signInError } = await authClient.signIn.magicLink({
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
				onclose?.();
			}
		} catch (e) {
			console.error('Signin error', e);
			error = '予期せぬエラーが発生しました。';
		} finally {
			isLoading = false;
		}
	};
</script>

<dialog class="modal modal-open">
	<div class="modal-box">
		<form method="dialog">
			<button class="btn btn-sm btn-circle btn-ghost absolute top-2 right-2" onclick={onclose}
				>✕</button
			>
		</form>
		<h3 class="mb-4 text-lg font-bold">
			{mode === 'login' ? 'マジックリンクでログイン' : 'マジックリンクで登録'}
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
		<form
			onsubmit={(e) => {
				e.preventDefault();
				signInWithMagicLink();
			}}
		>
			{#if mode === 'register'}
				<div class="form-control mb-4">
					<label class="label" for="name_ml"><span class="label-text">Name</span></label>
					<input
						id="name_ml"
						name="name"
						type="text"
						class="input input-bordered w-full"
						bind:value={name}
						required
						disabled={isLoading}
					/>
				</div>
			{/if}
			<div class="form-control mb-6">
				<label class="label" for="email_ml"><span class="label-text">Email</span></label>
				<input
					id="email_ml"
					name="email"
					type="email"
					class="input input-bordered w-full"
					bind:value={email}
					required
					disabled={isLoading}
				/>
			</div>
			<div class="modal-action">
				<button type="submit" class="btn btn-primary w-full" disabled={isLoading}>
					{#if isLoading}<span class="loading loading-spinner"></span>{/if}
					{mode === 'login' ? 'メールを受け取ってログイン' : 'メールを受け取って登録'}
				</button>
			</div>
		</form>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button onclick={onclose}>close</button>
	</form>
</dialog>
