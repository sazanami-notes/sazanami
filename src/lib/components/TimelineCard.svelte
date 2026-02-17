<script lang="ts">
	import type { Note } from '$lib/types';
	import { format } from 'date-fns';
	import { ja } from 'date-fns/locale';
	import { marked } from 'marked';

	// Define props
	export let note: Note & { tags: string[] };
	export let attachments: { url: string; type: 'image' | 'video' }[] = [];
	export let quotedNote: (Note & { tags: string[] }) | null = null;

	// Format date: e.g., 12月11日(木)
	const formattedDate = format(new Date(note.updatedAt), 'MM月dd日(EEE)', { locale: ja });
</script>

<div class="card bg-base-100 border-base-200 mb-4 w-full border shadow-sm">
	<div class="card-body p-4">
		<!-- Header -->
		<div class="mb-2 flex items-center justify-between">
			<span class="text-base-content/70 text-sm font-medium">{formattedDate}</span>
			<div class="text-base-content/50 flex items-center gap-3">
				<!-- Folder Icon -->
				<button class="hover:text-primary">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="h-5 w-5"
					>
						<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
						></path>
					</svg>
				</button>
				<!-- Check Circle -->
				<button class="hover:text-success">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="h-5 w-5"
					>
						<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
						<polyline points="22 4 12 14.01 9 11.01"></polyline>
					</svg>
				</button>
				<!-- Pin -->
				<button class="hover:text-secondary">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="h-5 w-5"
					>
						<line x1="12" y1="17" x2="12" y2="22"></line>
						<path
							d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"
						></path>
					</svg>
				</button>
				<!-- Checkbox (Square) -->
				<button class="hover:text-accent">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="h-5 w-5"
					>
						<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
					</svg>
				</button>
			</div>
		</div>

		<!-- Content -->
		<div class="prose text-base-content mb-3 max-w-none text-sm">
			{@html marked(note.content || '')}
		</div>

		<!-- Attachments (Grid) -->
		{#if attachments.length > 0}
			<div class="mb-3 grid grid-cols-2 gap-2">
				{#each attachments as attachment (attachment.url)}
					<div class="bg-base-200 border-base-300 aspect-square overflow-hidden rounded-lg border">
						{#if attachment.type === 'image'}
							<img src={attachment.url} alt="Attachment" class="h-full w-full object-cover" />
						{:else}
							<div class="text-base-content/50 flex h-full w-full items-center justify-center">
								<span>File</span>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}

		<!-- Quoted Note -->
		{#if quotedNote}
			<div class="card card-compact bg-base-200/50 border-base-300 mt-2 rounded-lg border p-3">
				<div class="text-base-content/60 mb-1 text-xs font-medium">
					{format(new Date(quotedNote.updatedAt), 'MM月dd日(EEE)', { locale: ja })}
				</div>
				<div class="prose text-base-content/80 line-clamp-3 max-w-none text-xs">
					{@html marked(quotedNote.content || '')}
				</div>
			</div>
		{/if}
	</div>
</div>
