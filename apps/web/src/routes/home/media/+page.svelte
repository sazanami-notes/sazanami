<script lang="ts">
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	let attachments = $derived(data.attachments);
	let copiedId = $state<string | null>(null);
	let deletingId = $state<string | null>(null);
	let confirmDeleteId = $state<string | null>(null);

	// ファイルサイズを人間が読みやすい形式に変換
	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function formatDate(date: Date | string | number | null): string {
		if (!date) return '';
		const d = new Date(date);
		return d.toLocaleDateString('ja-JP', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// URLをクリップボードにコピー
	async function copyUrl(attachment: (typeof attachments)[number]) {
		const url = attachment.filePath.startsWith('http')
			? attachment.filePath
			: `${location.origin}${attachment.filePath}`;
		await navigator.clipboard.writeText(url);
		copiedId = attachment.id;
		setTimeout(() => {
			copiedId = null;
		}, 2000);
	}

	// Markdown 形式でURLをコピー
	async function copyMarkdown(attachment: (typeof attachments)[number]) {
		const url = attachment.filePath.startsWith('http')
			? attachment.filePath
			: `${location.origin}${attachment.filePath}`;
		const md = `![${attachment.fileName}](${url})`;
		await navigator.clipboard.writeText(md);
		copiedId = attachment.id + '_md';
		setTimeout(() => {
			copiedId = null;
		}, 2000);
	}

	// 削除
	async function deleteAttachment(id: string) {
		deletingId = id;
		try {
			const res = await fetch(`/api/attachments?id=${encodeURIComponent(id)}`, {
				method: 'DELETE'
			});
			if (res.ok) {
				confirmDeleteId = null;
				await invalidateAll();
			} else {
				alert('削除に失敗しました。');
			}
		} finally {
			deletingId = null;
		}
	}

	// ドラッグ & ドロップ / ファイル選択でのアップロード
	let isDragging = $state(false);
	let isUploading = $state(false);
	let uploadProgress = $state(0);
	let fileInputEl: HTMLInputElement;

	async function uploadFiles(files: FileList | File[]) {
		const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
		if (imageFiles.length === 0) {
			alert('画像ファイルのみアップロードできます。');
			return;
		}

		isUploading = true;
		let uploaded = 0;

		for (const file of imageFiles) {
			if (file.size > 10 * 1024 * 1024) {
				alert(`${file.name} は10MB を超えているためスキップしました。`);
				continue;
			}
			const fd = new FormData();
			fd.append('file', file);

			await new Promise<void>((resolve) => {
				const xhr = new XMLHttpRequest();
				xhr.open('POST', '/api/attachments');
				xhr.upload.onprogress = (e) => {
					if (e.lengthComputable) {
						uploadProgress = Math.round((e.loaded / e.total) * 100);
					}
				};
				xhr.onload = () => {
					uploaded++;
					uploadProgress = Math.round((uploaded / imageFiles.length) * 100);
					resolve();
				};
				xhr.onerror = () => {
					alert(`${file.name} のアップロードに失敗しました。`);
					resolve();
				};
				xhr.send(fd);
			});
		}

		isUploading = false;
		uploadProgress = 0;
		await invalidateAll();
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		isDragging = true;
	}

	function handleDragLeave() {
		isDragging = false;
	}

	async function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		if (e.dataTransfer?.files) {
			await uploadFiles(e.dataTransfer.files);
		}
	}

	async function handleFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files) {
			await uploadFiles(input.files);
			input.value = '';
		}
	}
</script>

<svelte:head>
	<title>メディア一覧 - Sazanami</title>
	<meta name="description" content="アップロードした画像の一覧" />
</svelte:head>

