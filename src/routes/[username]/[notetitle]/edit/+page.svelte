<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import MilkdownEditor from '$lib/components/MilkdownEditor.svelte';

	export let data: PageData;
	
	let content = data.note.content;
	
	const handleContentChange = (value: string) => {
		content = value;
	};
	
	const handleSubmit = async (event: SubmitEvent) => {
		const form = event.target as HTMLFormElement;
		const formData = new FormData(form);
		
		// Replace the content from the textarea with our Milkdown content
		formData.set('content', content);
		
		// Submit the form manually
		const response = await fetch(form.action, {
			method: form.method,
			body: formData
		});
		
		if (response.redirected) {
			window.location.href = response.url;
		}
		
		return false; // Prevent default form submission
	};
</script>

<div class="max-w-4xl mx-auto p-4">
	<h1 class="text-2xl font-bold mb-4">Edit Note</h1>
	<form method="post" on:submit|preventDefault={handleSubmit}>
		<div class="mb-4">
			<label for="title" class="block text-sm font-medium mb-1">Title</label>
			<input
				type="text"
				id="title"
				name="title"
				value={data.note.title}
				class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
			/>
		</div>
		<div class="mb-4">
			<label for="content" class="block text-sm font-medium mb-1">Content</label>
			<div class="h-96 w-full">
				<MilkdownEditor content={content} onChange={handleContentChange} />
			</div>
			<!-- Hidden textarea to maintain compatibility with the form -->
			<textarea id="content" name="content" class="hidden">{content}</textarea>
		</div>
		<div class="flex justify-end space-x-2">
			<button
				type="submit"
				class="btn btn-primary"
			>
				Save Changes
			</button>
		</div>
	</form>
</div>