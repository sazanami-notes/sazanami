<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';

	export let data: PageData;
</script>

<div class="max-w-4xl mx-auto p-4">
	<h1 class="text-2xl font-bold mb-4">Edit Note</h1>
	<form method="post" use:enhance>
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
			<textarea
				id="content"
				name="content"
				rows="20"
				class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
			>{data.note.content}</textarea>
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