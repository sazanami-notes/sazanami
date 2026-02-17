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
			<!-- menu -->
			<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor">
				<path d="M120-240v-80h720v80H120Zm0-200v-80h720v80H120Zm0-200v-80h720v80H120Z"/>
			</svg>
		</label>
	</div>

	<!-- Center: Search Bar -->
	<div class="flex-1">
		<label class="input flex items-center gap-2 w-full h-10 bg-base-200 border-none rounded-full px-4">
			<!-- search -->
			<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor" class="opacity-70">
				<path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z"/>
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
				<!-- account_circle -->
				<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor">
					<path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-32q0-34 17.5-62.5T224-306q54-27 109-40.5T480-360q61 0 116 13.5t109 40.5q32 17 49.5 45.5T772-192v32H160Zm80-80h480q0-10-4-19t-13-17q-54-27-107-39.5T480-328q-58 0-111 12.5T262-276q-9 8-13 17t-4 19Zm240-320q33 0 56.5-23.5T560-640q0-33-23.5-56.5T480-720q-33 0-56.5 23.5T400-640q0 33 23.5 56.5T480-560Zm0-80Zm0 400Z"/>
				</svg>
			</button>
		{/if}
	</div>
</div>
