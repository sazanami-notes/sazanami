<script lang="ts">
	import { goto } from '$app/navigation';
	import type { LayoutData } from '../../routes/$types';

	let { user, profile }: { user: LayoutData['user'], profile: LayoutData['profile'] } = $props();

	let searchQuery = $state('');

	function handleSearch(event: KeyboardEvent) {
		if (event.key === 'Enter' && searchQuery) {
			goto(`/home/search?q=${encodeURIComponent(searchQuery)}`);
		}
	}
</script>

<div class="navbar bg-base-100 min-h-16 px-2 gap-2 border-b border-base-200">
	<!-- Left: Hamburger Menu -->
	<div class="flex-none">
		<label for="main-menu-drawer" class="btn btn-ghost btn-circle drawer-button" aria-label="Open menu">
			<!-- menu -->
			<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="currentColor">
				<path d="M0 0h24v24H0V0z" fill="none"/>
				<path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
			</svg>
		</label>
	</div>

	<!-- Center: Search Bar -->
	<div class="flex-1">
		<label class="input flex items-center gap-2 w-full h-10 bg-base-200 border-none rounded-full px-4">
			<!-- search -->
			<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 0 24 24" width="20" fill="currentColor" class="opacity-70">
				<path d="M0 0h24v24H0V0z" fill="none"/>
				<path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
			</svg>
			<input type="text" class="grow bg-transparent border-none focus:ring-0" placeholder="Search" bind:value={searchQuery} onkeydown={handleSearch} />
		</label>
	</div>

	<!-- Right: User Avatar -->
	<div class="flex-none">
		{#if user}
			<a href={profile?.username ? `/${profile.username}` : '/settings/profile'} class="btn btn-ghost btn-circle avatar p-0 overflow-hidden" aria-label="User profile">
				{#if user.image}
					<div class="w-9 rounded-full">
						<img src={user.image} alt={user.name} />
					</div>
				{:else}
					<!-- account_circle -->
					<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="currentColor">
						<path d="M0 0h24v24H0V0z" fill="none"/>
						<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
					</svg>
				{/if}
			</a>
		{/if}
	</div>
</div>
