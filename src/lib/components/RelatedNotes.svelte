<script lang="ts">
	import type { Note } from '$lib/types';
	import MemoCard from './MemoCard.svelte';

	let { noteId }: { noteId: string } = $props();

	type RelatedNote = Note & { score: number; distance: number };

	let related = $state<RelatedNote[]>([]);
	let loading = $state(true);
	let fetchedFor = '';

	$effect(() => {
		if (!noteId || fetchedFor === noteId) return;
		fetchedFor = noteId;
		loading = true;
		related = [];

		(async () => {
			try {
				const res = await fetch(`/api/notes/${noteId}/related?limit=6`);
				const data = res.ok ? ((await res.json()) as { related?: RelatedNote[] }) : { related: [] };
				related = data.related ?? [];
			} catch {
				related = [];
			} finally {
				loading = false;
			}
		})();
	});
</script>

{#if loading}
	<div class="mt-8 pb-24">
		<h2 class="text-base-content/60 mb-3 flex items-center gap-2 text-sm font-semibold">
			🧭 意味が近いノート
		</h2>
		<p class="text-base-content/40 text-sm">探しています…</p>
	</div>
{:else if related.length > 0}
	<div class="mt-8 pb-24">
		<h2 class="text-base-content/60 mb-3 flex items-center gap-2 text-sm font-semibold">
			🧭 意味が近いノート
			<span class="text-base-content/40 font-normal">{related.length}</span>
		</h2>
		<div class="grid grid-cols-2 gap-3 md:grid-cols-3">
			{#each related as item (item.id)}
				<div class="relative">
					<MemoCard note={item} linkToDetail={true} />
					<span
						class="badge badge-sm bg-base-200/90 absolute top-2 right-2 border-0 font-mono"
						title="意味の近さ（コサイン類似度）"
					>
						{Math.round(item.score * 100)}%
					</span>
				</div>
			{/each}
		</div>
	</div>
{/if}
