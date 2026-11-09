<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Editor, type Extensions } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import Placeholder from '@tiptap/extension-placeholder';
	import Link from '@tiptap/extension-link';
	import Image from '@tiptap/extension-image';
	import { Table } from '@tiptap/extension-table';
	import { TableRow } from '@tiptap/extension-table-row';
	import { TableCell } from '@tiptap/extension-table-cell';
	import { TableHeader } from '@tiptap/extension-table-header';
	import TaskItem from '@tiptap/extension-task-item';
	import TaskList from '@tiptap/extension-task-list';
	import { createLowlight, all } from 'lowlight';
	import { CodeBlockWithLanguage } from './extensions/CodeBlockWithLanguage';
	import { WikiLinkMark } from './extensions/WikiLinkMark';
	import { NoteEmbedNode } from './extensions/NoteEmbedNode';
	import { YoutubeNode, isYoutubeUrl } from './extensions/YoutubeNode';
	import { Markdown } from '@tiptap/markdown';
	import DragHandle from '@tiptap/extension-drag-handle';
	import { goto } from '$app/navigation';
	import { toAvifOrOriginal } from '$lib/utils/image-convert';

	const lowlight = createLowlight(all);

	type Props = {
		content?: string;
		editable?: boolean;
		placeholder?: string;
		showBlockHandle?: boolean;
		onchange?: (event: { markdown: string; html: string }) => void;
	};

	let {
		content = '',
		editable = true,
		placeholder = 'Write something...',
		showBlockHandle = true,
		onchange
	}: Props = $props();

	// Yjs/CollaborationはHocuspocusサーバー未設置のため無効化（2026-08-17）。
	// 共同編集を有効化する場合は、サーバー設置後にCollaboration拡張とYjs初期化を復活させること。
	// ※Collaboration有効時はYjsドキュメントが空のままProseMirrorを巻き戻す問題を確認済み

	let element: HTMLElement;
	let editor: Editor | null = $state(null);
	let lastSyncedMarkdown = $state('');

	// 画像アップロード関連
	let isUploading = $state(false);
	let uploadProgress = $state(0);
	let fileInputEl = $state<HTMLInputElement>();

	// ノートコンパイザ（選択範囲を切り出して新規ノート化 → 元の場所に埋め込み）
	let hasSelection = $state(false);
	let showExtractDialog = $state(false);
	let extractTitle = $state('');
	let extractError = $state('');
	let extracting = $state(false);
	let toastMessage = $state('');
	let toastTimer: ReturnType<typeof setTimeout>;

	function normalizeMarkdown(markdown: string) {
		return markdown
			.replace(/\u00a0/g, ' ')
			.replace(/^[^\S\n]*&nbsp;[^\S\n]*$/gm, '')
			.replace(/&nbsp;/g, ' ');
	}

	/**
	 * Markdown由来の「URLだけの段落」をYouTube埋め込みノードに置き換える。
	 * 保存形式はURL文字列のままなので他ツールとも相互運用できる。
	 */
	function normalizeYoutubeBlocks(ed: Editor) {
		const { state } = ed;
		const targets: { pos: number; size: number; src: string }[] = [];
		state.doc.descendants((node, pos) => {
			if (node.type.name !== 'paragraph' || node.childCount !== 1) return;
			const child = node.firstChild;
			if (!child?.isText) return;
			const text = (child.text || '').trim();
			if (isYoutubeUrl(text)) targets.push({ pos, size: node.nodeSize, src: text });
		});
		if (targets.length === 0) return;

		const tr = state.tr;
		for (const t of targets.reverse()) {
			tr.replaceWith(t.pos, t.pos + t.size, state.schema.nodes.youtube.create({ src: t.src }));
		}
		tr.setMeta('addToHistory', false);
		ed.view.dispatch(tr);
	}

	// --- 画像アップロード処理 ---
	async function uploadImageFile(file: File): Promise<string | null> {
		if (!file.type.startsWith('image/')) return null;
		if (file.size > 10 * 1024 * 1024) {
			alert('画像ファイルのサイズは10MB以下にしてください。');
			return null;
		}

		isUploading = true;
		uploadProgress = 0;

		try {
			// JPEG/PNG/WebPはブラウザ側でAVIFに変換してから送る（失敗時は元ファイル）
			const uploadFile = await toAvifOrOriginal(file);
			if (uploadFile.size > 10 * 1024 * 1024) {
				alert('画像ファイルのサイズは10MB以下にしてください。');
				return null;
			}

			const formData = new FormData();
			formData.append('file', uploadFile);

			// XMLHttpRequest でプログレス表示
			const url = await new Promise<string>((resolve, reject) => {
				const xhr = new XMLHttpRequest();
				xhr.open('POST', '/api/attachments');
				xhr.upload.onprogress = (e) => {
					if (e.lengthComputable) {
						uploadProgress = Math.round((e.loaded / e.total) * 100);
					}
				};
				xhr.onload = () => {
					if (xhr.status === 201) {
						const data = JSON.parse(xhr.responseText);
						resolve(data.url);
					} else {
						reject(new Error('Upload failed: ' + xhr.status));
					}
				};
				xhr.onerror = () => reject(new Error('Network error'));
				xhr.send(formData);
			});

			return url;
		} catch (err) {
			console.error('Image upload error:', err);
			alert('画像のアップロードに失敗しました。');
			return null;
		} finally {
			isUploading = false;
			uploadProgress = 0;
		}
	}

	async function insertImageFromFile(file: File) {
		const url = await uploadImageFile(file);
		if (url && editor) {
			editor.chain().focus().setImage({ src: url, alt: file.name }).run();
		}
	}

	function handleImageButtonClick() {
		fileInputEl?.click();
	}

	async function handleFileInputChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			await insertImageFromFile(file);
			input.value = ''; // リセット
		}
	}

	// --- Notion風ブロックハンドル ---
	let showBlockMenu = $state(false);
	let blockMenuPos = $state({ top: 0, left: 0 });
	let activeBlockPos = $state<number | null>(null);

	const blockTypes = [
		{ id: 'paragraph', label: 'テキスト' },
		{ id: 'h1', label: '見出し1' },
		{ id: 'h2', label: '見出し2' },
		{ id: 'h3', label: '見出し3' },
		{ id: 'bulletList', label: '箇条書き' },
		{ id: 'orderedList', label: '番号付きリスト' },
		{ id: 'taskList', label: 'チェックリスト' },
		{ id: 'blockquote', label: '引用' },
		{ id: 'codeBlock', label: 'コード' }
	];

	function openBlockMenu(handleEl: HTMLElement) {
		const rect = handleEl.getBoundingClientRect();
		blockMenuPos = { top: rect.bottom + 6, left: Math.max(8, rect.left - 150) };
		showBlockMenu = true;
	}

	function convertBlock(type: string) {
		if (!editor || activeBlockPos === null) return;
		const chain = editor.chain().focus().setNodeSelection(activeBlockPos);
		switch (type) {
			case 'paragraph':
				chain.setParagraph().run();
				break;
			case 'h1':
				chain.setHeading({ level: 1 }).run();
				break;
			case 'h2':
				chain.setHeading({ level: 2 }).run();
				break;
			case 'h3':
				chain.setHeading({ level: 3 }).run();
				break;
			case 'bulletList':
				chain.toggleBulletList().run();
				break;
			case 'orderedList':
				chain.toggleOrderedList().run();
				break;
			case 'taskList':
				chain.toggleTaskList().run();
				break;
			case 'blockquote':
				chain.toggleBlockquote().run();
				break;
			case 'codeBlock':
				chain.toggleCodeBlock().run();
				break;
		}
		showBlockMenu = false;
	}

	// メニュー外クリックで閉じる
	$effect(() => {
		if (!showBlockMenu || typeof window === 'undefined') return;
		const handler = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			if (!target.closest('.block-menu')) showBlockMenu = false;
		};
		document.addEventListener('click', handler);
		return () => document.removeEventListener('click', handler);
	});

	// --- WikiLink サジェスト ---
	type Suggestion = { id: string; title: string; slug: string };
	let suggestions: Suggestion[] = $state([]);
	let showSuggestions = $state(false);
	let suggestionQuery = $state('');
	let selectedIndex = $state(0);
	let suggestionPos = $state({ top: 0, left: 0 });
	let suggestContainer: HTMLElement = $state(null as unknown as HTMLElement);
	let debounceTimer: ReturnType<typeof setTimeout>;

	async function fetchSuggestions(q: string) {
		try {
			const res = await fetch(`/api/notes/suggestions?q=${encodeURIComponent(q)}`);
			if (res.ok) {
				suggestions = await res.json();
				selectedIndex = 0;
			}
		} catch {
			suggestions = [];
		}
	}

	/** HTMLエスケープ（属性・本文用） */
	function escapeHtml(value: string) {
		return value
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

	/**
	 * URLを貼った時にページタイトルを取得して [タイトル](URL) に差し替える。
	 * 取得できなければURLのまま（ユーザーの入力を壊さない）。
	 */
	async function insertUrlWithTitle(url: string) {
		if (!editor) return;
		const insertAt = editor.state.selection.from;
		editor
			.chain()
			.focus()
			.insertContent(`<a href="${escapeHtml(url)}">${escapeHtml(url)}</a> `)
			.run();

		try {
			const res = await fetch(`/api/link-title?url=${encodeURIComponent(url)}`);
			if (!res.ok) return;
			const data = (await res.json()) as { ok?: boolean; title?: string | null };
			const title = data?.title?.trim();
			if (!data?.ok || !title) return;

			// ユーザーが編集していたら触らない（同じ位置にURLが残っている時だけ差し替え）
			const doc = editor.state.doc;
			const end = insertAt + url.length;
			if (end > doc.content.size) return;
			if (doc.textBetween(insertAt, end, '') !== url) return;

			editor
				.chain()
				.focus()
				.insertContentAt(
					{ from: insertAt, to: end },
					`<a href="${escapeHtml(url)}">${escapeHtml(title)}</a>`
				)
				.run();
		} catch {
			// 取得失敗時はURLのまま
		}
	}

	/**
	 * Markdown由来の「![[タイトル]]だけの段落」を埋め込みノードに置き換える。
	 * （ノードを直接insertContentすると段落内の選択位置で失敗することがあるため、
	 *   一度テキストとして差し込んでから正規化する）
	 */
	function normalizeNoteEmbeds(ed: Editor) {
		const { state } = ed;
		const targets: { pos: number; size: number; title: string }[] = [];
		state.doc.descendants((node, pos) => {
			if (node.type.name !== 'paragraph' || node.childCount !== 1) return;
			const child = node.firstChild;
			if (!child?.isText) return;
			const text = (child.text || '').trim();
			const m = text.match(/^!\[\[([^\]\n]+)\]\]$/);
			if (m) targets.push({ pos, size: node.nodeSize, title: m[1].trim() });
		});
		if (targets.length === 0) return;

		const tr = state.tr;
		for (const t of targets.reverse()) {
			tr.replaceWith(
				t.pos,
				t.pos + t.size,
				state.schema.nodes.noteEmbed.create({ title: t.title })
			);
		}
		tr.setMeta('addToHistory', false);
		ed.view.dispatch(tr);
	}

	/** 短い通知を4秒表示する */
	function showToast(message: string) {
		toastMessage = message;
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toastMessage = ''), 4000);
	}

	/** 選択範囲を切り出すダイアログを開く（選択が無ければ何もしない） */
	function openExtractDialog() {
		if (!editor) return;
		const { from, to } = editor.state.selection;
		if (from === to) return;
		const text = editor.state.doc.textBetween(from, to, '\n').trim();
		if (!text) return;
		const firstLine = text
			.split('\n')[0]
			.replace(/^#+\s*/, '')
			.trim();
		extractTitle = firstLine.slice(0, 60);
		extractError = '';
		showExtractDialog = true;
	}

	/** 選択範囲を新規ノートとして保存し、元の位置に ![[タイトル]] を差し込む */
	async function confirmExtract() {
		if (!editor || extracting) return;
		const title = extractTitle.trim();
		if (!title) {
			extractError = 'タイトルを入力してください';
			return;
		}
		const { from, to } = editor.state.selection;
		if (from === to) {
			showExtractDialog = false;
			return;
		}

		// 選択範囲のMarkdownを組み立てる（Tiptap Markdownのシリアライザを使う）
		const sliceJson = editor.state.doc.cut(from, to).toJSON();
		const markdown = editor.markdown
			? editor.markdown.serialize(sliceJson)
			: editor.state.doc.textBetween(from, to, '\n\n');

		// 先にエディタへ埋め込みを差し込む。
		// （fetchをawaitしてから編集すると、その間に選択位置がずれて挿入に失敗する）
		const tr = editor.state.tr;
		tr.deleteRange(from, to);
		tr.insertText(`![[${title}]]`, from);
		editor.view.dispatch(tr);
		normalizeNoteEmbeds(editor);
		editor.view.focus();

		extracting = true;
		extractError = '';
		showExtractDialog = false;
		try {
			const res = await fetch('/api/notes', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title, content: markdown, status: 'box' })
			});
			const data = (await res.json()) as { id?: string; title?: string; message?: string };
			if (!res.ok) {
				// 作成できなかったらエディタを元に戻す
				editor.commands.undo();
				extractError = data?.message ?? 'ノートの作成に失敗しました';
				showExtractDialog = true;
				return;
			}
			showToast(`「${title}」を切り出しました`);
		} catch {
			editor.commands.undo();
			extractError = '通信エラーが発生しました';
			showExtractDialog = true;
		} finally {
			extracting = false;
		}
	}

	function updateSuggestionPosition() {
		if (!editor) return;
		// カーソル位置のDOM座標を取得
		const { view } = editor;
		const { from } = view.state.selection;
		const coords = view.coordsAtPos(from);
		const editorRect = element.getBoundingClientRect();
		suggestionPos = {
			top: coords.bottom - editorRect.top + 4,
			left: coords.left - editorRect.left
		};
	}

	function selectSuggestion(suggestion: Suggestion) {
		if (!editor) return;
		const { state } = editor;
		const { from } = state.selection;
		const textBefore = state.doc.textBetween(Math.max(0, from - 50), from, '\n');
		const match = textBefore.match(/(!?)\[\[([^\]\n]*)$/);
		if (!match) return;

		const isEmbed = match[1] === '!';
		const deleteFrom = from - match[0].length;

		if (isEmbed) {
			// 埋め込みノードとして挿入する（Tiptapのコマンドでブロック分割を安全に行う）
			editor
				.chain()
				.focus()
				.deleteRange({ from: deleteFrom, to: from })
				.insertContent({
					type: 'noteEmbed',
					attrs: { title: suggestion.title }
				})
				// 次の段落を用意して入力を続けられるようにする
				.insertContent({ type: 'paragraph' })
				.run();
		} else {
			// 通常のWikiLinkとして挿入
			const text = suggestion.title;

			// 編集トランザクション: 文字列をマーク付きで挿入
			editor
				.chain()
				.focus()
				.deleteRange({ from: deleteFrom, to: from })
				.insertContent(
					`<a class="wiki-link font-medium text-primary hover:underline cursor-pointer transition-colors" data-wiki-link="true">${text}</a> `
				)
				.run();
		}

		showSuggestions = false;
		suggestions = [];
	}

	function handleKeyDown(e: KeyboardEvent): boolean {
		if (!showSuggestions || suggestions.length === 0) return false;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = (selectedIndex + 1) % suggestions.length;
			return true;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = (selectedIndex - 1 + suggestions.length) % suggestions.length;
			return true;
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (suggestions[selectedIndex]) {
				selectSuggestion(suggestions[selectedIndex]);
			}
			return true;
		} else if (e.key === 'Escape') {
			showSuggestions = false;
			suggestions = [];
			return true;
		}
		return false;
	}

	onMount(() => {
		try {
			// Yjs初期化なし（Collaboration無効のため）

			// Build extensions array
			const extensions: Extensions = [
				StarterKit.configure({
					codeBlock: false,
					link: false
				}),
				Placeholder.configure({
					placeholder: placeholder
				}),
				Link.configure({
					openOnClick: false,
					autolink: true
				}),
				Image,
				Table.configure({
					resizable: true
				}),
				TableRow,
				TableHeader,
				TableCell,
				TaskList,
				TaskItem.configure({
					nested: true
				}),
				CodeBlockWithLanguage.configure({
					lowlight
				}),
				WikiLinkMark,
				NoteEmbedNode,
				YoutubeNode,
				Markdown
			];

			// Notion風ブロックハンドル（設定でオンオフ）
			if (showBlockHandle && editable) {
				extensions.push(
					DragHandle.configure({
						render: () => {
							const el = document.createElement('div');
							el.className = 'block-drag-handle';
							el.setAttribute('title', 'ドラッグで移動 / クリックで種類変更');
							el.innerHTML =
								'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.7"/><circle cx="15" cy="6" r="1.7"/><circle cx="9" cy="12" r="1.7"/><circle cx="15" cy="12" r="1.7"/><circle cx="9" cy="18" r="1.7"/><circle cx="15" cy="18" r="1.7"/></svg>';
							el.addEventListener('click', (e) => {
								e.preventDefault();
								e.stopPropagation();
								openBlockMenu(el);
							});
							return el;
						},
						onNodeChange: ({ node }) => {
							if (!node || !editor) {
								activeBlockPos = null;
								return;
							}
							let found = -1;
							editor.state.doc.descendants((n, pos) => {
								if (n === node) {
									found = pos;
									return false;
								}
								return true;
							});
							if (found >= 0) activeBlockPos = found;
						}
					})
				);
			}

			editor = new Editor({
				element: element,
				editable,
				extensions,
				content: normalizeMarkdown(content || ''),
				contentType: 'markdown',
				editorProps: {
					attributes: {
						class:
							'prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-xl focus:outline-none max-w-none min-h-[300px] p-4'
					},
					handleKeyDown(_, event) {
						// Ctrl/Cmd + Shift + X: 選択範囲を新しいノートに切り出す
						if (
							(event.ctrlKey || event.metaKey) &&
							event.shiftKey &&
							event.key.toLowerCase() === 'x'
						) {
							event.preventDefault();
							openExtractDialog();
							return true;
						}
						// trueを返すとtiptapがイベントを消費（デフォルト動作を阻止）
						return handleKeyDown(event);
					},
					handleClick(view, pos, event) {
						if (event.ctrlKey || event.metaKey) {
							const target = event.target as HTMLElement;
							const link = target.closest('a[data-wiki-link="true"]');
							if (link) {
								event.preventDefault();
								const title = link.textContent;
								if (title) {
									fetch(`/api/notes/embed?title=${encodeURIComponent(title)}`)
										.then((res) => {
											if (res.ok) return res.json() as Promise<{ id?: string }>;
											throw new Error('Not found');
										})
										.then((data) => {
											if (data && data.id) {
												goto(`/home/note/${data.id}`);
											}
										})
										.catch((err) => console.error('Failed to open Note:', err));
								}
								return true;
							}
						}
						return false;
					},
					// 画像ペースト対応
					handlePaste(view, event) {
						if (!editable) return false;
						const items = event.clipboardData?.items;
						if (!items) return false;

						for (const item of Array.from(items)) {
							if (item.type.startsWith('image/')) {
								event.preventDefault();
								const file = item.getAsFile();
								if (file) {
									insertImageFromFile(file);
									return true;
								}
							}
						}

						// YouTubeのURLを貼ったら埋め込み（クリックで再生）に変換
						const text = event.clipboardData?.getData('text/plain')?.trim();
						if (text && isYoutubeUrl(text)) {
							event.preventDefault();
							editor
								?.chain()
								.focus()
								.insertContent({ type: 'youtube', attrs: { src: text } })
								.run();
							return true;
						}

						// 素のURLを貼ったらタイトルを取得して [タイトル](URL) にする（失敗時はURLのまま）
						if (text && /^https?:\/\/\S+$/i.test(text)) {
							event.preventDefault();
							void insertUrlWithTitle(text);
							return true;
						}

						return false;
					},
					// 画像ドロップ対応
					handleDrop(view, event) {
						if (!editable) return false;
						const files = event.dataTransfer?.files;
						if (!files || files.length === 0) return false;

						const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
						if (imageFiles.length === 0) return false;

						event.preventDefault();
						imageFiles.forEach((file) => insertImageFromFile(file));
						return true;
					}
				},
				onSelectionUpdate: ({ editor: e }) => {
					const { from, to } = e.state.selection;
					hasSelection = from !== to && e.state.doc.textBetween(from, to, ' ').trim().length > 0;
				},
				onTransaction: ({ editor: e }) => {
					// トランザクションのたびにサジェスト状態を更新
					if (!editable) return;
					const { state } = e;
					const { from } = state.selection;
					const textBefore = state.doc.textBetween(Math.max(0, from - 50), from, '\n');
					const match = textBefore.match(/(!?)\[\[([^\]\n]*)$/);
					if (match) {
						const query = match[2];
						updateSuggestionPosition();
						showSuggestions = true;
						if (query !== suggestionQuery) {
							suggestionQuery = query;
							clearTimeout(debounceTimer);
							debounceTimer = setTimeout(() => fetchSuggestions(query), 150);
						}
					} else {
						showSuggestions = false;
					}
				},
				onUpdate: ({ editor: e }) => {
					// Use Tiptap Markdown natively to export clean MD
					const md = normalizeMarkdown(e.getMarkdown());
					lastSyncedMarkdown = md;
					// 親への通知はonchange経由のみ（contentは読み取り専用prop）

					if (onchange) {
						const html = e.getHTML();
						onchange({ markdown: md, html });
					}
				}
			});

			// 開発時のみ: ブラウザのコンソールからエディタ状態を確認できるようにする
			if (import.meta.env.DEV) {
				const w = window as unknown as { __sznmEditors?: Editor[]; __sznmEditor?: Editor };
				w.__sznmEditors = [...(w.__sznmEditors ?? []), editor];
				w.__sznmEditor = editor;
			}
			lastSyncedMarkdown = normalizeMarkdown(editor.getMarkdown());
			// 既存メモにURLだけ書かれている場合は埋め込みノードに変換する
			normalizeYoutubeBlocks(editor);
		} catch (error) {
			console.error('Editor init error:', error);
			alert('エディタの読み込みに失敗しました: ' + (error as Error).message);
		}
	});

	export function getMarkdownContent() {
		return editor ? editor.getMarkdown() : content;
	}

	export function getHTMLContent() {
		return editor ? editor.getHTML() : '';
	}

	onDestroy(() => {
		if (editor) {
			editor.destroy();
		}
		clearTimeout(debounceTimer);
	});

	$effect(() => {
		if (editor && editable !== editor.isEditable) {
			editor.setEditable(editable);
		}
	});

	let isUpdatingInternal = false;

	$effect(() => {
		if (editor && content !== undefined && !isUpdatingInternal) {
			const normalizedIncoming = normalizeMarkdown(content);
			const normalizedEditor = normalizeMarkdown(editor.getMarkdown());

			// Skip internal echo updates and only apply true external changes.
			if (normalizedIncoming !== normalizedEditor && normalizedIncoming !== lastSyncedMarkdown) {
				isUpdatingInternal = true;
				lastSyncedMarkdown = normalizedIncoming;
				editor.commands.setContent(normalizedIncoming, { contentType: 'markdown' });
				normalizeYoutubeBlocks(editor);
				setTimeout(() => {
					isUpdatingInternal = false;
				}, 10);
			}
		}
	});
</script>

<div
	class="focus-within:border-primary focus-within:ring-primary bg-base-100 border-base-300 relative rounded-md border shadow-sm focus-within:ring-1"
>
	<!-- 画像アップロードボタン（編集モードのみ表示） -->
	{#if editable}
		<div class="border-base-300 flex items-center gap-1 border-b px-2 py-1">
			<button
				type="button"
				onclick={handleImageButtonClick}
				disabled={isUploading}
				class="btn btn-ghost btn-xs tooltip tooltip-bottom gap-1"
				data-tip="画像を挿入"
				title="画像をアップロード"
			>
				{#if isUploading}
					<span class="loading loading-spinner loading-xs"></span>
					<span class="text-xs">{uploadProgress}%</span>
				{:else}
					<!-- Image icon -->
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
							d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
						/>
					</svg>
					<span class="hidden text-xs sm:inline">画像</span>
				{/if}
			</button>

			<button
				type="button"
				onclick={openExtractDialog}
				disabled={!hasSelection}
				class="btn btn-ghost btn-xs tooltip tooltip-bottom gap-1"
				data-tip="選択範囲を新しいノートに切り出す（Ctrl+Shift+X）"
				title="ノートに切り出す"
			>
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
						d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7"
					/>
				</svg>
				<span class="hidden text-xs sm:inline">切り出し</span>
			</button>

			<span class="text-base-content/40 text-xs"> 画像のペースト・ドロップも対応 </span>
		</div>
		<!-- ファイル選択（非表示） -->
		<input
			bind:this={fileInputEl}
			type="file"
			accept="image/*"
			class="hidden"
			onchange={handleFileInputChange}
		/>
	{/if}

	<div bind:this={element} class="w-full"></div>

	{#if showBlockMenu}
		<div
			class="block-menu border-base-300 bg-base-100 fixed z-[100] flex w-40 flex-col rounded-lg border py-1 shadow-lg"
			style="top: {blockMenuPos.top}px; left: {blockMenuPos.left}px;"
		>
			{#each blockTypes as bt (bt.id)}
				<button
					type="button"
					class="hover:bg-base-200 px-3 py-1.5 text-left text-sm"
					onclick={(e) => {
						e.stopPropagation();
						convertBlock(bt.id);
					}}
				>
					{bt.label}
				</button>
			{/each}
		</div>
	{/if}

	{#if showSuggestions && suggestions.length > 0}
		<div
			bind:this={suggestContainer}
			class="wiki-suggest-dropdown border-base-300 bg-base-100 absolute z-50 max-h-48 w-64 overflow-y-auto rounded-lg border shadow-lg"
			style="top: {suggestionPos.top}px; left: {suggestionPos.left}px;"
		>
			{#each suggestions as suggestion, i (suggestion.id)}
				<button
					class="wiki-suggest-item flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors
						{i === selectedIndex ? 'bg-primary text-primary-content' : 'hover:bg-base-200'}"
					onmousedown={(e) => {
						e.preventDefault(); // blur防止
						selectSuggestion(suggestion);
					}}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-3.5 w-3.5 shrink-0 opacity-60"
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
					<span class="truncate">{suggestion.title}</span>
				</button>
			{/each}
		</div>
	{/if}

	<!-- ノートコンパイザ: 切り出しダイアログ -->
	{#if showExtractDialog}
		<div class="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
			<div class="card bg-base-100 border-base-200/70 rounded-box w-full max-w-md border shadow-lg">
				<div class="card-body gap-3">
					<h3 class="text-base font-bold">選択範囲をノートに切り出す</h3>
					<p class="text-base-content/60 text-xs">
						新しいノートを作り、元の場所に埋め込み（![[タイトル]]）を差し込みます。
					</p>
					<label class="form-control w-full">
						<span class="label-text text-xs">ノートのタイトル</span>
						<input
							bind:value={extractTitle}
							class="input input-bordered input-sm mt-1 w-full"
							maxlength="60"
							placeholder="例: ツェッテルカステンの原則"
						/>
					</label>
					{#if extractError}
						<p class="text-error text-xs">{extractError}</p>
					{/if}
					<div class="flex justify-end gap-2">
						<button
							type="button"
							class="btn btn-ghost btn-sm"
							onclick={() => (showExtractDialog = false)}
							disabled={extracting}
						>
							キャンセル
						</button>
						<button
							type="button"
							class="btn btn-primary btn-sm"
							onclick={confirmExtract}
							disabled={extracting}
						>
							{#if extracting}<span class="loading loading-spinner loading-xs"></span>{/if}
							切り出す
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}

	{#if toastMessage}
		<div class="toast toast-top toast-center z-[210]">
			<div class="alert alert-success py-2 text-sm">{toastMessage}</div>
		</div>
	{/if}
</div>

<style>
	:global(.tiptap p.is-editor-empty:first-child::before) {
		color: var(--color-base-content);
		opacity: 0.4;
		content: attr(data-placeholder);
		float: left;
		height: 0;
		pointer-events: none;
	}

	/* Removed wiki-link-mark styling as we use tailwind classes now */

	/* Table styles */
	:global(.tiptap table) {
		border-collapse: collapse;
		table-layout: fixed;
		width: 100%;
		margin: 0;
		overflow: hidden;
	}
	:global(.tiptap td),
	:global(.tiptap th) {
		min-width: 1em;
		border: 2px solid var(--color-base-300);
		padding: 3px 5px;
		vertical-align: top;
		box-sizing: border-box;
		position: relative;
	}
	:global(.tiptap th) {
		font-weight: bold;
		text-align: left;
		background-color: var(--color-base-200);
	}
	:global(.tiptap .selectedCell:after) {
		z-index: 2;
		position: absolute;
		content: '';
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		background: rgba(200, 200, 255, 0.4);
		pointer-events: none;
	}

	/* Notion風ブロックハンドル */
	:global(.block-drag-handle) {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		border-radius: 4px;
		color: var(--color-base-content);
		opacity: 0.45;
		cursor: grab;
		transition:
			background-color 0.15s,
			opacity 0.15s;
	}
	:global(.block-drag-handle:hover) {
		background-color: var(--color-base-200);
		opacity: 1;
	}
	:global(.block-drag-handle:active) {
		cursor: grabbing;
	}

	/* 挿入された画像のスタイル */
	:global(.tiptap img) {
		max-width: 100%;
		height: auto;
		border-radius: 0.375rem;
		cursor: pointer;
	}

	:global(.tiptap img.ProseMirror-selectednode) {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
</style>
