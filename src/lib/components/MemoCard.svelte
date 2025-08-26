<script lang="ts">
	import type { Note } from '$lib/types';
	export let note: Note;
	let isHovered = false;
</script>

<div
	class="card bg-base-100 rounded-box overflow-hidden shadow-md transition-shadow hover:shadow-lg"
	class:cursor-pointer={note.id}
	on:mouseenter={() => (isHovered = true)}
	on:mouseleave={() => (isHovered = false)}
	role="region"
	aria-label="メモカード"
>
	<a
		href={note.id ? `/home/note/${note.id}` : undefined}
		class="block p-4"
	>
		<h2 class="card-title mb-2 line-clamp-1 text-lg font-bold">{note.title}</h2>
		<div class="text-base-content/70 mb-3 line-clamp-2 text-sm">
			{@html note.content
				? note.content.substring(0, 100) + (note.content.length > 100 ? '...' : '')
				: ''}
		</div>
		<div class="flex flex-wrap gap-1">
			{#each note.tags as tag}
				<span class="badge badge-sm badge-ghost">{tag}</span>
			{/each}
		</div>
	</a>
</div>
