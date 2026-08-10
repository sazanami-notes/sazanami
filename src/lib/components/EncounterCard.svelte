<script lang="ts">
	import { goto } from '$app/navigation';

	export interface EncounterNote {
		id: string;
		title: string;
		content: string | null;
		slug: string;
		createdAt: string;
		encounterCount: number;
		encounterBoost: number;
	}

	let { initial }: { initial: EncounterNote | null } = $props();

	let encounter: EncounterNote | null = $state(initial);
	let busy = $state(false);

	function excerpt(content: string | null): string {
		if (!content) return '';
		const text = content.replace(/[#*`[\]()>~_]/g, ' ').replace(/\s+/g, ' ').trim();
		return text.length > 80 ? text.slice(0, 80) + '…' : text;
	}

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('ja-JP', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	async function fetchNext() {
		busy = true;
		try {
			const res = await fetch('/api/notes/encounter');
			if (!res.ok) throw new Error('Failed to fetch encounter');
			const data = (await res.json()) as { note: EncounterNote | null };
			encounter = data.note;
		} catch (e) {
			console.error('Encounter fetch error:', e);
		} finally {
			busy = false;
		}
	}

	async function sendFeedback(action: 'like' | 'skip') {
		if (!encounter) return;
		busy = true;
		try {
			await fetch(`/api/notes/${encounter.id}/encounter-feedback`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action })
			});
			await fetchNext();
		} catch (e) {
			console.error('Encounter feedback error:', e);
		} finally {
			busy = false;
		}
	}
</script>

<div class="card bg-base-200 shadow-sm">
	<div class="card-body p-4">
		<div class="mb-1 flex items-center justify-between">
			<span class="badge badge-primary badge-sm">🔮 出会い</span>
			{#if encounter && encounter.encounterCount > 0}
				<span class="text-xs opacity-60">{encounter.encounterCount}回目の出会い</span>
			{/if}
		</div>

		{#if encounter}
			{@const e = encounter}
			<button
				class="text-left"
				onclick={() => goto(`/home/note/${e.id}`)}
				disabled={busy}
			>
				<h3 class="text-lg font-bold">{e.title || '無題'}</h3>
				{#if excerpt(e.content)}
					<p class="mt-1 line-clamp-2 text-sm opacity-80">{excerpt(e.content)}</p>
				{/if}
				<p class="mt-1 text-xs opacity-60">{formatDate(e.createdAt)}</p>
			</button>

			<div class="card-actions mt-3 justify-end">
				<button
					class="btn btn-ghost btn-xs"
					onclick={() => sendFeedback('skip')}
					disabled={busy}
				>
					スルー
				</button>
				<button
					class="btn btn-primary btn-xs"
					onclick={() => sendFeedback('like')}
					disabled={busy}
				>
					また会いたい
				</button>
				<button class="btn btn-outline btn-xs" onclick={fetchNext} disabled={busy}>
					次の出会い
				</button>
			</div>
		{:else}
			<p class="text-sm opacity-60">今日の出会いはおしまい。また明日、古いメモに会いに行こう。</p>
		{/if}
	</div>
</div>
