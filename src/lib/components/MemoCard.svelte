<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Note } from '$lib/types';
	import { marked } from 'marked';

	export let note: Note;
	export let linkToDetail = false; // Default to false for modal behavior

	const dispatch = createEventDispatcher<{ edit: Note }>();

	function handleClick() {
		if (!linkToDetail && note.id) {
			dispatch('edit', note);
		}
	}

	$: renderedContent = marked(note.content || '');
</script>

{#if linkToDetail}
	<a
		href={note.id ? `/home/note/${note.id}` : undefined}
		class="card bg-base-100 rounded-box block min-h-48 p-4 shadow-md transition-shadow hover:shadow-lg"
	>
		<h2 class="card-title mb-2 line-clamp-1 text-lg font-bold">{note.title}</h2>
		<div class="prose text-base-content/70 mb-3 line-clamp-4 text-sm">{@html renderedContent}</div>
		<div class="flex flex-wrap gap-1">
			{#each note.tags as tag (tag)}
				<span class="badge badge-sm badge-ghost">{tag}</span>
			{/each}
		</div>
	</a>
{:else}
	<div
		class="card bg-base-100 rounded-box min-h-48 cursor-pointer overflow-hidden p-4 shadow-md transition-shadow hover:shadow-lg"
		onclick={handleClick}
		role="button"
		tabindex="0"
		onkeydown={(e) => e.key === 'Enter' && handleClick()}
		aria-label="メモを編集"
	>
		<h2 class="card-title mb-2 line-clamp-1 text-lg font-bold">{note.title}</h2>
		<div class="prose text-base-content/70 mb-3 line-clamp-4 text-sm">{@html renderedContent}</div>
		<div class="flex flex-wrap gap-1">
			{#each note.tags as tag (tag)}
				<span class="badge badge-sm badge-ghost">{tag}</span>
			{/each}
		</div>
	</div>
{/if}
