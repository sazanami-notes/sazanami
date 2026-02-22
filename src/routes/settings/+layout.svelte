<script>
	import { page } from '$app/stores';
</script>

<div class="p-4">
	<div class="mb-6 flex space-x-2 border-b">
		<a
			href="/settings/account"
			class="border-b-2 px-4 py-2 {$page.url.pathname.includes('/settings/account')
				? 'border-primary font-bold'
				: 'hover:border-base-300 border-transparent'}"
		>
			アカウント (Account)
		</a>
		<a
			href="/settings/appearance"
			class="border-b-2 px-4 py-2 {$page.url.pathname.includes('/settings/appearance')
				? 'border-primary font-bold'
				: 'hover:border-base-300 border-transparent'}"
		>
			外観 (Appearance)
		</a>
		<a
			href="/settings/import"
			class="border-b-2 px-4 py-2 {$page.url.pathname.includes('/settings/import')
				? 'border-primary font-bold'
				: 'hover:border-base-300 border-transparent'}"
		>
			インポート (Import)
		</a>
	</div>
	<div class="mt-4">
		<slot />
	</div>
</div>
