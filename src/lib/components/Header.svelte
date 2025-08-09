<script lang="ts">
	import { invalidateAll, goto } from '$app/navigation';
	import type { LayoutData } from '../../routes/$types';
	import { authClient } from '$lib/auth-client';

	/**
	 * Header component for the Sazanami application.
	 * Implements the top menu bar with navigation icons.
	 * Optimized for vertical displays.
	 */

	export let session: LayoutData['session'];
	export let user: LayoutData['user'];

	let waveSoundEnabled = false;
	let audioElement: HTMLAudioElement;

	const handleWaveSoundToggle = () => {
		waveSoundEnabled = !waveSoundEnabled;
		if (waveSoundEnabled) {
			audioElement?.play();
		} else {
			audioElement?.pause();
		}
		console.log(`Wave sound toggled: ${waveSoundEnabled}`);
	};

	// Placeholder click handlers for future functionality.
	const handleSearchClick = () => {
		console.log('Search icon clicked');
	};

	const handleGridClick = () => {
		console.log('Grid icon clicked');
	};

	const handleMapPinClick = () => {
		console.log('Map pin icon clicked');
	};

	const handleHashtagClick = () => {
		console.log('Hashtag icon clicked');
	};

	const handleAuthClick = async () => {
		if (session) {
			// User is logged in, perform logout
			await authClient.signOut({
				fetchOptions: {
					onSuccess: () => {
						goto('/login'); // ログアウト後にログインページへ遷移
					}
				}
			});
			session = null; // Clear session on client side
			await invalidateAll(); // Invalidate all data to reflect logout
		} else {
			// User is not logged in, navigate to login page
			goto('/login'); // gotoを使用
		}
	};
</script>

<nav class="navbar bg-base-100 shadow-md">
	<div class="navbar-start">
		<div class="dropdown">
			<div tabindex="0" role="button" class="btn btn-ghost btn-circle">
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
			</div>
			<ul
				tabindex="0"
				class="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52"
			>
				{#if user}
					<li><a href={'/' + user.name}>Account</a></li>
				{/if}
				<li>
					<div class="flex justify-between">
						<span>Wave Sound</span>
						<input
							type="checkbox"
							class="toggle"
							bind:checked={waveSoundEnabled}
							on:change={handleWaveSoundToggle}
						/>
					</div>
				</li>
			</ul>
		</div>
	</div>
	<div class="navbar-center">
		<!-- Application Logo or Title -->
		<a class="btn btn-ghost text-xl" href={user ? `/${user.name}` : '/'}>Sazanami</a>
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
		<button class="btn btn-ghost btn-circle" on:click={handleMapPinClick}>
			<!-- Map Pin icon (for location-based notes) -->
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
					d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
				/>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
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
		<button class="btn btn-ghost btn-circle" on:click={handleAuthClick}>
			{#if session}
				<!-- Logout icon -->
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
						d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
					/>
				</svg>
			{:else}
				<!-- Login icon -->
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
						d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
					/>
				</svg>
			{/if}
		</button>
	</div>
	<audio bind:this={audioElement} src="/sazanami-loop.mp3" loop></audio>
</nav>
