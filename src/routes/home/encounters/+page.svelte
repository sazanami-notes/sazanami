<script lang="ts">
	import EncounterCard from '$lib/components/EncounterCard.svelte';
	import type { EncounterNote } from '$lib/components/EncounterCard.svelte';

	let { data }: { data: { encounter: EncounterNote | null } } = $props();
</script>

<div class="container mx-auto px-4 py-8">
	<div class="mx-auto max-w-2xl">
		<h1 class="mb-4 text-2xl font-bold">🔮 出会い</h1>
		<p class="mb-4 text-sm opacity-60">
			古いメモと再会するページ。今日の出会いは1日1回、ここから見つけられる。
		</p>
		<EncounterCard initial={data.encounter} />
	</div>
</div>