<script lang="ts">
	import type { PageData, ActionData } from './$types';

	let { data }: { data: PageData & { form?: ActionData } } = $props();
</script>

<h1 class="text-2xl font-bold">アカウント管理</h1>

<div class="mt-4">
	<h2 class="text-xl font-semibold">ユーザー情報</h2>
	<div class="mt-2">
		<p><strong>ユーザーID:</strong> {data.user.id}</p>
		<p><strong>ユーザー名:</strong> {data.user.name}</p>
	</div>
</div>

<div class="mt-8">
	<h2 class="text-xl font-semibold">パスワード変更</h2>
	{#if data.form?.message}
		<div class="alert alert-info mt-4">
			<p>{data.form.message}</p>
		</div>
	{/if}
	<form method="POST" action="?/changePassword" class="mt-2 space-y-4">
		<div>
			<label for="currentPassword" class="block text-sm font-medium">現在のパスワード</label>
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
			<label for="confirmPassword" class="block text-sm font-medium">新しいパスワード（確認）</label
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
</div>
