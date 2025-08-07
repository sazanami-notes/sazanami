<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { Note } from '$lib/types';
	import { generateSlug } from '$lib/utils/slug';
	import { get } from 'svelte/store';

	let title = '';
	let content = '';
	let isPublic = false;
	let tags: string[] = [];

	const handleSubmit = async () => {
		const slug = generateSlug(title);
		const sessionData = get(page).data;

		const note: Note = {
			id: '',
			userId: sessionData.session?.user?.id || '',
			title,
			content,
			createdAt: new Date(),
			updatedAt: new Date(),
			isPublic,
			tags,
			slug
		};

		// API call to create note would go here
		await goto(`/notes/${note.id}/${slug}`);
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
		<textarea
			bind:value={content}
			placeholder="Content (Markdown)"
			class="mb-4 h-64 w-full rounded border p-2"
			required
		></textarea>
		<div class="mb-4 flex items-center">
			<input type="checkbox" bind:checked={isPublic} id="isPublic" class="mr-2" />
			<label for="isPublic">Public</label>
		</div>
		<button type="submit" class="btn btn-primary">Create Note</button>
	</form>
</div>
