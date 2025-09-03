<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Note } from '$lib/types';

	export let note: Note;

	const dispatch = createEventDispatcher<{ edit: Note }>();

	function handleClick() {
		if (note.id) {
			dispatch('edit', note);
		}
	}
</script>

<div
	class="card bg-base-100 rounded-box overflow-hidden p-4 shadow-md transition-shadow hover:shadow-lg"
	class:cursor-pointer={note.id}
	on:click={handleClick}
	role="button"
	tabindex="0"
	on:keydown={(e) => e.key === 'Enter' && handleClick()}
	aria-label="メモを編集"
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
</div>
