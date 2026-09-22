<script lang="ts">
	import type { Note } from '$lib/types';

	let {
		oneHopLinks = [],
		backlinks = [],
		twoHopLinks = []
	}: {
		oneHopLinks?: Note[];
		backlinks?: Note[];
		twoHopLinks?: Note[];
	} = $props();

	// Scrapbox風: リンクとバックリンクを混ぜて1つのリストに（重複排除）
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

	function snippet(content: string | null | undefined): string {
		if (!content) return '';
		return content
			.replace(/!\[\[(.*?)\]\]/g, '')
			.replace(/\[\[(.*?)\]\]/g, '$1')
			.replace(/[#>*_`~]/g, ' ')
			.replace(/\s+/g, ' ')
			.trim()
			.slice(0, 90);
	}
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
	{:else}
		<div class="flex flex-col gap-6">
			{#if mixedLinks.length > 0}
				<ul class="space-y-2">
					{#each mixedLinks as link (link.id)}
						{@const s = snippet(link.content)}
						<li>
							<a href={`/home/note/${link.id}`} class="link-hover link text-sm font-medium">
								{link.title || '無題'}
							</a>
							{#if s}
								<div class="text-base-content/50 truncate text-xs">{s}</div>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}

			{#if twoHopLinks.length > 0}
				<div>
					<h3 class="text-base-content/40 mb-2 text-xs font-semibold tracking-wider">
						2ホップリンク
					</h3>
					<ul class="space-y-2">
						{#each twoHopLinks as link (link.id)}
							{@const s = snippet(link.content)}
							<li>
								<a href={`/home/note/${link.id}`} class="link-hover link text-sm">
									{link.title || '無題'}
								</a>
								{#if s}
									<div class="text-base-content/50 truncate text-xs">{s}</div>
								{/if}
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>
	{/if}
</div>
