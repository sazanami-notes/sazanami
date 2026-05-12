<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageServerData, ActionData } from './$types';

	export let data: PageServerData;
	export let form: ActionData;

	let submitting = false;
	let imagePreview = data.profile.user?.image || null;

	function handleImageSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (e) => {
				imagePreview = e.target?.result as string;
			};
			reader.readAsDataURL(file);
		}
	}
</script>

<svelte:head>
	<title>プロフィール編集 - Sazanami</title>
</svelte:head>

<div class="mx-auto max-w-2xl p-4 md:p-8">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-3xl font-bold">プロフィールの編集</h1>
		<a href="/{data.profile.username || data.profile.id}" class="btn btn-ghost btn-sm">キャンセル</a
		>
	</div>

	<div class="card bg-base-100 border-base-200 border shadow-sm">
		<div class="card-body">
			{#if form?.error}
				<div class="alert alert-error mb-4">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6 shrink-0 stroke-current"
						fill="none"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<span>{form.error}</span>
				</div>
			{/if}

			<form
				method="POST"
				enctype="multipart/form-data"
				use:enhance={() => {
					submitting = true;
					return async ({ update }) => {
						await update();
						submitting = false;
					};
				}}
				class="space-y-6"
			>
				<!-- Profile Image -->
				<div class="form-control w-full">
					<label class="label" for="image">
						<span class="label-text font-semibold">プロフィール画像</span>
					</label>
					<div class="flex items-center gap-4">
						<div class="avatar">
							<div class="ring-primary ring-offset-base-100 w-24 rounded-full ring ring-offset-2">
								{#if imagePreview}
									<img src={imagePreview} alt="プロフィールプレビュー" />
								{:else}
									<div
										class="bg-neutral text-neutral-content flex h-full w-full items-center justify-center text-2xl font-bold"
									>
										{data.profile.name?.charAt(0) || '?'}
									</div>
								{/if}
							</div>
						</div>
						<input
							type="file"
							id="image"
							name="image"
							accept="image/*"
							class="file-input file-input-bordered w-full max-w-xs"
							on:change={handleImageSelect}
						/>
					</div>
				</div>

				<!-- 表示名 -->
				<div class="form-control w-full">
					<label class="label" for="name">
						<span class="label-text font-semibold">表示名</span>
					</label>
					<input
						type="text"
						id="name"
						name="name"
						placeholder="表示名を入力"
						class="input input-bordered w-full"
						class:input-error={form?.error?.includes('名前')}
						value={form?.name ?? data.profile.name}
						required
					/>
				</div>

				<!-- ユーザー名 (ID) -->
				<div class="form-control w-full">
					<label class="label" for="username">
						<span class="label-text font-semibold">ユーザー名 (@)</span>
						<span class="label-text-alt text-base-content/60">URLになります</span>
					</label>
					<div class="relative">
						<span
							class="text-base-content/60 absolute inset-y-0 left-0 flex items-center pl-3 font-mono"
						>
							@
						</span>
						<input
							type="text"
							id="username"
							name="username"
							placeholder="username"
							class="input input-bordered w-full pl-8 font-mono"
							class:input-error={form?.error?.includes('ユーザー名')}
							value={form?.username ?? data.profile.username ?? ''}
							pattern="^[a-zA-Z0-9_-]*$"
							title="半角英数字と_-のみ使用できます"
						/>
					</div>
					<div class="label pb-0">
						<span class="label-text-alt text-base-content/60">
							※未設定の場合はシステムIDのURLになります
						</span>
					</div>
				</div>

				<!-- 自己紹介 (Bio) -->
				<div class="form-control w-full">
					<label class="label" for="bio">
						<span class="label-text font-semibold">自己紹介</span>
					</label>
					<textarea
						id="bio"
						name="bio"
						class="textarea textarea-bordered h-32 w-full"
						placeholder="自己紹介を書いてみましょう..."
						>{form?.bio ?? data.profile.bio ?? ''}</textarea
					>
				</div>

				<div class="divider"></div>

				<div class="flex justify-end gap-2">
					<a href="/{data.profile.username || data.profile.id}" class="btn btn-ghost">キャンセル</a>
					<button type="submit" class="btn btn-primary" disabled={submitting}>
						{#if submitting}
							<span class="loading loading-spinner loading-sm"></span>
							保存中...
						{:else}
							保存する
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
</div>
