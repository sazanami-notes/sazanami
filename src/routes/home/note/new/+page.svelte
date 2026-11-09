<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import TiptapEditor from '$lib/components/TiptapEditor.svelte';

	let title = $state('');
	let content = $state('');
	let isPublic = $state(false);
	let titleError = $state('');
	let isCreating = $state(false);
	// 作成済みノートのID。null以外なら作成済み＝これ以上POSTしない（二重作成防止）
	let createdId = $state<string | null>(null);

	const urlStatus = $page.url.searchParams.get('status') || 'inbox';
	const isBoxNote = urlStatus === 'box';

	let autoCreateTimer: ReturnType<typeof setTimeout> | undefined;

	// 予約済みの自動作成タイマーを止める
	function cancelAutoCreate() {
		if (autoCreateTimer) {
			clearTimeout(autoCreateTimer);
			autoCreateTimer = undefined;
		}
	}

	const handleContentChange = (value: { markdown: string; html: string }) => {
		content = value.markdown;
	};

	// 作成処理の唯一の入口（自動作成・POSTボタンの両方から呼ぶ）。
	// isCreating / createdId のガードで二重送信を必ず防ぐ。
	async function createNote(options: { auto: boolean }): Promise<string | null> {
		if (isCreating || createdId) return createdId;

		const trimmedTitle = title.trim();
		const trimmedContent = content.trim();

		// boxノートはタイトル必須
		if (isBoxNote && !trimmedTitle) {
			if (!options.auto) titleError = 'Boxのノートにはタイトルが必要です';
			return null;
		}
		if (!trimmedTitle && !trimmedContent) {
			if (!options.auto) titleError = 'タイトルか本文を入力してください';
			return null;
		}

		isCreating = true;
		titleError = '';

		try {
			// オフライン時は新規作成できない（IDが返らないため遷移できない）
			if (typeof navigator !== 'undefined' && !navigator.onLine) {
				titleError = 'オフラインです。オンライン復帰後に作成してください';
				return null;
			}

			const response = await fetch('/api/notes', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: trimmedTitle || 'Untitled Note',
					content: trimmedContent,
					isPublic,
					// boxノートはタイムラインに載せない
					skipTimeline: isBoxNote,
					status: urlStatus
				})
			});

			if (response.status === 409) {
				const err = (await response.json()) as { message?: string };
				titleError = err.message || '同じタイトルのノートが既に存在します';
				return null;
			}
			if (!response.ok) {
				console.error('Failed to create note', await response.text());
				titleError = 'ノートの作成に失敗しました';
				return null;
			}

			const newNote = (await response.json()) as { id?: string };
			if (!newNote?.id) {
				console.error('Created note has no id', newNote);
				titleError = 'ノートの作成に失敗しました';
				return null;
			}

			// ここで作成済みを確定させ、以降の送信経路を塞ぐ
			createdId = newNote.id;
			cancelAutoCreate();
			await goto(`/home/note/${newNote.id}`, { replaceState: true });
			return newNote.id;
		} catch (error) {
			console.error('Error creating note', error);
			titleError = createdId
				? 'ノートは作成されました。一覧から開き直してください'
				: 'ノートの作成に失敗しました';
			return createdId;
		} finally {
			isCreating = false;
		}
	}

	// 入力が落ち着いたら自動で作成して詳細へ遷移する（POSTボタンはそのフォールバック）
	$effect(() => {
		const trimmedTitle = title.trim();
		const trimmedContent = content.trim();

		// 作成中・作成済みなら新しいタイマーは張らない
		if (isCreating || createdId) {
			cancelAutoCreate();
			return;
		}

		// boxノートはタイトルが入力されるまで自動作成しない
		if (isBoxNote && !trimmedTitle) {
			cancelAutoCreate();
			return;
		}

		if (!trimmedTitle && !trimmedContent) {
			cancelAutoCreate();
			return;
		}

		cancelAutoCreate();
		autoCreateTimer = setTimeout(() => {
			autoCreateTimer = undefined;
			void createNote({ auto: true });
		}, 1000); // 1秒 debounce

		return () => cancelAutoCreate();
	});

	// 自動作成が走っていない場合のフォールバック。作成処理は createNote に集約する
	const handleSubmit = async (event: SubmitEvent) => {
		event.preventDefault();
		// 予約済みの自動作成を止めてから、同じ作成処理を1回だけ呼ぶ
		cancelAutoCreate();
		await createNote({ auto: false });
	};
</script>

<div class="mx-auto w-full max-w-3xl px-4 py-4 sm:px-6 sm:py-6">
	<form method="post" onsubmit={handleSubmit} class="space-y-4">
		<!-- ダークツールバー: 戻る・画面名・POST -->
		<header
			class="rounded-box sticky top-0 z-20 flex items-center justify-between gap-2 bg-[#304962] px-3 py-2 text-white shadow sm:px-4"
		>
			<a
				href={isBoxNote ? '/home/box' : '/home'}
				class="btn btn-ghost btn-sm gap-1 border-none px-2 text-white/80 hover:bg-white/10 hover:text-white"
				title="戻る"
				aria-label="戻る"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="h-4 w-4"
					aria-hidden="true"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
				</svg>
				<span class="hidden sm:inline">戻る</span>
			</a>

			<h1 class="truncate text-sm font-bold tracking-wide sm:text-base">新規ノート</h1>

			<button
				type="submit"
				class="btn btn-sm bg-primary text-primary-content hover:bg-primary/90 disabled:bg-primary/50 min-w-20 border-none font-bold"
				disabled={isCreating || createdId !== null}
			>
				{#if isCreating}
					<span class="loading loading-spinner loading-xs"></span>
					<span class="sr-only">作成中</span>
				{:else}
					POST
				{/if}
			</button>
		</header>

		<!-- タイトル -->
		<div class="px-1">
			<div class="mb-1 flex items-center gap-2">
				<label for="title" class="text-base-content/50 text-xs font-bold tracking-wide">
					タイトル
				</label>
				{#if isBoxNote}
					<span class="badge badge-warning badge-xs">必須</span>
				{/if}
			</div>
			<input
				type="text"
				id="title"
				name="title"
				bind:value={title}
				placeholder={isBoxNote ? 'タイトル（必須）' : 'タイトル（任意）'}
				class="placeholder:text-base-content/40 w-full bg-transparent px-1 py-1 text-xl font-bold focus:outline-none sm:text-2xl"
			/>
			{#if titleError}
				<p class="text-error px-1 pt-1 text-sm">{titleError}</p>
			{/if}
		</div>

		<hr class="border-base-300" />

		<!-- 本文 -->
		<div class="card bg-base-100 border-base-200/70 rounded-box border shadow">
			<div class="min-h-[45vh] w-full p-4 sm:min-h-[400px]">
				<TiptapEditor {content} onchange={handleContentChange} placeholder="いま思ったことは…" />
			</div>
		</div>

		<!-- 公開設定 -->
		<div class="flex flex-wrap items-center gap-2 px-1">
			<input
				type="checkbox"
				bind:checked={isPublic}
				id="isPublic"
				name="isPublic"
				class="checkbox checkbox-sm"
			/>
			<label for="isPublic" class="text-base-content/70 text-sm">このノートを公開する</label>
		</div>
	</form>
</div>
