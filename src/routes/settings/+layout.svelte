<script>
	import { page } from '$app/stores';

	const tabs = [
		{ href: '/settings/account', ja: 'アカウント', en: 'Account' },
		{ href: '/settings/appearance', ja: '外観', en: 'Appearance' },
		{ href: '/settings/import', ja: 'インポート', en: 'Import' }
	];
</script>

<!-- モバイルでは下タブナビに隠れないよう下部に余白を取る -->
<div class="p-4 pb-24 lg:pb-8">
	<!-- タブ: 幅が足りない時は折り返さず横スクロール。英語表記は sm 以上のみ -->
	<div class="border-base-200 mb-6 flex gap-1 overflow-x-auto border-b">
		{#each tabs as tab (tab.href)}
			{@const active = $page.url.pathname.includes(tab.href)}
			<a
				href={tab.href}
				class="shrink-0 border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors sm:text-base {active
					? 'border-primary font-bold'
					: 'hover:border-base-300 border-transparent'}"
			>
				{tab.ja}<span class="text-base-content/50 hidden sm:inline"> ({tab.en})</span>
			</a>
		{/each}
	</div>
	<div class="mt-4">
		<slot />
	</div>
</div>
