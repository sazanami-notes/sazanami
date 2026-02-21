<script>
	import { page } from '$app/stores';
</script>

<div class="p-4">
	<div class="mb-6 flex space-x-2 border-b">
		<a
			href="/settings/account"
			class="px-4 py-2 border-b-2 {$page.url.pathname.includes('/settings/account')
				? 'border-primary font-bold'
				: 'border-transparent hover:border-base-300'}"
		>
			アカウント (Account)
		</a>
		<a
			href="/settings/appearance"
			class="px-4 py-2 border-b-2 {$page.url.pathname.includes('/settings/appearance')
				? 'border-primary font-bold'
				: 'border-transparent hover:border-base-300'}"
		>
			外観 (Appearance)
		</a>
		<a
			href="/settings/import"
			class="px-4 py-2 border-b-2 {$page.url.pathname.includes('/settings/import')
				? 'border-primary font-bold'
				: 'border-transparent hover:border-base-300'}"
		>
			インポート (Import)
		</a>
	</div>
	<div class="mt-4">
		<slot />
	</div>
</div>
