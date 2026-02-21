<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form?: ActionData } = $props();

	let theme = $state(data.settings.theme);
	let font = $state(data.settings.font);

	let primaryColor = $state(data.settings.primaryColor || '#570df8');
	let secondaryColor = $state(data.settings.secondaryColor || '#f000b8');
	let accentColor = $state(data.settings.accentColor || '#37cdbe');
	let backgroundColor = $state(data.settings.backgroundColor || '#ffffff');
	let textColor = $state(data.settings.textColor || '#1f2937');

	$effect(() => {
		theme = data.settings.theme;
		font = data.settings.font;
		primaryColor = data.settings.primaryColor || '#570df8';
		secondaryColor = data.settings.secondaryColor || '#f000b8';
		accentColor = data.settings.accentColor || '#37cdbe';
		backgroundColor = data.settings.backgroundColor || '#ffffff';
		textColor = data.settings.textColor || '#1f2937';
	});
</script>

<h1 class="mb-4 text-2xl font-bold">外観設定 (Appearance)</h1>

{#if form?.message}
	<div class="alert alert-info mb-4">
		<span>{form.message}</span>
	</div>
{/if}

<form method="POST" use:enhance class="space-y-6">
	<div class="form-control w-full max-w-xs">
		<label class="label" for="theme">
			<span class="label-text">テーマ</span>
		</label>
		<select id="theme" name="theme" class="select select-bordered" bind:value={theme}>
			<option value="system">システム設定に従う (System)</option>
			<option value="sazanami-days">ライト (Sazanami Days)</option>
			<option value="sazanami-night">ダーク (Sazanami Night)</option>
			<option value="custom">カスタム (Custom)</option>
		</select>
	</div>

	<div class="form-control w-full max-w-xs">
		<label class="label" for="font">
			<span class="label-text">フォント</span>
		</label>
		<select id="font" name="font" class="select select-bordered" bind:value={font}>
			<option value="sans-serif">システム標準 (Sans-Serif)</option>
			<option value="serif">明朝体 (Serif)</option>
			<option value="monospace">等幅 (Monospace)</option>
			<option value="Noto Sans JP">Noto Sans JP</option>
		</select>
	</div>

	{#if theme === 'custom'}
		<div class="space-y-4 rounded-lg border p-4">
			<h2 class="text-lg font-semibold">カスタムカラー設定</h2>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div class="form-control">
					<label class="label" for="primaryColor">
						<span class="label-text">プライマリーカラー (Primary)</span>
					</label>
					<div class="flex gap-2">
						<input
							type="color"
							id="primaryColorPicker"
							bind:value={primaryColor}
							class="h-12 w-12 cursor-pointer border-0 p-0"
						/>
						<input
							type="text"
							id="primaryColor"
							name="primaryColor"
							bind:value={primaryColor}
							class="input input-bordered w-full"
						/>
					</div>
				</div>

				<div class="form-control">
					<label class="label" for="secondaryColor">
						<span class="label-text">セカンダリーカラー (Secondary)</span>
					</label>
					<div class="flex gap-2">
						<input
							type="color"
							id="secondaryColorPicker"
							bind:value={secondaryColor}
							class="h-12 w-12 cursor-pointer border-0 p-0"
						/>
						<input
							type="text"
							id="secondaryColor"
							name="secondaryColor"
							bind:value={secondaryColor}
							class="input input-bordered w-full"
						/>
					</div>
				</div>

				<div class="form-control">
					<label class="label" for="accentColor">
						<span class="label-text">アクセントカラー (Accent)</span>
					</label>
					<div class="flex gap-2">
						<input
							type="color"
							id="accentColorPicker"
							bind:value={accentColor}
							class="h-12 w-12 cursor-pointer border-0 p-0"
						/>
						<input
							type="text"
							id="accentColor"
							name="accentColor"
							bind:value={accentColor}
							class="input input-bordered w-full"
						/>
					</div>
				</div>

				<div class="form-control">
					<label class="label" for="backgroundColor">
						<span class="label-text">背景色 (Base-100)</span>
					</label>
					<div class="flex gap-2">
						<input
							type="color"
							id="backgroundColorPicker"
							bind:value={backgroundColor}
							class="h-12 w-12 cursor-pointer border-0 p-0"
						/>
						<input
							type="text"
							id="backgroundColor"
							name="backgroundColor"
							bind:value={backgroundColor}
							class="input input-bordered w-full"
						/>
					</div>
				</div>

				<div class="form-control">
					<label class="label" for="textColor">
						<span class="label-text">文字色 (Base-Content)</span>
					</label>
					<div class="flex gap-2">
						<input
							type="color"
							id="textColorPicker"
							bind:value={textColor}
							class="h-12 w-12 cursor-pointer border-0 p-0"
						/>
						<input
							type="text"
							id="textColor"
							name="textColor"
							bind:value={textColor}
							class="input input-bordered w-full"
						/>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<div class="pt-4">
		<button class="btn btn-primary">設定を保存</button>
	</div>
</form>
