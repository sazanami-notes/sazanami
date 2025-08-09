<script lang="ts">
	let files: FileList;
	let message = '';
	let isLoading = false;

	async function handleImport() {
		if (!files || files.length === 0) {
			message = 'Please select files to import.';
			return;
		}

		isLoading = true;
		message = 'Importing...';

		const formData = new FormData();
		for (let i = 0; i < files.length; i++) {
			formData.append('files', files[i]);
		}

		try {
			const response = await fetch('/api/notes/import', {
				method: 'POST',
				body: formData
			});

			const data = await response.json();

			if (response.ok) {
				message = `Successfully imported ${data.importedCount} notes.`;
			} else {
				message = `Error: ${data.message || 'An unknown error occurred.'}`;
			}
		} catch (error) {
			message = 'An error occurred during the import process.';
			console.error('Import error:', error);
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="prose">
	<h2>Import Markdown Files</h2>
	<p>Select multiple Markdown (.md) files from your computer to import them as new notes.</p>

	<div class="form-control w-full max-w-xs">
		<label class="label" for="file-input">
			<span class="label-text">Select files</span>
		</label>
		<input
			type="file"
			id="file-input"
			bind:files
			multiple
			accept=".md,text/markdown"
			class="file-input file-input-bordered w-full max-w-xs"
			disabled={isLoading}
		/>
	</div>

	<button class="btn btn-primary mt-4" on:click={handleImport} disabled={isLoading}>
		{#if isLoading}
			<span class="loading loading-spinner"></span>
			Importing...
		{:else}
			Import Notes
		{/if}
	</button>

	{#if message}
		<div class="alert mt-4">
			<span>{message}</span>
		</div>
	{/if}
</div>
