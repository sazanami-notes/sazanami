<script lang="ts">
	// Layer 1: 人間が後から追記するコンテキスト（生メモ content とは分離・不変の原則）
	let { noteId, initialContext }: { noteId: string; initialContext: string | null } = $props();

	let contextText = $state(initialContext ?? '');
	let busy = $state(false);
	let saved = $state(false);

	async function save() {
		busy = true;
		try {
			const res = await fetch(`/api/notes/${noteId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ context: contextText })
			});
			if (!res.ok) throw new Error('Failed to save context');
			saved = true;
			setTimeout(() => (saved = false), 2000);
		} catch (e) {
			console.error('Context save error:', e);
			alert('コンテキストの保存に失敗しました');
		} finally {
			busy = false;
		}
	}
</script>

<div class="card bg-base-100 border-base-200/70 mt-4 rounded-box border shadow">
	<div class="card-body p-4">
		<div class="mb-2 flex flex-wrap items-center gap-2">
			<span class="badge badge-secondary badge-sm whitespace-nowrap">🧠 コンテキスト</span>
			<span class="text-base-content/50 text-xs">後から気づいたことを追記（生メモは書き換えない）</span>
		</div>
		<textarea
			class="textarea textarea-bordered w-full text-sm"
			rows={3}
			bind:value={contextText}
			placeholder="例: これは通勤中に思いついた。あとでXXの動画と関連付けて見直したい。"
		></textarea>
		<div class="card-actions justify-end">
			{#if saved}
				<span class="text-base-content/60 text-xs">保存しました</span>
			{/if}
			<button class="btn btn-outline btn-sm" onclick={save} disabled={busy}>
				{busy ? '保存中...' : '保存'}
			</button>
		</div>
	</div>
</div>
