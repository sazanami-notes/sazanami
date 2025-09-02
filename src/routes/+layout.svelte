<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { theme } from '$lib/stores/theme';
	import '../app.css';
	import Header from '$lib/components/Header.svelte';
	import type { LayoutData } from './$types';
	import { invalidateAll, goto } from '$app/navigation';
	import { authClient } from '$lib/auth-client';

	let { children, data }: { children: Snippet; data: LayoutData } = $props();

	let waveSoundEnabled = $state(false);
	let audioElement: HTMLAudioElement;
	let isDarkMode = $state($theme === 'sazanami-night');

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

	$effect(() => {
		$theme = isDarkMode ? 'sazanami-night' : 'sazanami-days';
	});

	onMount(() => {
		const unsubscribe = theme.subscribe((value) => {
			document.documentElement.setAttribute('data-theme', value);
		});

		return unsubscribe;
	});

	const handleAuthClick = async () => {
		if (data.session) {
			// User is logged in, perform logout
			await authClient.signOut({
				fetchOptions: {
					onSuccess: () => {
						goto('/login'); // ログアウト後にログインページへ遷移
					}
				}
			});
			await invalidateAll(); // Invalidate all data to reflect logout
		} else {
			// User is not logged in, navigate to login page
			goto('/login'); // gotoを使用
		}
	};
</script>

<div class="drawer">
	<input id="main-menu-drawer" type="checkbox" class="drawer-toggle" />
	<div class="drawer-content flex flex-col">
		<Header session={data.session} user={data.user} />

		<main
			class="bg-base-300 rounded-box my-4 w-full shadow-xl md:mx-auto md:my-10 md:w-2/3 min-h-[80vh]"
		>
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
					<input type="checkbox" class="toggle" bind:checked={isDarkMode} />
				</label>
			</li>
			<li>
				{#if data.session}
					<button class="btn btn-ghost" on:click={handleAuthClick}>Sign out</button>
				{:else}
					<button class="btn btn-ghost" on:click={handleAuthClick}>Sign in</button>
				{/if}
			</li>
		</ul>
	</div>
</div>
<audio bind:this={audioElement} src="/sazanami-loop.mp3" loop></audio>
