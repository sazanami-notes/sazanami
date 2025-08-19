<script lang="ts">
	import { onMount } from 'svelte';
	import { theme } from '$lib/stores/theme';
	import '../app.css';
	import Header from '$lib/components/Header.svelte';
	import type { LayoutData } from './$types';

	let { children, data }: { children: any; data: LayoutData } = $props();

	onMount(() => {
		const unsubscribe = theme.subscribe((value) => {
			document.documentElement.setAttribute('data-theme', value);
		});

		return unsubscribe;
	});
</script>

<Header session={data.session} user={data.user} />

<div class="bg-base-300 rounded-box mx-auto my-10 h-[80vh] w-2/3 shadow-xl">
	{@render children()}
</div>
