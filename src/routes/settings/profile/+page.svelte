<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let username = $state(data.settings?.username || '');
	let bio = $state(data.settings?.bio || '');
	let isUpdating = $state(false);
</script>

<div class="max-w-2xl mx-auto p-4">
	<h1 class="text-2xl font-bold mb-6">プロフィール編集</h1>

	{#if form?.error}
		<div class="alert alert-error mb-4">
			<span>{form.error}</span>
		</div>
	{/if}

	{#if form?.success}
		<div class="alert alert-success mb-4">
			<span>{form.message}</span>
		</div>
	{/if}

	<form
		method="POST"
		action="?/updateProfile"
		use:enhance={() => {
			isUpdating = true;
			return async ({ update }) => {
				await update();
				isUpdating = false;
			};
		}}
		class="space-y-6"
	>
		<div class="form-control w-full">
			<label class="label" for="username">
				<span class="label-text">ユーザー名 (URLに使用されます)</span>
			</label>
			<input
				type="text"
				id="username"
				name="username"
				bind:value={username}
				placeholder="username"
				class="input input-bordered w-full"
				pattern="^[a-zA-Z0-9_]{'{3,20}'}$"
				title="3〜20文字の英数字とアンダースコアのみ使用できます。"
			/>
			<label class="label">
				<span class="label-text-alt text-base-content/60">
					https://sazanami.io/{username || 'username'}
				</span>
			</label>
		</div>

		<div class="form-control w-full">
			<label class="label" for="bio">
				<span class="label-text">自己紹介</span>
			</label>
			<textarea
				id="bio"
				name="bio"
				bind:value={bio}
				placeholder="こんにちは！Sazanamiを使っています。"
				class="textarea textarea-bordered h-24 w-full"
			></textarea>
		</div>

		<div class="flex justify-end gap-2">
			<a href="/settings/account" class="btn btn-ghost">キャンセル</a>
			<button type="submit" class="btn btn-primary" disabled={isUpdating}>
				{#if isUpdating}
					<span class="loading loading-spinner loading-sm"></span>
					更新中...
				{:else}
					保存する
				{/if}
			</button>
		</div>
	</form>
</div>
