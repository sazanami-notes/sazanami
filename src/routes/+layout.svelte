<script lang="ts">
	import '../app.css';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import NoteModal from '$lib/components/NoteModal.svelte';
	import type { LayoutData } from './$types';
	import { untrack } from 'svelte';
	import { invalidateAll, goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { authClient } from '$lib/auth-client';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const hideShell = $derived($page.url.pathname === '/' || $page.url.pathname.startsWith('/login'));

	let drawerChecked = $state(false);
	let waveSoundEnabled = $state(false);
	let audioElement = $state<HTMLAudioElement>();

	const themeMode = $derived(data.settings?.themeMode || 'system');
	const lightThemeId = $derived(data.settings?.lightThemeId || 'sazanami-days');
	const darkThemeId = $derived(data.settings?.darkThemeId || 'sazanami-night');
	const fontSetting = $derived(data.settings?.font || 'sans-serif');

	let createNoteId: string | null = $state(null);

	// モード切り替えを即時反映するためのローカルステート
	let currentThemeMode = $state(themeMode);

	$effect(() => {
		// サーバーから渡された値が変わったら同期する（他タブや設定画面での変更用）
		untrack(() => {
			currentThemeMode = themeMode;
		});
	});

	async function openCreateModal() {
		// 空のノートをサーバーに作成し、そのIDでNoteModalを開く
		try {
			const skipTimeline = $page.url.pathname !== '/home';
			let status = 'inbox';
			if ($page.url.pathname === '/home/box' || $page.url.pathname.startsWith('/home/note/')) {
				status = 'box';
			}

			const response = await fetch('/api/notes', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title: '', content: '', skipTimeline, status })
			});

			if (response.ok) {
				const newNote = await response.json();
				createNoteId = newNote.id;
			} else {
				console.error('Failed to create draft note', await response.text());
			}
		} catch (error) {
			console.error('Error creating draft note', error);
		}
	}

	function handleCloseCreateModal() {
		createNoteId = null;
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

	// テーマ適用ロジック
	// NOTE: isDarkModeはSSR/CSRのhydration mismatchを防ぐため、
	// 初期値はfalse（SSRと一致）にして、マウント後に実際の値に更新する。
	let isDarkMode = $state(false);

	$effect(() => {
		// クライアントサイドでのみダークモードを評価する
		if (currentThemeMode === 'system') {
			isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
		} else {
			isDarkMode = currentThemeMode === 'dark';
		}
	});

	const activeThemeId = $derived(isDarkMode ? darkThemeId : lightThemeId);

	const themeInfo = $derived.by(() => {
		if (activeThemeId === 'sazanami-days' || activeThemeId === 'sazanami-night') {
			return { name: activeThemeId, custom: null };
		} else {
			const custom = data.userThemes.find((t) => t.id === activeThemeId) || null;
			return { name: isDarkMode ? 'sazanami-night' : 'sazanami-days', custom };
		}
	});

	$effect(() => {
		document.documentElement.setAttribute('data-theme', themeInfo.name);
	});

	// モード変更時にサーバーへ保存
	async function handleModeChange(e: Event) {
		const select = e.target as HTMLSelectElement;
		const newMode = select.value;
		currentThemeMode = newMode;

		const formData = new FormData();
		formData.append('themeMode', newMode);
		formData.append('lightThemeId', lightThemeId);
		formData.append('darkThemeId', darkThemeId);
		formData.append('font', fontSetting);

		await fetch('/settings/appearance?/saveSettings', {
			method: 'POST',
			body: formData
		});
		await invalidateAll();
	}

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

	function handleGlobalKeydown(e: KeyboardEvent) {
		if (hideShell) return;

		const target = e.target as HTMLElement;
		const isInput =
			target.tagName === 'INPUT' ||
			target.tagName === 'TEXTAREA' ||
			target.tagName === 'SELECT' ||
			target.isContentEditable;

		if (!isInput && e.key === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) {
			e.preventDefault();
			openCreateModal();
		}
	}
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

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

	{#if themeInfo.custom}
		<style>
			:root {
				--color-primary: {themeInfo.custom.primaryColor} !important;
				--color-secondary: {themeInfo.custom.secondaryColor} !important;
				--color-accent: {themeInfo.custom.accentColor} !important;
				--color-base-100: {themeInfo.custom.backgroundColor} !important;
				--color-base-content: {themeInfo.custom.textColor} !important;
			}
		</style>
	{/if}
</svelte:head>

<div class="drawer {!hideShell ? 'lg:drawer-open' : ''}">
	<input id="main-menu-drawer" type="checkbox" class="drawer-toggle" bind:checked={drawerChecked} />
	<div class="drawer-content bg-base-300 flex min-h-screen flex-col items-center">
		<div
			class="bg-base-100 relative flex h-[100dvh] w-full flex-col shadow-xl {hideShell
				? 'max-w-md'
				: 'lg:max-w-4xl'}"
		>
			{#if !hideShell}
				<Header user={data.user} />
			{/if}

			<main class="relative w-full flex-grow overflow-y-auto">
				{@render children()}
			</main>

			{#if !hideShell}
				<Footer />

				<button
					onclick={() => openCreateModal()}
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
					<li><a href="/home/tasklist">タスクリスト</a></li>
					<li><a href="/home/archive">アーカイブ</a></li>
					<li><a href="/home/trash">ゴミ箱</a></li>
					<li><a href="/home/media">メディア</a></li>
					<div class="divider"></div>
					<li><a href="/settings/account">アカウント設定</a></li>
					<li><a href="/settings/appearance">外観設定</a></li>
					<li><a href="/settings/import">インポート</a></li>
				{/if}
				<div class="divider"></div>
				<li>
					<div class="form-control">
						<label class="label cursor-pointer p-0" for="drawerThemeMode">
							<span class="label-text">テーマモード</span>
						</label>
						<select
							id="drawerThemeMode"
							class="select select-bordered select-sm mt-2 w-full"
							bind:value={currentThemeMode}
							onchange={handleModeChange}
						>
							<option value="system">システム同期 (System)</option>
							<option value="light">ライト (Light)</option>
							<option value="dark">ダーク (Dark)</option>
						</select>
					</div>
				</li>
				<li class="mt-4">
					<div class="flex items-center justify-between p-0">
						<span class="label-text">Wave Sound</span>
						<input type="checkbox" class="toggle toggle-sm" bind:checked={waveSoundEnabled} />
					</div>
				</li>
				<li class="mt-4">
					{#if data.session}
						<button class="btn btn-ghost btn-sm" onclick={handleAuthClick}>Sign out</button>
					{:else}
						<button class="btn btn-ghost btn-sm" onclick={handleAuthClick}>Sign in</button>
					{/if}
				</li>
			</ul>
		</div>
	{/if}
</div>

<NoteModal noteId={createNoteId} onclose={handleCloseCreateModal} />

<audio bind:this={audioElement} src="/sazanami-loop.mp3" loop></audio>
