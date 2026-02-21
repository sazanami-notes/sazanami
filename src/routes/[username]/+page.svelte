<script lang="ts">
	import type { PageData } from './$types';
	import { formatDistanceToNow } from 'date-fns';
	import { ja } from 'date-fns/locale';

	let { data }: { data: PageData } = $props();
</script>

<div class="p-4 space-y-8">
	<!-- User Profile Header -->
	<div class="flex flex-col items-center text-center space-y-4">
		<div class="avatar">
			<div class="w-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
				{#if data.profileUser.image}
					<img src={data.profileUser.image} alt={data.profileUser.name} />
				{:else}
					<div class="bg-neutral text-neutral-content flex items-center justify-center h-full text-3xl">
						{data.profileUser.name?.charAt(0) || '?'}
					</div>
				{/if}
			</div>
		</div>
		<div>
			<h1 class="text-3xl font-bold">{data.profileUser.name}</h1>
			<p class="text-base-content/60">@{data.profileUser.username}</p>
		</div>
		{#if data.profileUser.bio}
			<p class="max-w-md whitespace-pre-wrap">{data.profileUser.bio}</p>
		{/if}
	</div>

	<div class="divider">Public Notes</div>

	<!-- Public Notes List -->
	{#if data.publicNotes.length === 0}
		<div class="text-center text-base-content/50 py-12">
			<p>公開されているノートはありません。</p>
		</div>
	{:else}
		<div class="grid gap-4">
			{#each data.publicNotes as note (note.id)}
				<a href="/home/note/{note.id}" class="card bg-base-100 shadow-sm border border-base-200 hover:border-primary transition-colors">
					<div class="card-body p-4">
						<h2 class="card-title text-lg">{note.title || 'Untitled'}</h2>
						<p class="text-sm text-base-content/70 line-clamp-2">
							{note.content?.substring(0, 100) || '本文なし'}
						</p>
						<div class="card-actions justify-end mt-2 text-xs text-base-content/50">
							<span>
								更新: {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true, locale: ja })}
							</span>
						</div>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
