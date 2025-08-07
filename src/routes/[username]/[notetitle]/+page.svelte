<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<div class="prose max-w-none">
	<h1>{data.note.title}</h1>
	<div class="note-content">{data.note.content}</div>
</div>
