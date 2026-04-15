<script lang="ts">
	let selectedFiles = $state<File[]>([]);
	let isDragging = $state(false);
	let isLoading = $state(false);
	let result = $state<{
		importedCount: number;
		skippedCount: number;
		errors: string[];
	} | null>(null);
	let errorMessage = $state('');

	let fileInputEl: HTMLInputElement;

	const hasAnyFiles = $derived(selectedFiles.length > 0);

	function addFiles(newFiles: FileList | File[]) {
		const arr = Array.from(newFiles);
		// 重複チェック（name + size で判定）
		const existing = new Set(selectedFiles.map((f) => `${f.name}:${f.size}`));
		const unique = arr.filter((f) => !existing.has(`${f.name}:${f.size}`));
		selectedFiles = [...selectedFiles, ...unique];
	}

	function onFileInputChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			addFiles(input.files);
		}
	}

	function onDragOver(e: DragEvent) {
		e.preventDefault();
		isDragging = true;
	}

	function onDragLeave(e: DragEvent) {
		// 子要素への移動では発火しないように
		const related = e.relatedTarget as Node | null;
		if (related && (e.currentTarget as HTMLElement).contains(related)) return;
		isDragging = false;
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
			addFiles(e.dataTransfer.files);
		}
	}

	function removeFile(index: number) {
		selectedFiles = selectedFiles.filter((_, i) => i !== index);
	}

	function clearAll() {
		selectedFiles = [];
		result = null;
		errorMessage = '';
		if (fileInputEl) fileInputEl.value = '';
	}

	async function handleImport() {
		if (!hasAnyFiles) {
			errorMessage = 'ファイルを選択またはドロップしてください。';
			return;
		}

		isLoading = true;
		result = null;
		errorMessage = '';

		const formData = new FormData();
		for (const file of selectedFiles) {
			formData.append('files', file);
		}

		try {
			const response = await fetch('/api/notes/import', {
				method: 'POST',
				body: formData
			});

			const data = await response.json();

			if (response.ok) {
				result = {
					importedCount: data.importedCount,
					skippedCount: data.skippedCount ?? 0,
					errors: data.errors ?? []
				};
				// インポート完了後にファイルリストをリセット
				selectedFiles = [];
				if (fileInputEl) fileInputEl.value = '';
			} else {
				errorMessage = `エラー: ${data.message || '不明なエラーが発生しました。'}`;
			}
		} catch (e) {
			errorMessage = 'インポート処理中にエラーが発生しました。';
			console.error('Import error:', e);
		} finally {
			isLoading = false;
		}
	}

	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function getFileIcon(file: File): string {
		if (file.name.toLowerCase().endsWith('.zip')) return '🗜️';
		if (file.name.toLowerCase().endsWith('.md')) return '📝';
		return '📄';
	}
</script>

