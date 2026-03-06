<script lang="ts">
	type Link = {
		id: string;
		title: string;
		slug: string;
	};

	let {
		oneHopLinks = [],
		backlinks = [],
		twoHopLinks = []
	}: {
		oneHopLinks?: Link[];
		backlinks?: Link[];
		twoHopLinks?: Link[];
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

	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#if backlinks.length > 0}
			<div class="bg-base-200 rounded-lg p-3">
				<h3
					class="text-base-content/50 mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase"
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
				<ul class="space-y-1">
					{#each backlinks as link (link.id)}
						<li>
							<a
								href="/home/note/{link.id}"
								class="text-primary hover:bg-base-300 flex items-center gap-1.5 rounded px-1 py-0.5 text-sm transition-colors"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-3 w-3 shrink-0 opacity-60"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
									/>
								</svg>
								<span class="truncate">{link.title}</span>
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		{#if oneHopLinks.length > 0}
			<div class="bg-base-200 rounded-lg p-3">
				<h3
					class="text-base-content/50 mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase"
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
				<ul class="space-y-1">
					{#each oneHopLinks as link (link.id)}
						<li>
							<a
								href="/home/note/{link.id}"
								class="text-primary hover:bg-base-300 flex items-center gap-1.5 rounded px-1 py-0.5 text-sm transition-colors"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-3 w-3 shrink-0 opacity-60"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
									/>
								</svg>
								<span class="truncate">{link.title}</span>
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		{#if twoHopLinks.length > 0}
			<div class="bg-base-200/60 rounded-lg p-3">
				<h3
					class="text-base-content/40 mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase"
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
				<ul class="space-y-1">
					{#each twoHopLinks as link (link.id)}
						<li>
							<a
								href="/home/note/{link.id}"
								class="text-base-content/50 hover:bg-base-300 hover:text-primary flex items-center gap-1.5 rounded px-1 py-0.5 text-sm transition-colors"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-3 w-3 shrink-0 opacity-60"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
									/>
								</svg>
								<span class="truncate">{link.title}</span>
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
</div>
