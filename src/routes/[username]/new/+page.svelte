<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import type { PageData } from './$types';
	import MilkdownEditor from '$lib/components/MilkdownEditor.svelte';
	
	export let data: PageData;
	
	let title = '';
	let content = '';
	let isPublic = false;
	
	const handleContentChange = (value: string) => {
		console.log('Content changed:', value.substring(0, 50) + '...');
		content = value;
	};
	
	const handleSubmit = async (event: SubmitEvent) => {
		console.log('Form submitted');
		const form = event.target as HTMLFormElement;
		const formData = new FormData(form);
		
		// Replace the content from the textarea with our Milkdown content
		formData.set('content', content);
		formData.set('isPublic', isPublic ? 'on' : 'off');
		
		console.log('Submitting form with title:', title, 'Content length:', content.length);
		
		// Submit the form manually
		const response = await fetch(form.action, {
			method: form.method,
			body: formData
		});
		
		if (response.redirected) {
			console.log('Redirecting to:', response.url);
			window.location.href = response.url;
		} else {
			console.error('Form submission failed:', response.status);
			alert('Failed to create note. Please try again.');
		}
		
		return false; // Prevent default form submission
	};
</script>

<div class="mx-auto max-w-2xl p-4">
	<h1 class="mb-4 text-2xl font-bold">New Note</h1>
	<form method="post" on:submit|preventDefault={handleSubmit}>
		<div class="mb-4">
			<label for="title" class="block text-sm font-medium mb-1">Title</label>
			<input
				type="text"
				id="title"
				name="title"
				bind:value={title}
				placeholder="Title"
				class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
				required
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
		
		<div class="mb-4 flex items-center">
			<input type="checkbox" bind:checked={isPublic} id="isPublic" name="isPublic" class="mr-2" />
			<label for="isPublic">Public</label>
		</div>
		
		<button type="submit" class="btn btn-primary">Create Note</button>
	</form>
</div>