<div class="flex h-full flex-col">
	<!-- ヘッダー -->
	<div class="border-base-300 flex items-center justify-between border-b px-4 py-3">
		<div>
			<h1 class="text-lg font-bold">メディア一覧</h1>
			<p class="text-base-content/60 text-xs">{attachments.length} 件のファイル</p>
		</div>
		<button
			class="btn btn-primary btn-sm gap-2"
			onclick={() => fileInputEl?.click()}
			disabled={isUploading}
		>
			{#if isUploading}
				<span class="loading loading-spinner loading-xs"></span>
				{uploadProgress}%
			{:else}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-4 w-4"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
					/>
				</svg>
				アップロード
			{/if}
		</button>
		<input
			bind:this={fileInputEl}
			type="file"
			accept="image/*"
			multiple
			class="hidden"
			onchange={handleFileChange}
		/>
	</div>

	<!-- ドロップゾーン + コンテンツ -->
	<div
		class="flex-1 overflow-y-auto p-4"
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		ondrop={handleDrop}
		role="region"
		aria-label="メディアドロップゾーン"
	>
		<!-- ドラッグ中オーバーレイ -->
		{#if isDragging}
			<div
				class="border-primary bg-primary/10 pointer-events-none fixed inset-0 z-50 flex items-center justify-center border-4 border-dashed"
			>
				<div class="text-center">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="text-primary mx-auto mb-2 h-12 w-12"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
						/>
					</svg>
					<p class="text-primary text-xl font-bold">ドロップして画像をアップロード</p>
				</div>
			</div>
		{/if}

		{#if attachments.length === 0}
			<!-- 空の状態 -->
			<div
				class="border-base-300 flex h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="text-base-content/30 mb-3 h-12 w-12"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.5"
						d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
					/>
				</svg>
				<p class="text-base-content/50 text-sm font-medium">画像がまだありません</p>
				<p class="text-base-content/40 mt-1 text-xs">
					ファイルをドロップするか「アップロード」ボタンを押してください
				</p>
			</div>
		{:else}
			<!-- 画像グリッド -->
			<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
				{#each attachments as item (item.id)}
					<div
						class="bg-base-200 group relative overflow-hidden rounded-xl transition-shadow hover:shadow-md"
					>
						<!-- サムネイル -->
						<div class="bg-base-300 relative aspect-square overflow-hidden">
							{#if item.mimeType.startsWith('image/')}
								<img
									src={item.filePath.startsWith('http')
										? item.filePath
										: item.filePath}
									alt={item.fileName}
									class="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
									loading="lazy"
								/>
							{:else}
								<div class="flex h-full items-center justify-center">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="text-base-content/30 h-10 w-10"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
										/>
									</svg>
								</div>
							{/if}

							<!-- ホバー時オーバーレイ -->
							<div
								class="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
							>
								<button
									class="btn btn-circle btn-sm btn-ghost text-white tooltip tooltip-bottom"
									data-tip="URLをコピー"
									onclick={() => copyUrl(item)}
									title="URLをコピー"
								>
									{#if copiedId === item.id}
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-4 w-4 text-green-400"
											viewBox="0 0 20 20"
											fill="currentColor"
										>
											<path
												fill-rule="evenodd"
												d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
												clip-rule="evenodd"
											/>
										</svg>
									{:else}
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-4 w-4"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
											/>
										</svg>
									{/if}
								</button>

								<button
									class="btn btn-circle btn-sm btn-ghost text-white tooltip tooltip-bottom"
									data-tip="Markdownでコピー"
									onclick={() => copyMarkdown(item)}
									title="Markdown形式でコピー"
								>
									{#if copiedId === item.id + '_md'}
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-4 w-4 text-green-400"
											viewBox="0 0 20 20"
											fill="currentColor"
										>
											<path
												fill-rule="evenodd"
												d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
												clip-rule="evenodd"
											/>
										</svg>
									{:else}
										<span class="text-xs font-bold">MD</span>
									{/if}
								</button>

								<button
									class="btn btn-circle btn-sm btn-ghost text-white tooltip tooltip-bottom"
									data-tip="削除"
									onclick={() => (confirmDeleteId = item.id)}
									title="削除"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="h-4 w-4 text-red-400"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
										/>
									</svg>
								</button>
							</div>
						</div>

						<!-- ファイル情報 -->
						<div class="p-2">
							<p class="truncate text-xs font-medium" title={item.fileName}>{item.fileName}</p>
							<p class="text-base-content/50 mt-0.5 text-xs">
								{formatFileSize(item.fileSize)} · {formatDate(item.createdAt)}
							</p>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- 削除確認モーダル -->
{#if confirmDeleteId}
	<div class="modal modal-open z-50">
		<div class="modal-box">
			<h3 class="text-lg font-bold">画像を削除</h3>
			<p class="py-4 text-sm">
				この画像を削除しますか？<br />
				<span class="text-warning text-xs">ノート内でこの画像を参照している場合、表示されなくなります。</span
				>
			</p>
			<div class="modal-action">
				<button class="btn btn-ghost btn-sm" onclick={() => (confirmDeleteId = null)}>
					キャンセル
				</button>
				<button
					class="btn btn-error btn-sm"
					disabled={deletingId === confirmDeleteId}
					onclick={() => confirmDeleteId && deleteAttachment(confirmDeleteId)}
				>
					{#if deletingId === confirmDeleteId}
						<span class="loading loading-spinner loading-xs"></span>
					{/if}
					削除する
				</button>
			</div>
		</div>
		<div class="modal-backdrop" onclick={() => (confirmDeleteId = null)} role="none"></div>
	</div>
{/if}
