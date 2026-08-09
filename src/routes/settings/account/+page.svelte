<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { updateUser, linkSocial } from '$lib/auth-client';
	import { invalidateAll } from '$app/navigation';
	import PasskeySection from '$lib/components/settings/PasskeySection.svelte';
	import TwoFactorSection from '$lib/components/settings/TwoFactorSection.svelte';

	let { data }: { data: PageData & { form?: ActionData } } = $props();

	// User Name Update Logic
	let isEditingName = $state(false);
	let newName = $state(data.user.name);
	let isUpdatingName = $state(false);

	async function updateName() {
		if (!newName || newName === data.user.name) {
			isEditingName = false;
			return;
		}

		isUpdatingName = true;
		try {
			await updateUser({ name: newName });
			await invalidateAll(); // Refresh data to show new name
			isEditingName = false;
		} catch (e) {
			console.error('Failed to update name:', e);
			alert('名前の更新に失敗しました。');
		} finally {
			isUpdatingName = false;
		}
	}

	// Social Link Logic
	let isLinkingGoogle = $state(false);
	let googleLinked = $derived(data.accounts?.some((a) => a.providerId === 'google'));

	async function linkGoogle() {
		isLinkingGoogle = true;
		try {
			await linkSocial({ provider: 'google', callbackURL: '/settings/account' });
		} catch (e) {
			console.error('Failed to link Google:', e);
			alert('Google連携に失敗しました。');
			isLinkingGoogle = false;
		}
	}
</script>

<h1 class="text-2xl font-bold">アカウント管理</h1>

<div class="mt-4">
	<h2 class="text-xl font-semibold">ユーザー情報</h2>
	<div class="mt-2 space-y-2">
		<p><strong>ユーザーID:</strong> {data.user.id}</p>

		<div class="flex items-center gap-2">
			<strong>ユーザー名:</strong>
			{#if isEditingName}
				<input
					type="text"
					bind:value={newName}
					class="input input-bordered input-sm"
					disabled={isUpdatingName}
				/>
				<button class="btn btn-sm btn-primary" onclick={updateName} disabled={isUpdatingName}>
					{isUpdatingName ? '保存中...' : '保存'}
				</button>
				<button
					class="btn btn-sm btn-ghost"
					onclick={() => {
						isEditingName = false;
						newName = data.user.name;
					}}
					disabled={isUpdatingName}
				>
					キャンセル
				</button>
			{:else}
				<span>{data.user.name}</span>
				<button
					class="btn btn-sm btn-ghost"
					onclick={() => {
						isEditingName = true;
						newName = data.user.name;
					}}
				>
					変更
				</button>
			{/if}
		</div>

		<p><strong>メールアドレス:</strong> {data.user.email}</p>
	</div>
</div>

<div class="mt-8">
	<h2 class="text-xl font-semibold">ソーシャル連携</h2>
	<div class="mt-4">
		<div class="flex items-center justify-between rounded-lg border p-4">
			<div class="flex items-center gap-3">
				<span class="font-medium">Google</span>
				{#if googleLinked}
					<span class="badge badge-success">連携済み</span>
				{:else}
					<span class="badge badge-ghost">未連携</span>
				{/if}
			</div>

			<div>
				{#if googleLinked}
					<form method="POST" action="?/unlinkAccount">
						<input type="hidden" name="providerId" value="google" />
						<button
							class="btn btn-sm btn-error btn-outline"
							onclick={(e) => {
								if (!confirm('Google連携を解除しますか？')) {
									e.preventDefault();
								}
							}}>解除</button
						>
					</form>
				{:else}
					<button class="btn btn-sm btn-primary" onclick={linkGoogle} disabled={isLinkingGoogle}>
						{isLinkingGoogle ? '連携中...' : '連携する'}
					</button>
				{/if}
			</div>
		</div>
	</div>
</div>

<TwoFactorSection
	twoFactorEnabled={(data.user as { twoFactorEnabled?: boolean }).twoFactorEnabled}
	invalidateAll={invalidateAll}
/>

<PasskeySection />

<div class="mt-8">
	<h2 class="text-xl font-semibold">パスワード設定</h2>

	{#if data.form?.message}
		<div class="alert alert-info mt-4">
			<p>{data.form.message}</p>
		</div>
	{/if}

	<div class="mt-4">
		<div class="flex items-center gap-4">
			<span class="font-medium">状態:</span>
			{#if data.hasPassword}
				<span class="badge badge-success">設定済み</span>
			{:else}
				<span class="badge badge-ghost">未設定</span>
			{/if}
		</div>

		<div class="mt-4">
			{#if data.hasPassword}
				<div class="collapse-arrow bg-base-200 collapse">
					<input type="checkbox" />
					<div class="collapse-title text-sm font-medium">パスワードを変更する</div>
					<div class="collapse-content">
						<form method="POST" action="?/changePassword" class="space-y-4">
							<div>
								<label for="currentPassword" class="block text-sm font-medium"
									>現在のパスワード</label
								>
								<input
									type="password"
									id="currentPassword"
									name="currentPassword"
									class="input input-bordered mt-1 w-full"
									required
								/>
							</div>
							<div>
								<label for="newPassword" class="block text-sm font-medium">新しいパスワード</label>
								<input
									type="password"
									id="newPassword"
									name="newPassword"
									class="input input-bordered mt-1 w-full"
									required
								/>
							</div>
							<div>
								<label for="confirmPassword" class="block text-sm font-medium"
									>新しいパスワード（確認）</label
								>
								<input
									type="password"
									id="confirmPassword"
									name="confirmPassword"
									class="input input-bordered mt-1 w-full"
									required
								/>
							</div>
							<button type="submit" class="btn btn-primary">パスワードを変更</button>
						</form>

						<div class="divider">または</div>

						<form method="POST" action="?/resetPasswordDirect">
							<p class="mb-2 text-sm">
								現在のパスワードを忘れた場合は、再設定ページへ移動してください。
							</p>
							<button type="submit" class="btn btn-outline btn-sm">パスワードを再設定する</button>
						</form>
					</div>
				</div>
			{:else}
				<form method="POST" action="?/resetPasswordDirect">
					<p class="mb-4 text-sm text-gray-600">
						マジックリンク等でログインしており、パスワードが設定されていません。<br />
						以下のボタンからパスワード設定画面へ移動できます。
					</p>
					<button type="submit" class="btn btn-primary">パスワードを設定する</button>
				</form>
			{/if}
		</div>
	</div>
</div>
