<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { Note } from '$lib/types';
	import { generateSlug } from '$lib/utils/slug';
	import MilkdownEditor from '$lib/components/MilkdownEditor.svelte';

	let title = '';
	let content = '';
	let isPublic = false;
	let tags: string[] = [];

	const handleContentChange = (value: string) => {
		content = value;
	};

	const handleSubmit = async () => {
		const slug = generateSlug(title);
		const userData = $page.data.user;

		if (!userData || !userData.id) {
			console.error('User data not available');
			return;
		}

		try {
			const response = await fetch('/api/notes', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					title,
					content,
					isPublic,
					tags
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Failed to create note');
			}

			const newNote = await response.json();
			await goto(`/${userData.name}/${newNote.slug || slug}`);
		} catch (error) {
			console.error('Error creating note:', error);
			alert('Failed to create note. Please try again.');
		}
	};
</script>

<div class="mx-auto max-w-2xl p-4">
	<h1 class="mb-4 text-2xl font-bold">New Note</h1>
	<form on:submit|preventDefault={handleSubmit}>
		<input
			type="text"
			bind:value={title}
			placeholder="Title"
			class="mb-4 w-full rounded border p-2"
			required
		/>
		<div class="mb-4 h-64 w-full">
			<MilkdownEditor content={content} onChange={handleContentChange} />
		</div>
		<div class="mb-4 flex items-center">
			<input type="checkbox" bind:checked={isPublic} id="isPublic" class="mr-2" />
			<label for="isPublic">Public</label>
		</div>
		<button type="submit" class="btn btn-primary">Create Note</button>
	</form>
</div>
