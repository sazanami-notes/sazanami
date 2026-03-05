<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import TiptapEditor from '$lib/components/TiptapEditor.svelte';

	// Use page store instead of data prop
	const userData = $page.data.user;

	let title = $state('');
	let content = $state('');
	let isPublic = $state(false);

	let saveTimeout: ReturnType<typeof setTimeout>;
	let isCreating = $state(false);

	let urlStatus = $page.url.searchParams.get('status') || 'inbox';

	const handleContentChange = (value: { markdown: string }) => {
		// handleContentChangeはMarkdownを受け取るようにすでにTiptapEditorが修正されている
		content = value.markdown;
	};

	// ユーザーが入力し始めたら自動で新規作成して編集画面へ遷移する
	$effect(() => {
		const currentTitle = title.trim();
		const currentContent = content.trim();

		// タイトルかコンテンツのどちらかに入力があれば自動作成をトリガー
		if (currentTitle || currentContent) {
			clearTimeout(saveTimeout);
			saveTimeout = setTimeout(async () => {
				if (isCreating) return;
				isCreating = true;

				try {
					console.log('Auto-creating new note...');
					const response = await fetch('/api/notes', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						// 新規作成時、タイムラインには載せる設定（skipTimeline: false はデフォルト）
						body: JSON.stringify({
							title: currentTitle || 'Untitled Note',
							content: currentContent,
							isPublic,
							skipTimeline: urlStatus === 'box',
							status: urlStatus
						})
					});

					if (response.ok) {
						const newNote = await response.json();
						// 作成成功したら、そのノートの編集ページにシームレスに遷移する
						if (newNote && newNote.id) {
							goto(`/home/note/${newNote.id}`, { replaceState: true });
						}
					} else {
						console.error('Failed to auto-create note', await response.text());
						isCreating = false; // エラー時は再試行できるようにフラグを戻す
					}
				} catch (error) {
					console.error('Error auto-creating note', error);
					isCreating = false;
				}
			}, 1000); // 1秒 debounce
		}
	});

	const handleSubmit = async (event: SubmitEvent) => {
		event.preventDefault();
		console.log('Form submitted');
		const form = event.target as HTMLFormElement;
		const formData = new FormData(form);

		// Replace the content from the textarea with our Tiptap content
		formData.set('content', content);
		formData.set('isPublic', isPublic ? 'on' : 'off');

		console.log('Submitting form with title:', title, 'Content length:', content.length);

		try {
			// Submit the form manually with credentials included
			const response = await fetch(form.action, {
				method: form.method,
				body: formData,
				credentials: 'include' // Important for sending cookies
			});

			if (response.redirected) {
				console.log('Redirecting to:', response.url);
				window.location.href = response.url;
			} else if (response.ok) {
				// If response is OK but not redirected, try to parse JSON
				try {
					const data = await response.json();
					console.log('Form submission successful:', data);

					// If we have a redirect URL in the response, use it
					if (data.redirectTo) {
						window.location.href = data.redirectTo;
						return false;
					}

					// Otherwise redirect to user's page
					window.location.href = `/${userData.name}`;
				} catch (jsonError) {
					console.log('Response was not JSON, redirecting to user page');
					window.location.href = `/${userData.name}`;
				}
			} else {
				console.error('Form submission failed:', response.status);
				const errorText = await response.text();
				console.error('Error details:', errorText);
				alert(`Failed to create note (${response.status}). Please try again.`);
			}
		} catch (error) {
			console.error('Exception during form submission:', error);
			alert('Network error while creating note. Please try again.');
		}

		return false; // Prevent default form submission
	};
</script>

<div class="mx-auto max-w-4xl p-6">
	<h1 class="mb-6 text-3xl font-bold opacity-90">New Note</h1>
	<form method="post" onsubmit={handleSubmit} class="space-y-6">
		<div>
			<label for="title" class="mb-2 block text-sm font-semibold opacity-70">Title</label>
			<input
				type="text"
				id="title"
				name="title"
				bind:value={title}
				placeholder="Enter note title..."
				class="border-base-300 focus:border-primary focus:ring-primary block w-full rounded-md px-4 py-2 shadow-sm sm:text-lg"
			/>
		</div>

		<div>
			<label for="content" class="mb-2 block text-sm font-semibold text-gray-700">Content</label>
			<div class="min-h-[400px] w-full">
				<TiptapEditor
					{content}
					onchange={handleContentChange}
					placeholder="Start writing your note here..."
				/>
			</div>
			<!-- Hidden textarea to maintain compatibility with the form -->
			<textarea id="content" name="content" class="hidden">{content}</textarea>
		</div>

		<div class="flex items-center">
			<input type="hidden" name="status" value={urlStatus} />
			<input
				type="checkbox"
				bind:checked={isPublic}
				id="isPublic"
				name="isPublic"
				class="text-primary focus:ring-primary border-base-300 h-4 w-4 rounded"
			/>
			<label for="isPublic" class="ml-2 block text-sm opacity-90">Make this note public</label>
		</div>

		<div class="flex justify-end pt-4">
			<button type="submit" class="btn btn-primary"> Create Note </button>
		</div>
	</form>
</div>
