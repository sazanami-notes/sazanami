<script lang="ts">
	import { goto } from '$app/navigation';
	import type { LayoutData } from '../../routes/$types';

	export let user: LayoutData['user'];

	let searchQuery = '';

	function handleSearch(event: KeyboardEvent) {
		if (event.key === 'Enter' && searchQuery) {
			goto(`/home/search?q=${encodeURIComponent(searchQuery)}`);
		}
	}
</script>

<div class="navbar bg-base-100 min-h-16 px-2 gap-2">
	<!-- Left: Hamburger Menu -->
	<div class="flex-none">
		<label for="main-menu-drawer" class="btn btn-ghost btn-circle drawer-button" aria-label="Open menu">
			<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" />
			</svg>
		</label>
	</div>

	<!-- Center: Search Bar -->
	<div class="flex-1">
		<label class="input flex items-center gap-2 w-full h-10 bg-base-200 border-none rounded-full px-4">
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 opacity-70">
				<path fill-rule="evenodd" d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" clip-rule="evenodd" />
			</svg>
			<input type="text" class="grow bg-transparent border-none focus:ring-0" placeholder="Search" bind:value={searchQuery} on:keydown={handleSearch} />
		</label>
	</div>

	<!-- Right: User Avatar -->
	<div class="flex-none">
		{#if user && user.image}
			<div class="avatar">
				<div class="w-9 rounded-full">
					<img src={user.image} alt={user.name} />
				</div>
			</div>
		{:else}
			<button class="btn btn-ghost btn-circle" aria-label="User profile">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
				</svg>
			</button>
		{/if}
	</div>
</div>
