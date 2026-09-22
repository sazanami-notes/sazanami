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
			.slice(0, 120);
	}
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

	<div class="card bg-base-100 border-base-200/70 rounded-box border shadow">
		<div class="card-body p-2">
			{#if !hasLinks}
				<p class="text-base-content/40 p-3 text-sm">リンクはありません</p>
			{:else}
				{#if mixedLinks.length > 0}
					<ul class="divide-base-200/60 divide-y">
						{#each mixedLinks as link (link.id)}
							{@const s = snippet(link.content)}
							<li>
								<a
									href={`/home/note/${link.id}`}
									class="hover:bg-base-200/60 flex items-center gap-2 rounded-lg px-3 py-2.5 transition-colors"
								>
									<div class="min-w-0 flex-1">
										<span class="link-hover text-sm font-medium">{link.title || '無題'}</span>
										{#if s}
											<p class="text-base-content/50 mt-0.5 line-clamp-2 text-xs">{s}</p>
										{/if}
									</div>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="text-base-content/30 h-4 w-4 shrink-0"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M9 5l7 7-7 7"
										/>
									</svg>
								</a>
							</li>
						{/each}
					</ul>
				{/if}

				{#if twoHopLinks.length > 0}
					<div class="mt-1">
						<h3 class="text-base-content/40 px-3 pb-1 text-xs font-semibold tracking-wider">
							2ホップリンク
						</h3>
						<ul class="divide-base-200/60 divide-y">
							{#each twoHopLinks as link (link.id)}
								{@const s = snippet(link.content)}
								<li>
									<a
										href={`/home/note/${link.id}`}
										class="hover:bg-base-200/60 flex items-center gap-2 rounded-lg px-3 py-2.5 transition-colors"
									>
										<div class="min-w-0 flex-1">
											<span class="link-hover text-sm">{link.title || '無題'}</span>
											{#if s}
												<p class="text-base-content/50 mt-0.5 line-clamp-2 text-xs">{s}</p>
											{/if}
										</div>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="text-base-content/30 h-4 w-4 shrink-0"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M9 5l7 7-7 7"
											/>
										</svg>
									</a>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			{/if}
		</div>
	</div>
</div>
