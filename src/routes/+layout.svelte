<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import '../app.css';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import CreateNoteModal from '$lib/components/CreateNoteModal.svelte';
	import type { LayoutData } from './$types';
	import { invalidateAll, goto } from '$app/navigation';
	import { page } from '$app/state';
	import { authClient } from '$lib/auth-client';

	let { children, data }: { children: Snippet; data: LayoutData } = $props();

	const isLandingPage = $derived(page.url.pathname === '/');
	const hideShell = $derived(page.url.pathname === '/' || page.url.pathname.startsWith('/login'));

	let drawerChecked = $state(false);
	let waveSoundEnabled = $state(false);
	let audioElement: HTMLAudioElement;

	let themeSetting = $derived(data.settings?.theme || 'system');
	let fontSetting = $derived(data.settings?.font || 'sans-serif');

	let isCreateModalOpen = $state(false);
	let isSavingNewNote = $state(false);

	async function handleSaveNewNote(event: CustomEvent<{ title: string; content: string }>) {
		if (!event.detail.content.trim()) return;

		isSavingNewNote = true;
		try {
			const { title, content } = event.detail;
			const response = await fetch('/api/notes', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title, content })
			});

			if (response.ok) {
				isCreateModalOpen = false;
				await invalidateAll();
			} else {
				alert('ノートの作成に失敗しました。');
				console.error('Failed to create note', await response.text());
			}
		} catch (error) {
			alert('エラーが発生しました。');
			console.error('Error creating note', error);
		} finally {
			isSavingNewNote = false;
		}
	}

	function handleCancelNewNote() {
		isCreateModalOpen = false;
	}

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
			document.documentElement.setAttribute(
				'data-theme',
				prefersDark ? 'sazanami-night' : 'sazanami-days'
			);
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
		<link rel="preconnect" href="https://fonts.googleapis.com" />
		<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
		<link
			href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@100..900&display=swap"
			rel="stylesheet"
		/>
		<style>
			:root {
				font-family: 'Noto Sans JP', sans-serif !important;
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
	<div class="drawer-content bg-base-300 flex min-h-screen flex-col items-center">
		<div class="bg-base-100 relative flex h-[100dvh] w-full max-w-md flex-col shadow-xl">
			{#if !hideShell}
				<Header user={data.user} />
			{/if}

			<main class="relative w-full flex-grow overflow-y-auto">
				{@render children()}
			</main>

			{#if !hideShell}
				<Footer />

				<button
					onclick={() => (isCreateModalOpen = true)}
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
				</button>
			{/if}
		</div>
	</div>
	{#if !hideShell}
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

<CreateNoteModal
	open={isCreateModalOpen}
	saving={isSavingNewNote}
	on:save={handleSaveNewNote}
	on:cancel={handleCancelNewNote}
/>

<audio bind:this={audioElement} src="/sazanami-loop.mp3" loop></audio>
