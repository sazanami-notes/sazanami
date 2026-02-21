<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import TiptapEditor from '$lib/components/TiptapEditor.svelte';

	// Use page store instead of data prop
	const userData = $page.data.user;

	let title = $state('');
	let content = $state('');
	let isPublic = $state(false);

	const handleContentChange = (value: string) => {
		content = value;
	};

	const handleSubmit = async (event: SubmitEvent) => {
		event.preventDefault();
		console.log('Form submitted');
		const form = event.target as HTMLFormElement;
		const formData = new FormData(form);

		// Replace the content from the textarea with our Tiptap content
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
				} catch (jsonError) {
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

<div class="mx-auto max-w-4xl p-6">
	<h1 class="mb-6 text-3xl font-bold text-gray-800">New Note</h1>
	<form method="post" onsubmit={handleSubmit} class="space-y-6">
		<div>
			<label for="title" class="mb-2 block text-sm font-semibold text-gray-700">Title</label>
			<input
				type="text"
				id="title"
				name="title"
				bind:value={title}
				placeholder="Enter note title..."
				class="focus:border-primary focus:ring-primary block w-full rounded-md border-gray-300 px-4 py-2 shadow-sm sm:text-lg"
			/>
		</div>

		<div>
			<label for="content" class="mb-2 block text-sm font-semibold text-gray-700">Content</label>
			<div class="min-h-[400px] w-full">
				<TiptapEditor bind:content placeholder="Start writing your note here..." />
			</div>
			<!-- Hidden textarea to maintain compatibility with the form -->
			<textarea id="content" name="content" class="hidden">{content}</textarea>
		</div>

		<div class="flex items-center">
			<input
				type="checkbox"
				bind:checked={isPublic}
				id="isPublic"
				name="isPublic"
				class="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
			/>
			<label for="isPublic" class="ml-2 block text-sm text-gray-900">Make this note public</label>
		</div>

		<div class="flex justify-end pt-4">
			<button
				type="submit"
				class="bg-primary hover:bg-primary-focus focus-visible:outline-primary rounded-md px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
			>
				Create Note
			</button>
		</div>
	</form>
</div>
