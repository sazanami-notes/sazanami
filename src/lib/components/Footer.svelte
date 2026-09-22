<script lang="ts">
	import { page } from '$app/stores';

	// モバイル用ボトムナビ（PCでは同じ項目がサイドバーに出る: +layout.svelte）
	const items = [
		{
			href: '/home/tasklist',
			label: 'タスク',
			match: (p: string) => p === '/home/tasklist',
			icon: 'M5 15h2v2H5zm0-8h2v2H5zm0 4h2v2H5zm4 4h10v2H9zm0-4h10v2H9zm0-4h10v2H9z'
		},
		{
			href: '/home',
			label: 'タイムライン',
			match: (p: string) => p === '/home',
			icon: 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z'
		},
		{
			href: '/home/box',
			label: 'Box',
			match: (p: string) => p === '/home/box' || p.startsWith('/home/note/'),
			icon: 'M4 11h5V5H4v6zm0 7h5v-6H4v6zm6 0h5v-6h-5v6zm6 0h5v-6h-5v6zm-6-7h5V5h-5v6zm6-6v6h5V5h-5z'
		},
		{
			href: '/home/search',
			label: '検索',
			match: (p: string) => p === '/home/search',
			icon: 'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z'
		},
		{
			href: '/home/encounters',
			label: '出会い',
			match: (p: string) => p === '/home/encounters',
			icon: 'M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z'
		}
	];
</script>

<nav
	class="border-base-200 bg-primary/10 z-10 flex h-16 w-full shrink-0 items-stretch border-t lg:hidden"
	aria-label="メインナビゲーション"
>
	{#each items as item (item.href)}
		{@const active = item.match($page.url.pathname)}
		<a
			href={item.href}
			class="flex h-full w-full flex-col items-center justify-center gap-0.5 transition-colors {active
				? 'bg-primary/30 text-primary-content font-bold'
				: 'text-base-content/60 hover:text-base-content'}"
			aria-label={item.label}
			aria-current={active ? 'page' : undefined}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				height="22"
				viewBox="0 0 24 24"
				width="22"
				fill="currentColor"
			>
				<path d={item.icon} />
			</svg>
			<span class="text-[10px] leading-none">{item.label}</span>
		</a>
	{/each}
</nav>
