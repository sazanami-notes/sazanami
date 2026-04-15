<script lang="ts">
	import TimelinePost from '$lib/components/TimelinePost.svelte';
	import type { Note } from '$lib/types';
	import NoteModal from '$lib/components/NoteModal.svelte';
	import SortSelector from '$lib/components/SortSelector.svelte';
	import { sortNotes, type SortKey } from '$lib/utils/note-utils';

	type SearchPageData = {
		notes: Note[];
		q: string;
		pagination: {
			page: number;
			limit: number;
			total: number;
			totalPages: number;
		};
	};

	let { data }: { data: SearchPageData } = $props();

	let editingNoteId: string | null = $state(null);
	let sortKey: SortKey = $state('updatedAt_desc');

	const rawNotes = $derived(data.notes || []);
	const notes = $derived(sortNotes(rawNotes, sortKey));
	const hasQuery = $derived(data.q.trim().length > 0);
	const hasPrev = $derived(data.pagination.page > 1);
	const hasNext = $derived(data.pagination.page < data.pagination.totalPages);

	function handleEdit(event: CustomEvent<Note>) {
		editingNoteId = event.detail.id;
	}

	function handleCloseEdit() {
		editingNoteId = null;
	}

	function handleSort(event: CustomEvent<SortKey>) {
		sortKey = event.detail;
	}

	function buildPageLink(nextPage: number) {
		const params = new URLSearchParams();
		if (data.q) {
			params.set('q', data.q);
		}
		params.set('page', String(nextPage));
		return `/home/search?${params.toString()}`;
	}
</script>

<div class="container mx-auto px-4 py-8">
	<div class="mx-auto max-w-2xl">
		<div class="mb-4 flex items-center justify-between gap-4">
			<div>
				<h1 class="text-2xl font-bold">検索結果</h1>
				{#if hasQuery}
					<p class="text-base-content/70 mt-1 text-sm">
						「{data.q}」の検索結果: {data.pagination.total}件
					</p>
				{:else}
					<p class="text-base-content/70 mt-1 text-sm">検索キーワードを入力してください。</p>
				{/if}
			</div>
			<SortSelector bind:value={sortKey} on:sort={handleSort} />
		</div>

		<div class="flex flex-col space-y-4">
			{#if !hasQuery}
				<p class="text-base-content text-center text-opacity-60">
					ヘッダーの検索バーからキーワードを入力すると結果が表示されます。
				</p>
			{:else}
				{#each notes as note (note.id)}
					<TimelinePost {note} on:edit={handleEdit} />
				{:else}
					<p class="text-base-content text-center text-opacity-60">
						一致するメモは見つかりませんでした。
					</p>
				{/each}
			{/if}
		</div>

		{#if hasQuery && data.pagination.totalPages > 1}
			<div class="mt-6 flex items-center justify-center gap-2">
				{#if hasPrev}
					<a class="btn btn-sm" href={buildPageLink(data.pagination.page - 1)}>前へ</a>
				{/if}
				<span class="text-base-content/70 text-sm">
					{data.pagination.page} / {data.pagination.totalPages}
				</span>
				{#if hasNext}
					<a class="btn btn-sm" href={buildPageLink(data.pagination.page + 1)}>次へ</a>
				{/if}
			</div>
		{/if}
	</div>
</div>

<NoteModal noteId={editingNoteId} onclose={handleCloseEdit} />
