<script lang="ts">
	import { goto } from '$app/navigation';
	import type { LayoutData } from '../../routes/$types';

	/**
	 * Header component for the Sazanami application.
	 * Implements the top menu bar with navigation icons.
	 * Optimized for vertical displays.
	 */

	export let session: LayoutData['session'];
	export let user: LayoutData['user'];

	// Placeholder click handlers for future functionality.
	const handleSearchClick = () => {
		console.log('Search icon clicked');
	};

	const handleGridClick = () => {
		goto('/home/box');
	};

	const handleHashtagClick = () => {
		console.log('Hashtag icon clicked');
	};
</script>

<nav class="navbar bg-base-100 shadow-md">
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
</nav>
