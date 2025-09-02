<script lang="ts">
	import type { Snippet } from 'svelte';
	import { theme } from '$lib/stores/theme';
	import '../app.css';
	import Header from '$lib/components/Header.svelte';
	import type { LayoutData } from './$types';

	import { browser } from '$app/environment';
	let { children, data }: { children: Snippet; data: LayoutData } = $props();

	let waveSoundEnabled = $state(false);
	let audioElement: HTMLAudioElement;

	$effect(() => {
		if (audioElement) {
			if (waveSoundEnabled) {
				audioElement.play().catch((e) => {
					console.error('Failed to play wave sound:', e);
				});
			} else {
				audioElement.pause();
			}
		}
	});

	function toggleTheme() {
		theme.update((current) => (current === 'sazanami-night' ? 'sazanami-days' : 'sazanami-night'));
	}

	$effect(() => {
		if (browser) {
			document.documentElement.setAttribute('data-theme', $theme);
		}
	});
</script>

<div class="drawer">
	<input id="main-menu-drawer" type="checkbox" class="drawer-toggle" />
	<div class="drawer-content flex flex-col">
		<Header session={data.session} user={data.user} />

		<main class="bg-base-300 rounded-box mx-auto my-10 h-[80vh] w-2/3 shadow-xl">
			{@render children()}
		</main>
	</div>
	<div class="drawer-side z-10">
		<label for="main-menu-drawer" aria-label="close sidebar" class="drawer-overlay"></label>
		<ul class="menu bg-base-200 text-base-content min-h-full w-80 p-4">
			{#if data.user}
				<li><a href="/settings/account">Account</a></li>
			{/if}
			<li>
				<div class="flex justify-between">
					<span>Wave Sound</span>
					<input type="checkbox" class="toggle" bind:checked={waveSoundEnabled} />
				</div>
			</li>
			<li>
				<label class="flex cursor-pointer justify-between">
					<span class="label-text">Dark Mode</span>
					<input
						type="checkbox"
						class="toggle"
						checked={$theme === 'sazanami-night'}
						on:change={toggleTheme}
					/>
				</label>
			</li>
		</ul>
	</div>
</div>
<audio bind:this={audioElement} src="/sazanami-loop.mp3" loop></audio>
