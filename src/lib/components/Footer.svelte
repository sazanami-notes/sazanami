<script lang="ts">
	import { page } from '$app/stores';

	// Helper to check if a route is active
	// Note: We use simple prefix matching or exact matching based on the structure.
	// For now, simple exact or near-exact matches.
	const isActive = (path: string) => $page.url.pathname === path;
</script>

<div class="btm-nav btm-nav-md bg-base-100 border-t border-base-200">
	<!-- Check / List (Notes Box) -->
	<a
		href="/home/box"
		class={isActive('/home/box') ? 'active text-primary' : 'text-neutral-content'}
		aria-label="Notes Box"
	>
		<!-- checklist -->
		<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor">
			<path d="M220-320q25 0 42.5-17.5T280-380q0-25-17.5-42.5T220-440q-25 0-42.5 17.5T160-380q0 25 17.5 42.5T220-320Zm0-160q25 0 42.5-17.5T280-540q0-25-17.5-42.5T220-600q-25 0-42.5 17.5T160-540q0 25 17.5 42.5T220-480Zm0-160q25 0 42.5-17.5T280-700q0-25-17.5-42.5T220-760q-25 0-42.5 17.5T160-700q0 25 17.5 42.5T220-640Zm140 320h440v-80H360v80Zm0-160h440v-80H360v80Zm0-160h440v-80H360v80ZM220-200q25 0 42.5-17.5T280-260q0-25-17.5-42.5T220-320q-25 0-42.5 17.5T160-260q0 25 17.5 42.5T220-200Zm140 0h440v-80H360v80ZM160-120q-33 0-56.5-23.5T80-200v-560q0-33 23.5-56.5T160-840h640q33 0 56.5 23.5T880-760v560q0 33-23.5 56.5T800-120H160Zm0-80h640v-560H160v560Zm0 0v-560 560Z"/>
		</svg>
	</a>

	<!-- Document (Timeline / Home) -->
	<a
		href="/home"
		class={isActive('/home') ? 'active text-primary' : 'text-neutral-content'}
		aria-label="Timeline"
	>
		<!-- description -->
		<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor">
			<path d="M320-240h320v-80H320v80Zm0-160h320v-80H320v80ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm280-520v-200H240v640h480v-440H520ZM240-800v200-200 640-640Z"/>
		</svg>
	</a>

	<!-- Grid (Archive) -->
	<a
		href="/home/archive"
		class={isActive('/home/archive') ? 'active text-primary' : 'text-neutral-content'}
		aria-label="Archive"
	>
		<!-- grid_view -->
		<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor">
			<path d="M160-160v-280h280v280H160Zm0-360v-280h280v280H160Zm360 360v-280h280v280H520Zm0-360v-280h280v280H520ZM240-240h120v-120H240v120Zm360 0h120v-120H600v120ZM240-600h120v-120H240v120Zm360 0h120v-120H600v120Z"/>
		</svg>
	</a>

	<!-- Hashtag (Placeholder) -->
	<button class="text-neutral-content" aria-label="Tags">
		<!-- tag -->
		<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor">
			<path d="m260-160-56-56 104-104H160v-80h228l80-80H160v-80h388l80-80h80v160h132v80H708l-80 80h132v80H548l-104 104 56 56-240-240Z"/>
		</svg>
	</button>

	<!-- Bell (Placeholder) -->
	<button class="text-neutral-content" aria-label="Notifications">
		<!-- notifications -->
		<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor">
			<path d="M160-200v-80h80v-280q0-83 50-147.5T420-792v-28q0-25 17.5-42.5T480-880q25 0 42.5 17.5T540-820v28q80 20 130 84.5T720-560v280h80v80H160Zm320-300Zm0 420q-33 0-56.5-23.5T400-160h160q0 33-23.5 56.5T480-80ZM320-280h320v-280q0-66-47-113t-113-47q-66 0-113 47t-47 113v280Z"/>
		</svg>
	</button>
</div>
