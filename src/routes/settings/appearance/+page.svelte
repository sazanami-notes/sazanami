<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	export let data: PageData;
	export let form: ActionData;

	// === 既存設定のステート ===
	let themeMode = data.settings.themeMode;
	let lightThemeId = data.settings.lightThemeId;
	let darkThemeId = data.settings.darkThemeId;
	let font = data.settings.font;

	$: {
		themeMode = data.settings.themeMode;
		lightThemeId = data.settings.lightThemeId;
		darkThemeId = data.settings.darkThemeId;
		font = data.settings.font;
	}

	// === テーマ作成用のステート ===
	let newThemeName = '';
	let newPrimaryColor = '#570df8';
	let newSecondaryColor = '#f000b8';
	let newAccentColor = '#37cdbe';
	let newBackgroundColor = '#ffffff';
	let newTextColor = '#1f2937';
</script>

<h1 class="mb-6 text-2xl font-bold">外観設定 (Appearance)</h1>

{#if form?.message}
	<div class="alert {form.success ? 'alert-success' : 'alert-error'} mb-6">
		<span>{form.message}</span>
	</div>
{/if}

<div class="space-y-12">
	<!-- セクション1: 表示設定 -->
	<section class="bg-base-200 space-y-4 rounded-lg p-6">
		<h2 class="text-xl font-semibold">表示設定</h2>
		<form method="POST" action="?/saveSettings" use:enhance class="space-y-6">
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
				<!-- モード選択 -->
				<div class="form-control w-full">
					<label class="label" for="themeMode">
						<span class="label-text font-medium">テーマモードの切り替え</span>
					</label>
					<select
						id="themeMode"
						name="themeMode"
						class="select select-bordered"
						bind:value={themeMode}
					>
						<option value="system">システム設定に合わせる (System)</option>
						<option value="light">常にライトモード (Light)</option>
						<option value="dark">常にダークモード (Dark)</option>
					</select>
				</div>

				<!-- フォント選択 -->
				<div class="form-control w-full">
					<label class="label" for="font">
						<span class="label-text font-medium">フォント</span>
					</label>
					<select id="font" name="font" class="select select-bordered" bind:value={font}>
						<option value="sans-serif">システム標準 (Sans-Serif)</option>
						<option value="serif">明朝体 (Serif)</option>
						<option value="monospace">等幅 (Monospace)</option>
						<option value="Noto Sans JP">Noto Sans JP</option>
					</select>
				</div>

				<!-- ライトテーマ割り当て -->
				<div class="form-control w-full">
					<label class="label" for="lightThemeId">
						<span class="label-text font-medium">ライトモード時のテーマ</span>
					</label>
					<select
						id="lightThemeId"
						name="lightThemeId"
						class="select select-bordered"
						bind:value={lightThemeId}
					>
						<optgroup label="デフォルト">
							<option value="sazanami-days">Sazanami Days</option>
						</optgroup>
						{#if data.userThemes.length > 0}
							<optgroup label="マイテーマ">
								{#each data.userThemes as theme}
									<option value={theme.id}>{theme.name}</option>
								{/each}
							</optgroup>
						{/if}
					</select>
				</div>

				<!-- ダークテーマ割り当て -->
				<div class="form-control w-full">
					<label class="label" for="darkThemeId">
						<span class="label-text font-medium">ダークモード時のテーマ</span>
					</label>
					<select
						id="darkThemeId"
						name="darkThemeId"
						class="select select-bordered"
						bind:value={darkThemeId}
					>
						<optgroup label="デフォルト">
							<option value="sazanami-night">Sazanami Night</option>
						</optgroup>
						{#if data.userThemes.length > 0}
							<optgroup label="マイテーマ">
								{#each data.userThemes as theme}
									<option value={theme.id}>{theme.name}</option>
								{/each}
							</optgroup>
						{/if}
					</select>
				</div>
			</div>

			<div class="pt-2">
				<button class="btn btn-primary">設定を保存</button>
			</div>
		</form>
	</section>

	<!-- セクション2: ユーザーテーマの管理・作成 -->
	<section class="space-y-6">
		<h2 class="border-b pb-2 text-xl font-semibold">マイテーマの管理</h2>

		{#if data.userThemes.length > 0}
			<div class="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{#each data.userThemes as theme}
					<div class="card border-base-300 bg-base-100 border shadow-sm">
						<div class="card-body p-4">
							<h3 class="card-title text-base font-bold">{theme.name}</h3>
							<div class="my-2 flex gap-2">
								<div
									class="border-base-300 h-6 w-6 rounded-full border"
									style="background-color: {theme.primaryColor || '#ccc'};"
									title="Primary: {theme.primaryColor}"
								></div>
								<div
									class="border-base-300 h-6 w-6 rounded-full border"
									style="background-color: {theme.secondaryColor || '#ccc'};"
									title="Secondary: {theme.secondaryColor}"
								></div>
								<div
									class="border-base-300 h-6 w-6 rounded-full border"
									style="background-color: {theme.accentColor || '#ccc'};"
									title="Accent: {theme.accentColor}"
								></div>
								<div
									class="border-base-300 h-6 w-6 rounded-full border"
									style="background-color: {theme.backgroundColor || '#ccc'};"
									title="Background: {theme.backgroundColor}"
								></div>
								<div
									class="border-base-300 h-6 w-6 rounded-full border"
									style="background-color: {theme.textColor || '#ccc'};"
									title="Text: {theme.textColor}"
								></div>
							</div>
							<div class="card-actions mt-2 justify-end">
								<form method="POST" action="?/deleteTheme" use:enhance>
									<input type="hidden" name="themeId" value={theme.id} />
									<button
										class="btn btn-ghost text-error btn-xs"
										on:click={(e) => {
											if (!confirm('本当にこのテーマを削除しますか？')) e.preventDefault();
										}}>削除</button
									>
								</form>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<!-- テーマ作成フォーム -->
		<div class="space-y-4 rounded-lg border p-6">
			<h3 class="mb-4 text-lg font-bold">新しくテーマを作成する</h3>
			<form method="POST" action="?/createTheme" use:enhance class="space-y-6">
				<div class="form-control w-full max-w-md">
					<label class="label" for="name">
						<span class="label-text font-medium">テーマ名 <span class="text-error">*</span></span>
					</label>
					<input
						type="text"
						id="name"
						name="name"
						bind:value={newThemeName}
						placeholder="例: ピンクのテーマ"
						class="input input-bordered w-full"
						required
					/>
				</div>

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
					<div class="form-control">
						<label class="label" for="primaryColor">
							<span class="label-text">プライマリーカラー (Primary)</span>
						</label>
						<div class="flex gap-2">
							<input
								type="color"
								id="primaryColorPicker"
								bind:value={newPrimaryColor}
								class="h-10 w-10 cursor-pointer border-0 p-0"
							/>
							<input
								type="text"
								id="primaryColor"
								name="primaryColor"
								bind:value={newPrimaryColor}
								class="input input-bordered input-sm w-full"
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
								bind:value={newSecondaryColor}
								class="h-10 w-10 cursor-pointer border-0 p-0"
							/>
							<input
								type="text"
								id="secondaryColor"
								name="secondaryColor"
								bind:value={newSecondaryColor}
								class="input input-bordered input-sm w-full"
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
								bind:value={newAccentColor}
								class="h-10 w-10 cursor-pointer border-0 p-0"
							/>
							<input
								type="text"
								id="accentColor"
								name="accentColor"
								bind:value={newAccentColor}
								class="input input-bordered input-sm w-full"
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
								bind:value={newBackgroundColor}
								class="h-10 w-10 cursor-pointer border-0 p-0"
							/>
							<input
								type="text"
								id="backgroundColor"
								name="backgroundColor"
								bind:value={newBackgroundColor}
								class="input input-bordered input-sm w-full"
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
								bind:value={newTextColor}
								class="h-10 w-10 cursor-pointer border-0 p-0"
							/>
							<input
								type="text"
								id="textColor"
								name="textColor"
								bind:value={newTextColor}
								class="input input-bordered input-sm w-full"
							/>
						</div>
					</div>
				</div>

				<div class="pt-2">
					<button class="btn btn-secondary" disabled={!newThemeName.trim()}>テーマを作成</button>
				</div>
			</form>
		</div>
	</section>
</div>
