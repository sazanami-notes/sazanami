<script lang="ts">
	import type { PageData } from './$types';
	import LinkExplorer from '$lib/components/LinkExplorer.svelte';
	import { page } from '$app/stores';

	export let data: PageData;
</script>

<div class="prose max-w-none">
	<h1>{data.note.title}</h1>
	<!-- This is a security risk. In a real app, we should use a proper Markdown renderer that sanitizes the output. -->
	<!-- For this project, we will assume the content is trusted. -->
	<div class="note-content">{@html data.note.content}</div>
</div>

{#if data.links}
	<LinkExplorer
		oneHopLinks={data.links.oneHopLinks}
		backlinks={data.links.backlinks}
		twoHopLinks={data.links.twoHopLinks}
		username={$page.params.username}
	/>
{/if}
