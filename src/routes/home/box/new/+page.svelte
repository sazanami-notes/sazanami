<script lang="ts">
	import { enhance } from '$app/forms';
	import MilkdownEditor from '$lib/components/MilkdownEditor.svelte';

	let title = '';
	let content = '';

	const handleContentChange = (event: CustomEvent<{ markdown: string }>) => {
		content = event.detail.markdown;
	};
</script>

<div class="mx-auto max-w-2xl p-4">
	<h1 class="mb-4 text-2xl font-bold">New Note</h1>
	<form method="post" use:enhance>
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
				<MilkdownEditor initialContent={content} on:change={handleContentChange} />
			</div>
			<textarea id="content" name="content" class="hidden">{content}</textarea>
		</div>

		<button type="submit" class="btn btn-primary">Create Note</button>
	</form>
</div>
