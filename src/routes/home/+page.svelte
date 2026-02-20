<script lang="ts">
	import type { PageData } from './$types';
	import MilkdownEditor from '$lib/components/MilkdownEditor.svelte';
	import { invalidateAll } from '$app/navigation';
	import TimelinePost from '$lib/components/TimelinePost.svelte';
	import type { Note } from '$lib/types';
	import EditNoteModal from '$lib/components/EditNoteModal.svelte';

	let { data } = $props();

	let newPostContent = $state('');
	let editingNote: Note | null = $state(null);
	let isSavingNote = $state(false);

	const notes = $derived(data.notes || []);

	async function handleSubmitPost() {
		if (!newPostContent.trim()) {
			return;
		}

		try {
			const response = await fetch('/api/notes', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					content: newPostContent
				})
			});

			if (response.ok) {
				newPostContent = '';
				await invalidateAll(); // データ再読み込み
			} else {
				console.error('Failed to submit post:', await response.text());
			}
		} catch (error) {
			console.error('Error submitting post:', error);
		}
	}

	function handleEdit(event: CustomEvent<Note>) {
		console.log('Edit event received:', event.detail);
		editingNote = event.detail;
		console.log('editingNote set to:', editingNote);
	}

	function handleCancelEdit() {
		editingNote = null;
	}

	async function handleSaveEdit(event: CustomEvent<{ title: string; content: string }>) {
		if (!editingNote) return;

		isSavingNote = true;
		try {
			const { title, content } = event.detail;
			const response = await fetch(`/api/notes/${editingNote.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title, content })
			});

			if (response.ok) {
				editingNote = null;
				await invalidateAll();
			} else {
				alert('ノートの保存に失敗しました。');
				console.error('Failed to save note', await response.text());
			}
		} catch (error) {
			alert('エラーが発生しました。');
			console.error('Error saving note', error);
		} finally {
			isSavingNote = false;
		}
	}
</script>

<div class="container mx-auto px-4 py-8">
	<!-- Post Input Area -->
	<div class="mx-auto mb-8 max-w-2xl">
		<div class="card bg-base-200 p-4">
			<div class="max-h-48 overflow-y-auto">
				<MilkdownEditor
					bind:content={newPostContent}
					editable={true}
					placeholder="いまどうしてる？"
				/>
			</div>
			<div class="card-actions mt-4 justify-end">
				<button onclick={handleSubmitPost} class="btn btn-primary">ポスト</button>
			</div>
		</div>
	</div>

	<!-- Timeline Feed -->
	<div class="mx-auto max-w-2xl">
		<div class="flex flex-col space-y-4">
			{#each notes as note (note.id)}
				<TimelinePost {note} on:edit={handleEdit} />
			{:else}
				<p class="text-center text-base-content text-opacity-60">
					タイムラインにはまだ何もありません。
				</p>
			{/each}
		</div>
	</div>
</div>

<EditNoteModal
	note={editingNote}
	on:save={handleSaveEdit}
	on:cancel={handleCancelEdit}
	saving={isSavingNote}
/>
