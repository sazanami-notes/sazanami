<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { SortKey } from '$lib/utils/note-utils';

	const dispatch = createEventDispatcher<{ sort: SortKey }>();

	export let value: SortKey = 'updatedAt_desc';

	const options: { value: SortKey; label: string }[] = [
		{ value: 'updatedAt_desc', label: '更新日（新しい順）' },
		{ value: 'updatedAt_asc', label: '更新日（古い順）' },
		{ value: 'createdAt_desc', label: '作成日（新しい順）' },
		{ value: 'createdAt_asc', label: '作成日（古い順）' },
		{ value: 'title_asc', label: 'タイトル（A → Z）' },
		{ value: 'title_desc', label: 'タイトル（Z → A）' }
	];

	function handleChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		value = target.value as SortKey;
		dispatch('sort', value);
	}
</script>

<div class="flex items-center gap-2">
	<label for="sort-select" class="text-sm font-medium whitespace-nowrap opacity-70">並び替え</label>
	<select
		id="sort-select"
		class="select select-bordered select-sm w-full max-w-xs"
		bind:value
		on:change={handleChange}
	>
		{#each options as option}
			<option value={option.value}>{option.label}</option>
		{/each}
	</select>
</div>
