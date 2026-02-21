<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import '../app.css';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import type { LayoutData } from './$types';
	import { invalidateAll, goto } from '$app/navigation';
	import { page } from '$app/state';
	import { authClient } from '$lib/auth-client';

	let { children, data }: { children: Snippet; data: LayoutData } = $props();

	const isLandingPage = $derived(page.url.pathname === '/');

	let drawerChecked = $state(false);
	let waveSoundEnabled = $state(false);
	let audioElement: HTMLAudioElement;

	let themeSetting = $derived(data.settings?.theme || 'system');
	let fontSetting = $derived(data.settings?.font || 'sans-serif');

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
		if (themeSetting === 'system') {
			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			document.documentElement.setAttribute('data-theme', prefersDark ? 'sazanami-night' : 'sazanami-days');
		} else if (themeSetting === 'custom') {
			document.documentElement.setAttribute('data-theme', 'sazanami-days'); // Base theme
		} else {
			document.documentElement.setAttribute('data-theme', themeSetting);
		}
	});

	const handleAuthClick = async () => {
		drawerChecked = false;

		if (data.session) {
			await authClient.signOut({
				fetchOptions: {
					onSuccess: () => {
						goto('/login');
					}
				}
			});
			await invalidateAll();
		} else {
			goto('/login');
		}
	};
</script>

<svelte:head>
	{#if fontSetting === 'Noto Sans JP'}
		<link rel="preconnect" href="https://fonts.googleapis.com">
		<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
		<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@100..900&display=swap" rel="stylesheet">
		<style>
			:root {
				font-family: "Noto Sans JP", sans-serif !important;
			}
		</style>
	{:else if fontSetting === 'serif'}
		<style>
			:root {
				font-family: serif !important;
			}
		</style>
	{:else if fontSetting === 'monospace'}
		<style>
			:root {
				font-family: monospace !important;
			}
		</style>
	{/if}

	{#if themeSetting === 'custom'}
		<style>
			:root {
				--color-primary: {data.settings?.primaryColor} !important;
				--color-secondary: {data.settings?.secondaryColor} !important;
				--color-accent: {data.settings?.accentColor} !important;
				--color-base-100: {data.settings?.backgroundColor} !important;
				--color-base-content: {data.settings?.textColor} !important;
			}
		</style>
	{/if}
</svelte:head>

<div class="drawer">
	<input id="main-menu-drawer" type="checkbox" class="drawer-toggle" bind:checked={drawerChecked} />
	<div class="drawer-content flex flex-col items-center bg-base-300 min-h-screen">
		<div class="w-full max-w-md bg-base-100 flex flex-col h-[100dvh] relative shadow-xl">
			{#if !isLandingPage}
				<Header user={data.user} />
			{/if}

			<main class="flex-grow overflow-y-auto w-full relative">
				{@render children()}
			</main>

			{#if !isLandingPage}
				<Footer />

			<a href="/home/note/new" class="btn btn-circle btn-primary btn-lg absolute bottom-20 right-4 shadow-lg z-20" aria-label="Create Note">
				<!-- add -->
				<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="currentColor">
					<path d="M0 0h24v24H0V0z" fill="none"/>
					<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
				</svg>
			</a>
			{/if}
		</div>
	</div>
	{#if !isLandingPage}
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
				<li><a href="/settings/appearance">外観設定</a></li>
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
				{#if data.session}
					<button class="btn btn-ghost" onclick={handleAuthClick}>Sign out</button>
				{:else}
					<button class="btn btn-ghost" onclick={handleAuthClick}>Sign in</button>
				{/if}
			</li>
		</ul>
	</div>
	{/if}
</div>
<audio bind:this={audioElement} src="/sazanami-loop.mp3" loop></audio>
