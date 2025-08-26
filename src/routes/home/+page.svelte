<script lang="ts">
	import { page } from '$app/stores';
	import { get } from 'svelte/store';
	import type { Note } from '$lib/types';
	import MilkdownEditor from '$lib/components/MilkdownEditor.svelte';
	import PostCard from '$lib/components/PostCard.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import TagFilter from '$lib/components/TagFilter.svelte';
	import { onMount } from 'svelte';

	let notes: Note[] = [];
	let allTags: string[] = [];
	let filteredNotes: Note[] = [];
	let searchQuery = '';
	let selectedTags: string[] = [];
	let newPostContent = '';

	// Load initial data
	onMount(() => {
		const pageData = get(page).data;
		notes = (pageData.notes || []) as Note[];
		allTags = pageData.allTags || [];
		filterNotes();
	});

	// Filter notes when search or tags change
	$: {
		filterNotes();
	}

	function filterNotes() {
		const notesStore = notes || [];
		const filtered = notesStore.filter((note: Note) => {
			const matchesTitle = note.title?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
			const matchesContent = note.content
				? note.content.toLowerCase().includes(searchQuery.toLowerCase())
				: false;
			const matchesSearch = matchesTitle || matchesContent;

			const matchesTags =
				selectedTags.length === 0 || selectedTags.every((tag) => note.tags?.includes(tag));
			return matchesSearch && matchesTags;
		});
		filteredNotes = filtered;
	}

	function handleSearch(event: CustomEvent<string>) {
		searchQuery = event.detail;
	}

	function handleTagSelect(event: CustomEvent<string[]>) {
		selectedTags = event.detail;
	}

	async function handleSubmitPost() {
		if (!newPostContent.trim()) {
			return; // Don't submit empty content
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
				const newNote = await response.json();
				// Add new note to the top of the list
				notes = [newNote, ...notes];
				newPostContent = ''; // Clear the editor
				// We might need to re-fetch or update the editor's content prop
			} else {
				console.error('Failed to submit post:', await response.text());
			}
		} catch (error) {
			console.error('Error submitting post:', error);
		}
	}

	async function updateNoteStatus(noteId: string, status: 'archived' | 'box') {
		try {
			const response = await fetch(`/api/notes/${noteId}/status`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status })
			});
			if (response.ok) {
				// Remove the note from the local list for immediate UI update
				notes = notes.filter((n) => n.id !== noteId);
			} else {
				console.error(`Failed to move note to ${status}:`, await response.text());
			}
		} catch (error) {
			console.error(`Error moving note to ${status}:`, error);
		}
	}

	function handleArchive(event: CustomEvent<string>) {
		updateNoteStatus(event.detail, 'archived');
	}

	function handleBox(event: CustomEvent<string>) {
		updateNoteStatus(event.detail, 'box');
	}

	async function handlePin(event: CustomEvent<string>) {
		const noteId = event.detail;
		try {
			const response = await fetch(`/api/notes/${noteId}/pin`, {
				method: 'POST'
			});
			if (response.ok) {
				const data = await response.json();
				// Update the note in the local list
				const noteIndex = notes.findIndex((n) => n.id === noteId);
				if (noteIndex !== -1) {
					notes[noteIndex].isPinned = data.isPinned;
					// Trigger reactivity by reassigning the array
					notes = [...notes];
					// Re-sort notes
					notes.sort((a, b) => {
						if (a.isPinned && !b.isPinned) return -1;
						if (!a.isPinned && b.isPinned) return 1;
						return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
					});
				}
			} else {
				console.error('Failed to pin note:', await response.text());
			}
		} catch (error) {
			console.error('Error pinning note:', error);
		}
	}
</script>

<div class="container mx-auto px-4 py-8">
	<!-- Post Input Area -->
	<div class="mb-8">
		<h1 class="mb-4 text-3xl font-bold">タイムライン</h1>
		<div class="card bg-base-200 p-4">
			<MilkdownEditor bind:content={newPostContent} editable={true} />
			<div class="card-actions mt-4 justify-end">
				<button on:click={handleSubmitPost} class="btn btn-primary">ポスト</button>
			</div>
		</div>
	</div>

	<!-- Filters -->
	<div class="mb-6">
		<SearchBar on:search={handleSearch} />
	</div>
	<div class="mb-6">
		<TagFilter {allTags} on:tagSelect={handleTagSelect} />
	</div>

	<!-- Timeline/Post List -->
	<div class="flex flex-col gap-4">
		{#each filteredNotes as note (note.id)}
			<PostCard {note} on:archive={handleArchive} on:box={handleBox} on:pin={handlePin} />
		{/each}

		{#if filteredNotes.length === 0}
			<div class="py-12 text-center">
				<p class="text-gray-500">ポストが見つかりません</p>
			</div>
		{/if}
	</div>
</div>
