<script lang="ts">
	import JSZip from 'jszip';

	let selectedFiles = $state<File[]>([]);
	let isDragging = $state(false);
	let isLoading = $state(false);
	let result = $state<{
		importedCount: number;
		skippedCount: number;
		errors: string[];
	} | null>(null);
	let errorMessage = $state('');
	let progress = $state({ current: 0, total: 0 });

	let fileInputEl: HTMLInputElement;

	const hasAnyFiles = $derived(selectedFiles.length > 0);

	// 1リクエストあたりの処理数（Cloudflare Workersの制限対策）
	const BATCH_SIZE = 25;

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
		progress = { current: 0, total: 0 };
		if (fileInputEl) fileInputEl.value = '';
	}

	/** 選択されたファイル（ZIP / md）からMarkdownファイルを集める（ZIPはブラウザ内で展開） */
	async function collectMarkdownFiles(files: File[]): Promise<{ name: string; content: string }[]> {
		const collected: { name: string; content: string }[] = [];

		for (const file of files) {
			const lower = file.name.toLowerCase();
			if (lower.endsWith('.zip')) {
				const zip = await JSZip.loadAsync(await file.arrayBuffer());
				const promises: Promise<void>[] = [];
				zip.forEach((path, entry) => {
					if (
						entry.dir ||
						path.startsWith('__MACOSX/') ||
						(path.split('/').pop() ?? '').startsWith('.') ||
						!path.toLowerCase().endsWith('.md')
					) {
						return;
					}
					const base = path.split('/').pop() ?? path;
					promises.push(
						entry.async('string').then((content) => {
							collected.push({ name: base, content });
						})
					);
				});
				await Promise.all(promises);
			} else if (lower.endsWith('.md')) {
				collected.push({ name: file.name, content: await file.text() });
			}
		}
		return collected;
	}

	async function handleImport() {
		if (!hasAnyFiles) {
			errorMessage = 'ファイルを選択またはドロップしてください。';
			return;
		}

		isLoading = true;
		result = null;
		errorMessage = '';
		progress = { current: 0, total: 0 };

		try {
			// 1. ブラウザ内でZIPを展開してMarkdownを集める
			const mdFiles = await collectMarkdownFiles(selectedFiles);
			if (mdFiles.length === 0) {
				errorMessage = 'Markdownファイルが見つかりませんでした。';
				return;
			}

			// 2. バッチに分けて順次送信（進捗表示つき）
			progress = { current: 0, total: mdFiles.length };
			let totalImported = 0;
			let totalSkipped = 0;
			const allErrors: string[] = [];

			for (let i = 0; i < mdFiles.length; i += BATCH_SIZE) {
				const batch = mdFiles.slice(i, i + BATCH_SIZE);
				const formData = new FormData();
				for (const f of batch) {
					formData.append('files', new File([f.content], f.name, { type: 'text/markdown' }));
				}

				const response = await fetch('/api/notes/import', {
					method: 'POST',
					body: formData
				});
				const data = (await response.json()) as {
					importedCount?: number;
					skippedCount?: number;
					errors?: string[];
					message?: string;
				};

				if (response.ok) {
					totalImported += data.importedCount ?? 0;
					totalSkipped += data.skippedCount ?? 0;
					allErrors.push(...(data.errors ?? []));
				} else {
					allErrors.push(
						`バッチ ${Math.floor(i / BATCH_SIZE) + 1} の処理に失敗: ${data.message || '不明なエラー'}`
					);
				}

				progress = { current: Math.min(i + BATCH_SIZE, mdFiles.length), total: mdFiles.length };
			}

			result = {
				importedCount: totalImported,
				skippedCount: totalSkipped,
				errors: allErrors
			};
			selectedFiles = [];
			if (fileInputEl) fileInputEl.value = '';
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
			Frontmatterのタグ・更新日時も取り込み、[[リンク]]は自動で解決されます。<br />
			インポートされたノートは
			<span class="badge badge-sm badge-outline">BOX</span> に保存されます。
		</p>
	</div>

	<!-- インポート手順 -->
	<div class="collapse-arrow bg-base-200 rounded-box collapse">
		<input type="checkbox" />
		<div class="collapse-title font-medium">Obsidianからのエクスポート手順</div>
		<div class="collapse-content space-y-1 text-sm">
			<ol class="list-inside list-decimal space-y-1">
				<li>ObsidianのVaultフォルダを開く</li>
				<li>フォルダ全体（または必要なフォルダ）を選択してZIPに圧縮</li>
				<li>できあがったZIPファイルをここにドロップするかファイル選択してインポート</li>
			</ol>
			<p class="text-base-content/60 mt-2">
				※ フォルダ構造は無視されます。すべてのMarkdownファイルがBOXにインポートされます。<br />
				※ 同じタイトルのノートが既にある場合はスキップされます。<br />
				※ 大量のファイルは自動で分割して処理されます（進捗が表示されます）。
			</p>
		</div>
	</div>

	<!-- ドロップゾーン -->
	<div
		role="button"
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
				{#each selectedFiles as file, i (file.name)}
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

	<!-- 進捗表示 -->
	{#if isLoading && progress.total > 0}
		<div class="space-y-1">
			<div class="text-base-content/60 flex justify-between text-xs">
				<span>処理中...</span>
				<span>{progress.current} / {progress.total} ノート</span>
			</div>
			<progress
				class="progress progress-primary w-full"
				value={progress.current}
				max={progress.total}
			></progress>
		</div>
	{/if}

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
							{#each result.errors.slice(0, 10) as err (err)}
								<li>{err}</li>
							{/each}
							{#if result.errors.length > 10}
								<li>…ほか {result.errors.length - 10} 件</li>
							{/if}
						</ul>
					</div>
				</div>
			{/if}
			<p class="text-base-content/60 text-sm">
				インポートされたノートは
				<a href="/home/box" class="link link-primary">BOX</a> で確認できます。
			</p>
		</div>
	{/if}
</div>
