<script lang="ts">
	import type { Note } from '$lib/types';
	import MemoCard from './MemoCard.svelte';

	let {
		oneHopLinks = [],
		backlinks = [],
		twoHopLinks = []
	}: {
		oneHopLinks?: Note[];
		backlinks?: Note[];
		twoHopLinks?: Note[];
	} = $props();

	// リンクとバックリンクを混ぜて1つに（重複排除）
	const mixedLinks = $derived.by(() => {
		const result: Note[] = [];
		for (const n of [...backlinks, ...oneHopLinks]) {
			if (!result.some((r) => r.id === n.id)) {
				result.push(n);
			}
		}
		return result;
	});

	const hasLinks = $derived(mixedLinks.length > 0 || twoHopLinks.length > 0);
</script>

<div class="mt-8 pb-24">
	<h2 class="text-base-content/60 mb-3 flex items-center gap-2 text-sm font-semibold">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="h-4 w-4"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
			/>
		</svg>
		リンク
		{#if hasLinks}
			<span class="text-base-content/40 font-normal">{mixedLinks.length + twoHopLinks.length}</span>
		{/if}
	</h2>

	{#if !hasLinks}
		<p class="text-base-content/40 text-sm">リンクはありません</p>
	{:else}
		<div class="space-y-5">
			{#if mixedLinks.length > 0}
				<div class="grid grid-cols-2 gap-3 md:grid-cols-3">
					{#each mixedLinks as link (link.id)}
						<MemoCard note={link} linkToDetail={true} />
					{/each}
				</div>
			{/if}

			{#if twoHopLinks.length > 0}
				<div>
					<h3 class="text-base-content/40 mb-2 text-xs font-semibold tracking-wider">
						2ホップリンク
					</h3>
					<div class="grid grid-cols-2 gap-3 md:grid-cols-3">
						{#each twoHopLinks as link (link.id)}
							<MemoCard note={link} linkToDetail={true} />
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
