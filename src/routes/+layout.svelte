<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { theme } from '$lib/stores/theme';
	import '../app.css';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import type { LayoutData } from './$types';
	import { invalidateAll, goto } from '$app/navigation';
	import { authClient } from '$lib/auth-client';

	let { children, data }: { children: Snippet; data: LayoutData } = $props();

	let drawerChecked = $state(false);
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
		drawerChecked = false;

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
	<input id="main-menu-drawer" type="checkbox" class="drawer-toggle" bind:checked={drawerChecked} />
	<div class="drawer-content bg-base-300 flex min-h-screen flex-col items-center">
		<div class="bg-base-100 relative flex h-[100dvh] w-full max-w-md flex-col shadow-xl">
			<Header user={data.user} />

			<main class="relative w-full flex-grow overflow-y-auto">
				{@render children()}
			</main>

			<Footer />

			<a
				href="/home/note/new"
				class="btn btn-circle btn-primary btn-lg absolute right-4 bottom-20 z-20 shadow-lg"
				aria-label="Create Note"
			>
				<!-- add -->
				<svg
					xmlns="http://www.w3.org/2000/svg"
					height="24"
					viewBox="0 0 24 24"
					width="24"
					fill="currentColor"
				>
					<path d="M0 0h24v24H0V0z" fill="none" />
					<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
				</svg>
			</a>
		</div>
	</div>
	<div class="drawer-side z-30">
		<label for="main-menu-drawer" aria-label="close sidebar" class="drawer-overlay"></label>
		<ul class="menu bg-base-200 text-base-content min-h-full w-80 p-4">
			{#if data.user}
				<li><a href="/home">タイムライン</a></li>
				<li><a href="/home/box">ノート一覧</a></li>
				<li><a href="/home/archive">アーカイブ</a></li>
				<li><a href="/home/trash">ゴミ箱</a></li>
				<div class="divider"></div>
				<li><a href="/settings/account">アカウント設定</a></li>
				<li><a href="/settings/import">インポート</a></li>
			{/if}
			<div class="divider"></div>
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
					<button class="btn btn-ghost" onclick={handleAuthClick}>Sign out</button>
				{:else}
					<button class="btn btn-ghost" onclick={handleAuthClick}>Sign in</button>
				{/if}
			</li>
		</ul>
	</div>
</div>
<audio bind:this={audioElement} src="/sazanami-loop.mp3" loop></audio>
