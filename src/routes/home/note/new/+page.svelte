<script lang="ts">
	import { page } from '$app/stores';
	import MilkdownEditor from '$lib/components/MilkdownEditor.svelte';

	// Use page store instead of data prop
	const userData = $page.data.user;

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

		try {
			// Submit the form manually with credentials included
			const response = await fetch(form.action, {
				method: form.method,
				body: formData,
				credentials: 'include' // Important for sending cookies
			});

			if (response.redirected) {
				console.log('Redirecting to:', response.url);
				window.location.href = response.url;
			} else if (response.ok) {
				// If response is OK but not redirected, try to parse JSON
				try {
					const data = await response.json();
					console.log('Form submission successful:', data);

					// If we have a redirect URL in the response, use it
					if (data.redirectTo) {
						window.location.href = data.redirectTo;
						return false;
					}

					// Otherwise redirect to user's page
					window.location.href = `/${userData.name}`;
				} catch {
					console.log('Response was not JSON, redirecting to user page');
					window.location.href = `/${userData.name}`;
				}
			} else {
				console.error('Form submission failed:', response.status);
				const errorText = await response.text();
				console.error('Error details:', errorText);
				alert(`Failed to create note (${response.status}). Please try again.`);
			}
		} catch (error) {
			console.error('Exception during form submission:', error);
			alert('Network error while creating note. Please try again.');
		}

		return false; // Prevent default form submission
	};
</script>

<div class="mx-auto max-w-2xl p-4">
	<h1 class="mb-4 text-2xl font-bold">New Note</h1>
	<form method="post" on:submit|preventDefault={handleSubmit}>
		<div class="mb-4">
			<label for="title" class="mb-1 block text-sm font-medium">Title</label>
			<input
				type="text"
				id="title"
				name="title"
				bind:value={title}
				placeholder="Title"
				class="focus:ring-primary focus:border-primary w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none"
				required
			/>
		</div>

		<div class="mb-4">
			<label for="content" class="mb-1 block text-sm font-medium">Content</label>
			<div class="h-96 w-full">
				<MilkdownEditor {content} onChange={handleContentChange} />
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
