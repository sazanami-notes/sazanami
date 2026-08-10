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

<div class="card bg-base-200 mt-4 shadow-sm">
	<div class="card-body p-4">
		<div class="mb-1 flex items-center gap-2">
			<span class="badge badge-secondary badge-sm">🧠 コンテキスト</span>
			<span class="text-xs opacity-50">後から気づいたことを追記（生メモは書き換えない）</span>
		</div>
		<textarea
			class="textarea textarea-bordered w-full"
			rows={3}
			bind:value={contextText}
			placeholder="例: これは通勤中に思いついた。あとでXXの動画と関連付けて見直したい。"
		></textarea>
		<div class="card-actions justify-end">
			{#if saved}
				<span class="text-xs opacity-60">保存しました</span>
			{/if}
			<button class="btn btn-outline btn-xs" onclick={save} disabled={busy}>
				{busy ? '保存中...' : '保存'}
			</button>
		</div>
	</div>
</div>
