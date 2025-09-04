<script lang="ts">
	import type { PageData } from './$types';
	import LinkExplorer from '$lib/components/LinkExplorer.svelte';
	import MilkdownEditor from '$lib/components/MilkdownEditor.svelte';
	import { enhance } from '$app/forms';

	export let data: PageData;

	let content = data.note.content;

	const handleContentChange = (event: CustomEvent<{ markdown: string }>) => {
		content = event.detail.markdown;
	};
</script>

<form method="post" use:enhance class="prose max-w-none">
	<div class="mb-4">
		<input
			type="text"
			id="title"
			name="title"
			value={data.note.title}
			class="focus:ring-primary focus:border-primary w-full rounded-md border border-gray-300 px-3 py-2 text-2xl font-bold shadow-sm focus:outline-none"
		/>
	</div>

	<div class="mb-4">
		<div class="h-96 w-full">
			{#key data.note.id}
				<MilkdownEditor initialContent={content} on:change={handleContentChange} />
			{/key}
		</div>
		<!-- Hidden textarea to maintain compatibility with the form -->
		<textarea id="content" name="content" class="hidden">{content}</textarea>
	</div>

	<div class="flex justify-end space-x-2">
		<button type="submit" class="btn btn-primary"> Save Changes </button>
	</div>
</form>

{#if data.links}
	<div class="mt-8">
		<LinkExplorer
			oneHopLinks={data.links.oneHopLinks}
			backlinks={data.links.backlinks}
			twoHopLinks={data.links.twoHopLinks}
		/>
	</div>
{/if}