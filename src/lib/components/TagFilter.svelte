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
		<h3 class="text-sm font-medium text-gray-700">タグでフィルター</h3>
		{#if selectedTags.length > 0}
			<button on:click={clearAll} class="text-sm text-blue-600 hover:text-blue-800">
				クリア
			</button>
		{/if}
	</div>

	{#if allTags.length === 0}
		<p class="text-sm text-gray-500">利用可能なタグがありません</p>
	{:else}
		<div class="flex flex-wrap gap-2">
			{#each allTags as tag}
				<button
					on:click={() => toggleTag(tag)}
					class="rounded-full px-3 py-1 text-sm transition-colors
						{selectedTags.includes(tag)
						? 'bg-blue-600 text-white'
						: 'bg-gray-200 text-gray-700 hover:bg-gray-300'}"
				>
					{tag}
				</button>
			{/each}
		</div>
	{/if}
</div>
