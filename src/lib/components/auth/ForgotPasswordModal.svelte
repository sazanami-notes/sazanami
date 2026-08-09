<script lang="ts">
	import { emailPassword } from '$lib/auth-client';

	let {
		email = $bindable(''),
		error = $bindable(null),
		message = $bindable(null),
		isLoading = $bindable(false),
		onclose
	}: {
		email?: string;
		error?: string | null;
		message?: string | null;
		isLoading?: boolean;
		onclose?: () => void;
	} = $props();

	const forgotPassword = async () => {
		if (isLoading) return;
		if (!email) {
			error = 'メールアドレスを入力してください。';
			return;
		}

		isLoading = true;
		error = null;
		message = null;

		try {
			const { error: forgotError } = await emailPassword.forgetPassword({
				email,
				redirectTo: '/reset-password'
			});

			if (forgotError) {
				error = forgotError.message || 'パスワード再設定メールの送信に失敗しました。';
			} else {
				message = 'パスワード再設定用のメールを送信しました。';
				onclose?.();
			}
		} catch (e) {
			console.error('Forgot password error:', e);
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
		<h3 class="mb-4 text-lg font-bold">パスワードを忘れた場合</h3>
		{#if error}
			<div role="alert" class="alert alert-error mb-4">
				<span class="text-sm">{error}</span>
			</div>
		{/if}
		<form
			onsubmit={(e) => {
				e.preventDefault();
				forgotPassword();
			}}
		>
			<div class="form-control mb-6">
				<label class="label" for="email_forgot"><span class="label-text">Email</span></label>
				<input
					id="email_forgot"
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
					再設定メールを送信
				</button>
			</div>
		</form>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button onclick={onclose}>close</button>
	</form>
</dialog>
