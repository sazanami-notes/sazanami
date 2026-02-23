<script lang="ts">
	import type { PageServerData } from './$types';
	import { formatDistanceToNow } from 'date-fns';
	import { ja } from 'date-fns/locale';

	export let data: PageServerData;

	$: ({ profile, isOwner, notes } = data);
</script>

<svelte:head>
	<title>{profile.name} (@{profile.username || profile.id}) - Sazanami</title>
</svelte:head>

<div class="mx-auto max-w-4xl p-4 md:p-8">
	<!-- Profile Header -->
	<div class="card bg-base-100 border-base-200 border shadow-sm">
		<div class="card-body flex-col items-start gap-6 md:flex-row md:items-center">
			<div class="avatar">
				<div class="ring-primary ring-offset-base-100 w-24 rounded-full ring ring-offset-2">
					{#if profile.image}
						<img src={profile.image} alt={profile.name} />
					{:else}
						<div
							class="bg-neutral text-neutral-content flex h-full w-full items-center justify-center text-3xl"
						>
							{profile.name?.charAt(0) || '?'}
						</div>
					{/if}
				</div>
			</div>

			<div class="flex-1 space-y-2">
				<div class="flex items-center justify-between">
					<div>
						<h1 class="text-3xl font-bold">{profile.name}</h1>
						<p class="text-base-content/60 font-mono">@{profile.username || profile.id}</p>
					</div>
					{#if isOwner}
						<a href="/{profile.username || profile.id}/edit" class="btn btn-outline btn-sm">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path
									d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
								></path></svg
							>
							プロフィールを編集
						</a>
					{/if}
				</div>

				<div class="divider my-2"></div>

				<p class="text-base whitespace-pre-wrap">
					{profile.bio || '自己紹介はまだありません。'}
				</p>
			</div>
		</div>
	</div>

	<!-- Notes Section -->
	<div class="mt-8">
		<h2 class="mb-4 text-2xl font-bold">
			{#if isOwner}
				あなたのノート
			{:else}
				公開ノート
			{/if}
		</h2>

		{#if notes.length === 0}
			<div class="text-base-content/60 py-10 text-center">ノートがありません。</div>
		{:else}
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				{#each notes as note}
					<div class="card bg-base-100 border-base-200 border shadow-sm">
						<div class="card-body">
							<h3 class="card-title truncate text-lg">{note.title || 'Untitled Note'}</h3>
							<p class="text-base-content/60 text-sm">
								{formatDistanceToNow(new Date(note.createdAt), { addSuffix: true, locale: ja })}
							</p>
							<div class="card-actions mt-2 justify-end">
								<!-- todo: 本来はノートの詳細画面などへ飛ぶ -->
								<a href="/home/note/{note.id}" class="btn btn-ghost btn-sm">詳細</a>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
