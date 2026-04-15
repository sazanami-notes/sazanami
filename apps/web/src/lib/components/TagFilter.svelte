<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher<{ filter: string[] }>();

	export let allTags: string[] = [];
	export let selectedTags: string[] = [];

	function toggleTag(tag: string) {
		if (selectedTags.includes(tag)) {
			selectedTags = selectedTags.filter((t) => t !== tag);
		} else {
			selectedTags = [...selectedTags, tag];
		}
		dispatch('filter', selectedTags);
	}

	function clearAll() {
		selectedTags = [];
		dispatch('filter', selectedTags);
	}
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between">
		<h3 class="text-sm font-medium opacity-70">タグでフィルター</h3>
		{#if selectedTags.length > 0}
			<button on:click={clearAll} class="text-primary text-sm hover:opacity-80"> クリア </button>
		{/if}
	</div>

	{#if allTags.length === 0}
		<p class="text-sm opacity-50">利用可能なタグがありません</p>
	{:else}
		<div class="flex flex-wrap gap-2">
			{#each allTags as tag}
				<button
					on:click={() => toggleTag(tag)}
					class="rounded-full px-3 py-1 text-sm transition-colors
						{selectedTags.includes(tag)
						? 'bg-primary text-primary-content'
						: 'bg-base-200 text-base-content hover:bg-base-300'}"
				>
					{tag}
				</button>
			{/each}
		</div>
	{/if}
</div>
