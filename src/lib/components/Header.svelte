<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import type { LayoutData } from '../../routes/$types';
	import { authClient } from '$lib/auth-client';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import { isSearchVisible } from '$lib/stores/search';

	/**
	 * Header component for the Sazanami application.
	 * Implements the top menu bar with navigation icons.
	 * Optimized for vertical displays.
	 */

	export let session: LayoutData['session'] | undefined;
	export let user: LayoutData['user'];

	// Placeholder click handlers for future functionality.
	const handleSearchClick = () => {
		isSearchVisible.update((value) => !value);
	};

	function handleSearch(event: CustomEvent<string>) {
		const query = event.detail;
		if (query) {
			goto(`/home/search?q=${encodeURIComponent(query)}`);
			isSearchVisible.set(false); // Hide search bar after searching
		}
	}

	const handleGridClick = () => {
		goto('/home/box');
	};

	const handleHashtagClick = () => {
		console.log('Hashtag icon clicked');
	};
</script>

<nav class="navbar bg-base-100 relative shadow-md">
	<div class="navbar-start">
		<label for="main-menu-drawer" class="btn btn-ghost btn-circle drawer-button">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-5 w-5"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M4 6h16M4 12h16M4 18h7"
				/>
			</svg>
		</label>
	</div>
	<div class="navbar-center">
		<!-- Application Logo or Title -->
		<a class="btn btn-ghost text-xl" href={user ? '/home' : '/'}>Sazanami</a>
	</div>
	<div class="navbar-end">
		<button class="btn btn-ghost btn-circle" on:click={handleSearchClick}>
			<!-- Search icon -->
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-5 w-5"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
				/>
			</svg>
		</button>
		<button class="btn btn-ghost btn-circle" on:click={handleGridClick}>
			<!-- Grid icon (for layout change) -->
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-5 w-5"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
				/>
			</svg>
		</button>
		<button class="btn btn-ghost btn-circle" on:click={handleHashtagClick}>
			<!-- Hashtag icon (for tag filtering) -->
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-5 w-5"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
				/>
			</svg>
		</button>
	</div>
	{#if $isSearchVisible}
		<div class="search-bar-container">
			<SearchBar on:search={handleSearch} />
		</div>
	{/if}
</nav>

<style>
	.search-bar-container {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		padding: 1rem;
		background-color: var(--fallback-b1, oklch(var(--b1) / 1));
		z-index: 10;
		box-shadow:
			0 4px 6px -1px rgb(0 0 0 / 0.1),
			0 2px 4px -2px rgb(0 0 0 / 0.1);
	}
</style>
