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

	const hasLinks = $derived(
		oneHopLinks.length > 0 || backlinks.length > 0 || twoHopLinks.length > 0
	);
</script>

<div class="border-base-300 mt-8 border-t pt-6">
	<h2 class="text-base-content/70 mb-4 flex items-center gap-2 text-base font-semibold">
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
	</h2>

	{#if !hasLinks}
		<p class="text-base-content/40 text-sm">リンクはありません</p>
	{/if}

	<div class="flex flex-col gap-8">
		{#if backlinks.length > 0}
			<div>
				<h3
					class="text-base-content/50 mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-3.5 w-3.5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M11 17l-5-5m0 0l5-5m-5 5h12"
						/>
					</svg>
					被リンク
				</h3>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					{#each backlinks as link (link.id)}
						<MemoCard note={link} linkToDetail={true} />
					{/each}
				</div>
			</div>
		{/if}

		{#if oneHopLinks.length > 0}
			<div>
				<h3
					class="text-base-content/50 mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-3.5 w-3.5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 7l5 5m0 0l-5 5m5-5H6"
						/>
					</svg>
					リンク先
				</h3>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					{#each oneHopLinks as link (link.id)}
						<MemoCard note={link} linkToDetail={true} />
					{/each}
				</div>
			</div>
		{/if}

		{#if twoHopLinks.length > 0}
			<div>
				<h3
					class="text-base-content/40 mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-3.5 w-3.5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17 8l4 4m0 0l-4 4m4-4H3"
						/>
					</svg>
					2ホップ先
				</h3>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					{#each twoHopLinks as link (link.id)}
						<MemoCard note={link} linkToDetail={true} />
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>
