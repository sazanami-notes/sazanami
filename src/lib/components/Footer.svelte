<script lang="ts">
	import { page } from '$app/stores';

	// Helper to check if a route is active
	// Simple exact or prefix match logic
	const isActive = (path: string) => $page.url.pathname === path;
</script>

<div class="flex w-full justify-around items-center bg-secondary text-secondary-content h-16 shrink-0 z-10 shadow-lg">
	<!-- Check / List (Notes Box) -->
	<a
		href="/home/box"
		class="flex flex-col items-center justify-center w-full h-full text-xs gap-1 {isActive('/home/box') ? 'text-primary-content bg-secondary-content/20 font-bold' : 'text-secondary-content opacity-70 hover:opacity-100'}"
		aria-label="Notes Box"
	>
		<!-- checklist -->
		<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="currentColor">
			<path d="M0 0h24v24H0V0z" fill="none"/>
			<path d="M5 15h2v2H5zm0-8h2v2H5zm0 4h2v2H5zm4 4h10v2H9zm0-4h10v2H9zm0-4h10v2H9z"/>
		</svg>
	</a>

	<!-- Document (Timeline / Home) -->
	<a
		href="/home"
		class="flex flex-col items-center justify-center w-full h-full text-xs gap-1 {isActive('/home') ? 'text-primary-content bg-secondary-content/20 font-bold' : 'text-secondary-content opacity-70 hover:opacity-100'}"
		aria-label="Timeline"
	>
		<!-- description -->
		<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="currentColor">
			<path d="M0 0h24v24H0V0z" fill="none"/>
			<path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
		</svg>
	</a>

	<!-- Grid (Archive) -->
	<a
		href="/home/archive"
		class="flex flex-col items-center justify-center w-full h-full text-xs gap-1 {isActive('/home/archive') ? 'text-primary-content bg-secondary-content/20 font-bold' : 'text-secondary-content opacity-70 hover:opacity-100'}"
		aria-label="Archive"
	>
		<!-- grid_view -->
		<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="currentColor">
			<path d="M0 0h24v24H0V0z" fill="none"/>
			<path d="M4 11h5V5H4v6zm0 7h5v-6H4v6zm6 0h5v-6h-5v6zm6 0h5v-6h-5v6zm-6-7h5V5h-5v6zm6-6v6h5V5h-5z"/>
		</svg>
	</a>

	<!-- Hashtag (Placeholder) -->
	<button
		class="flex flex-col items-center justify-center w-full h-full text-xs gap-1 text-secondary-content opacity-70 hover:opacity-100"
		aria-label="Tags"
	>
		<!-- tag -->
		<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="currentColor">
			<path d="M0 0h24v24H0V0z" fill="none"/>
			<path d="M20 10V8h-4V4h-2v4h-4V4H8v4H4v2h4v4H4v2h4v4h2v-4h4v4h2v-4h4v-2h-4v-4h4zm-6 4h-4v-4h4v4z"/>
		</svg>
	</button>

	<!-- Bell (Placeholder) -->
	<button
		class="flex flex-col items-center justify-center w-full h-full text-xs gap-1 text-secondary-content opacity-70 hover:opacity-100"
		aria-label="Notifications"
	>
		<!-- notifications -->
		<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="currentColor">
			<path d="M0 0h24v24H0V0z" fill="none"/>
			<path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/>
		</svg>
	</button>
</div>
