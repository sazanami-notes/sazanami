<script lang="ts">
	type Link = {
		id: string;
		title: string;
		slug: string;
	};

	export let oneHopLinks: Link[] = [];
	export let backlinks: Link[] = [];
	export let twoHopLinks: Link[] = [];
</script>

<div class="link-explorer mt-8 border-t pt-4">
	<h2 class="mb-4 text-xl font-semibold">Link Explorer</h2>

	{#if oneHopLinks.length === 0 && backlinks.length === 0 && twoHopLinks.length === 0}
		<p class="text-gray-500">No links found.</p>
	{/if}

	{#if oneHopLinks.length > 0}
		<div class="mb-6">
			<h3 class="mb-2 text-lg font-medium text-gray-700">1-Hop Links</h3>
			<ul class="list-inside list-disc space-y-1">
				{#each oneHopLinks as link (link.id)}
					<li>
						<a href="/home/note/{link.id}" class="text-blue-600 hover:underline">
							{link.title}
						</a>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	{#if backlinks.length > 0}
		<div class="mb-6">
			<h3 class="mb-2 text-lg font-medium text-gray-700">Backlinks</h3>
			<ul class="list-inside list-disc space-y-1">
				{#each backlinks as link (link.id)}
					<li>
						<a href="/home/note/{link.id}" class="text-blue-600 hover:underline">
							{link.title}
						</a>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	{#if twoHopLinks.length > 0}
		<div>
			<h3 class="mb-2 text-lg font-medium text-gray-700">2-Hop Links</h3>
			<ul class="list-inside list-disc space-y-1">
				{#each twoHopLinks as link (link.id)}
					<li>
						<a href="/home/note/{link.id}" class="text-blue-600 hover:underline">
							{link.title}
						</a>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