<div class="mx-auto max-w-2xl space-y-6">
	<!-- ヘッダー -->
	<div>
		<h2 class="text-xl font-bold">Obsidianからインポート</h2>
		<p class="text-base-content/70 mt-1 text-sm">
			ObsidianのVaultをZIPでエクスポートしてインポートできます。<br />
			Markdownファイル（.md）または ZIPファイルに対応しています。<br />
			インポートされたノートは
			<span class="badge badge-sm badge-outline">BOX</span> に保存されます。
		</p>
	</div>

	<!-- インポート手順 -->
	<div class="collapse collapse-arrow bg-base-200 rounded-box">
		<input type="checkbox" />
		<div class="collapse-title font-medium">Obsidianからのエクスポート手順</div>
		<div class="collapse-content space-y-1 text-sm">
			<ol class="list-decimal list-inside space-y-1">
				<li>ObsidianのVaultフォルダを開く</li>
				<li>フォルダ全体（または必要なフォルダ）を選択してZIPに圧縮</li>
				<li>できあがったZIPファイルをここにドロップするかファイル選択してインポート</li>
			</ol>
			<p class="text-base-content/60 mt-2">
				※ フォルダ構造は無視されます。すべてのMarkdownファイルがBOXにインポートされます。
			</p>
		</div>
	</div>

	<!-- ドロップゾーン -->
	<div
		role="region"
		aria-label="ファイルドロップエリア"
		class="border-base-content/20 rounded-box flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed p-8 transition-colors {isDragging
			? 'border-primary bg-primary/10'
			: 'hover:border-primary/50 hover:bg-base-200'}"
		ondragover={onDragOver}
		ondragleave={onDragLeave}
		ondrop={onDrop}
		onclick={() => fileInputEl?.click()}
		onkeydown={(e) => e.key === 'Enter' && fileInputEl?.click()}
		tabindex="0"
	>
		<div class="text-4xl">{isDragging ? '📂' : '📤'}</div>
		<div class="text-center">
			<p class="font-medium">ここにファイルをドロップ</p>
			<p class="text-base-content/60 text-sm">または クリックして選択</p>
		</div>
		<div class="text-base-content/40 flex gap-2 text-xs">
			<span class="badge badge-xs badge-outline">.zip</span>
			<span class="badge badge-xs badge-outline">.md</span>
		</div>
	</div>

	<!-- 非表示のファイル入力 -->
	<input
		type="file"
		id="file-input"
		bind:this={fileInputEl}
		onchange={onFileInputChange}
		multiple
		accept=".zip,.md,text/markdown,application/zip,application/x-zip-compressed"
		class="hidden"
		disabled={isLoading}
	/>

	<!-- 選択済みファイル一覧 -->
	{#if hasAnyFiles}
		<div class="space-y-2">
			<div class="flex items-center justify-between">
				<h3 class="text-sm font-medium">選択されたファイル（{selectedFiles.length}件）</h3>
				<button class="btn btn-ghost btn-xs" onclick={clearAll} disabled={isLoading}>
					クリア
				</button>
			</div>
			<ul class="bg-base-200 rounded-box divide-base-300 max-h-48 divide-y overflow-y-auto">
				{#each selectedFiles as file, i}
					<li class="flex items-center gap-2 px-3 py-2 text-sm">
						<span>{getFileIcon(file)}</span>
						<span class="min-w-0 flex-1 truncate">{file.name}</span>
						<span class="text-base-content/50 shrink-0 text-xs">{formatFileSize(file.size)}</span>
						<button
							class="btn btn-ghost btn-xs"
							onclick={() => removeFile(i)}
							disabled={isLoading}
							aria-label="削除"
						>
							✕
						</button>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<!-- インポートボタン -->
	<button
		class="btn btn-primary w-full"
		onclick={handleImport}
		disabled={isLoading || !hasAnyFiles}
	>
		{#if isLoading}
			<span class="loading loading-spinner loading-sm"></span>
			インポート中...
		{:else}
			📥 インポート開始
		{/if}
	</button>

	<!-- エラーメッセージ -->
	{#if errorMessage}
		<div class="alert alert-error">
			<span>⚠️ {errorMessage}</span>
		</div>
	{/if}

	<!-- インポート結果 -->
	{#if result}
		<div class="rounded-box border-success space-y-3 border p-4">
			<h3 class="text-success flex items-center gap-2 font-bold">✅ インポート完了</h3>
			<div class="grid grid-cols-2 gap-3">
				<div class="bg-base-200 rounded-box p-3 text-center">
					<div class="text-2xl font-bold">{result.importedCount}</div>
					<div class="text-base-content/60 text-xs">インポート成功</div>
				</div>
				{#if result.skippedCount > 0}
					<div class="bg-base-200 rounded-box p-3 text-center">
						<div class="text-2xl font-bold">{result.skippedCount}</div>
						<div class="text-base-content/60 text-xs">スキップ</div>
					</div>
				{/if}
			</div>
			{#if result.errors.length > 0}
				<div class="alert alert-warning">
					<div class="w-full">
						<p class="text-sm font-medium">一部のファイルのインポートに失敗しました:</p>
						<ul class="mt-1 list-inside list-disc space-y-0.5 text-xs">
							{#each result.errors as err}
								<li>{err}</li>
							{/each}
						</ul>
					</div>
				</div>
			{/if}
			<p class="text-base-content/60 text-sm">
				インポートされたノートは
				<a href="/home" class="link link-primary">BOX</a> で確認できます。
			</p>
		</div>
	{/if}
</div>
