<script lang="ts">
	import '../app.css';
	import Header from '$lib/components/Header.svelte';
	import type { LayoutData } from './$types';

	let { children, data }: { children: any; data: LayoutData } = $props();
</script>

<Header session={data.session} user={data.user} />

<div class="bg-base-300 rounded-box mx-auto my-10 h-[80vh] w-2/3 shadow-xl">
	{@render children()}
</div>
