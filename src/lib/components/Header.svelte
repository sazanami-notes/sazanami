<script lang="ts">
	import { goto } from '$app/navigation';
	import type { LayoutData } from '../../routes/$types';
	import { onDestroy } from 'svelte';

	let { user }: { user: LayoutData['user'] } = $props();

	let searchQuery = $state('');
	type SearchSuggestion = {
		id: string;
		title: string;
		slug: string;
		status: string;
	};

	let suggestions = $state<SearchSuggestion[]>([]);
	let isLoadingSuggestions = $state(false);
	let showSuggestions = $state(false);

	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let activeController: AbortController | null = null;

	function closeSuggestions() {
		showSuggestions = false;
	}

	async function navigateToSearch(query: string) {
		const trimmed = query.trim();
		if (!trimmed) return;

		closeSuggestions();
		await goto(`/home/search?q=${encodeURIComponent(trimmed)}`);
	}

	function handleInput() {
		const query = searchQuery.trim();

		if (debounceTimer) {
			clearTimeout(debounceTimer);
			debounceTimer = null;
		}

		if (activeController) {
			activeController.abort();
			activeController = null;
		}

		if (!query) {
			suggestions = [];
			isLoadingSuggestions = false;
			closeSuggestions();
			return;
		}

		debounceTimer = setTimeout(async () => {
			const controller = new AbortController();
			activeController = controller;
			isLoadingSuggestions = true;

			try {
				const response = await fetch(
					`/api/notes/suggestions?q=${encodeURIComponent(query)}&scope=all`,
					{ signal: controller.signal }
				);

				if (!response.ok) {
					throw new Error(`Failed to load suggestions: ${response.status}`);
				}

				const result = await response.json();
				suggestions = Array.isArray(result) ? result : [];
				showSuggestions = true;
			} catch (error) {
				if (!(error instanceof DOMException && error.name === 'AbortError')) {
					console.error('Error loading search suggestions:', error);
					suggestions = [];
					showSuggestions = false;
				}
			} finally {
				if (activeController === controller) {
					activeController = null;
				}
				isLoadingSuggestions = false;
			}
		}, 300);
	}

	function handleSearch(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeSuggestions();
			return;
		}

		if (event.key === 'Enter' && searchQuery.trim()) {
			event.preventDefault();
			navigateToSearch(searchQuery);
		}
	}

	function handleBlur() {
		setTimeout(() => {
			closeSuggestions();
		}, 120);
	}

	function handleSuggestionClick(suggestion: SearchSuggestion) {
		searchQuery = suggestion.title;
		closeSuggestions();
		goto(`/home/note/${suggestion.id}`);
	}

	onDestroy(() => {
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}

		if (activeController) {
			activeController.abort();
		}
	});
</script>

<div class="navbar bg-base-100 border-base-200 min-h-16 gap-2 border-b px-2">
	<!-- Left: Hamburger Menu -->
	<div class="flex-none lg:hidden">
		<label
			for="main-menu-drawer"
			class="btn btn-ghost btn-circle drawer-button"
			aria-label="Open menu"
		>
			<!-- menu -->
			<svg
				xmlns="http://www.w3.org/2000/svg"
				height="24"
				viewBox="0 0 24 24"
				width="24"
				fill="currentColor"
			>
				<path d="M0 0h24v24H0V0z" fill="none" />
				<path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
			</svg>
		</label>
	</div>

	<!-- Center: Search Bar -->
	<div class="flex-1">
		<div class="relative w-full">
			<label
				class="input bg-base-200 flex h-10 w-full items-center gap-2 rounded-full border-none px-4"
			>
				<!-- search -->
				<svg
					xmlns="http://www.w3.org/2000/svg"
					height="20"
					viewBox="0 0 24 24"
					width="20"
					fill="currentColor"
					class="opacity-70"
				>
					<path d="M0 0h24v24H0V0z" fill="none" />
					<path
						d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
					/>
				</svg>
				<input
					type="text"
					class="grow border-none bg-transparent focus:ring-0"
					placeholder="Search"
					bind:value={searchQuery}
					oninput={handleInput}
					onfocus={() => {
						if (searchQuery.trim()) showSuggestions = true;
					}}
					onblur={handleBlur}
					onkeydown={handleSearch}
				/>
			</label>

			{#if showSuggestions}
				<div
					class="bg-base-100 border-base-300 absolute top-12 z-40 w-full rounded-box border shadow-xl"
				>
					{#if isLoadingSuggestions}
						<div class="text-base-content/70 px-4 py-3 text-sm">検索中...</div>
					{:else if suggestions.length > 0}
						<ul class="max-h-72 overflow-y-auto py-1">
							{#each suggestions as suggestion (suggestion.id)}
								<li>
									<button
										type="button"
										class="hover:bg-base-200 flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
										onmousedown={(event) => event.preventDefault()}
										onclick={() => handleSuggestionClick(suggestion)}
									>
										<span class="line-clamp-1 text-sm font-medium">{suggestion.title}</span>
										<span class="badge badge-ghost badge-sm">{suggestion.status}</span>
									</button>
								</li>
							{/each}
						</ul>
					{:else}
						<div class="text-base-content/70 px-4 py-3 text-sm">一致するメモはありません</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<!-- Right: User Avatar -->
	<div class="flex-none">
		{#if user}
			<a
				href="/{user.username || user.id}"
				class="avatar block transition-transform hover:scale-105 active:scale-95"
			>
				<div class="ring-base-300 w-9 rounded-full ring-1">
					{#if user.image}
						<img src={user.image} alt={user.name} />
					{:else}
						<div
							class="bg-neutral text-neutral-content flex h-full w-full items-center justify-center font-bold"
						>
							{user.name?.charAt(0) || '?'}
						</div>
					{/if}
				</div>
			</a>
		{:else}
			<button class="btn btn-ghost btn-circle" aria-label="User profile">
				<!-- account_circle -->
				<svg
					xmlns="http://www.w3.org/2000/svg"
					height="24"
					viewBox="0 0 24 24"
					width="24"
					fill="currentColor"
				>
					<path d="M0 0h24v24H0V0z" fill="none" />
					<path
						d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"
					/>
				</svg>
			</button>
		{/if}
	</div>
</div>
