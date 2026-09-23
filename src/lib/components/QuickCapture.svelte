<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { Note } from '$lib/types';

	let { oncreated }: { oncreated?: (note: Note) => void } = $props();

	let text = $state('');
	let busy = $state(false);

	async function submit() {
		const value = text.trim();
		if (!value || busy) return;
		busy = true;
		try {
			const res = await fetch('/api/notes', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content: value })
			});
			if (res.ok) {
				const note = (await res.json()) as Note;
				text = '';
				// 親へ即時反映（楽観的更新）
				oncreated?.(note);
				// 一覧の再取得は裏で実行（体感をブロックしない）
				invalidateAll().catch(() => {});
			}
		} catch (e) {
			console.error('Quick capture error:', e);
		} finally {
			busy = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
			e.preventDefault();
			submit();
		}
	}
</script>

<div class="card bg-base-200 shadow-sm">
	<div class="card-body p-4">
		<div class="mb-1 flex items-center gap-2">
			<span class="badge badge-neutral badge-sm">✍️ クイックキャプチャ</span>
			<span class="text-xs opacity-50">書いてEnterで保存</span>
		</div>
		<input
			class="input input-bordered w-full"
			type="text"
			placeholder="今の考えを1行で…"
			bind:value={text}
			onkeydown={handleKeydown}
			disabled={busy}
		/>
	</div>
</div>
