<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData, SubmitFunction } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let copied = $state(false);

	// 平文トークンは create アクションの戻り値にだけ含まれる
	let generatedToken = $derived(form && 'token' in form ? form.token : null);
	let errorMessage = $derived(form && form.success === false ? form.message : null);

	const dateFormatter = new Intl.DateTimeFormat('ja-JP', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		timeZone: 'Asia/Tokyo'
	});

	function formatDateTime(value: Date | string | null): string {
		if (!value) return '—';
		const date = value instanceof Date ? value : new Date(value);
		if (Number.isNaN(date.getTime())) return '—';
		return dateFormatter.format(date);
	}

	// 発行直後は、生成されたトークンのカードまでスクロールして見せる
	const scrollToGeneratedToken: SubmitFunction = () => {
		return async ({ result, update }) => {
			await update();
			if (result.type === 'success') {
				document
					.getElementById('generated-token')
					?.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}
		};
	};

	async function copyToken() {
		if (!generatedToken) return;
		try {
			await navigator.clipboard.writeText(generatedToken);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			alert('コピーに失敗しました。トークンを選択して手動でコピーしてください。');
		}
	}
</script>

<h1 class="text-2xl font-bold">APIトークン</h1>
<p class="text-base-content/60 mt-2 text-sm">
	MCPサーバーや外部スクリプトからSazanamiのAPIを利用するための個人アクセストークンです。<code
		class="bg-base-200 rounded px-1">Authorization: Bearer sznm_...</code
	> の形式で送信します。
</p>

{#if errorMessage}
	<div class="alert alert-error mt-4" role="alert">
		<span>{errorMessage}</span>
	</div>
{:else if form?.success && form.message && !generatedToken}
	<div class="alert alert-success mt-4">
		<span>{form.message}</span>
	</div>
{/if}

{#if generatedToken}
	<div
		id="generated-token"
		class="card bg-warning/10 border-warning/50 rounded-box mt-6 border shadow"
	>
		<div class="card-body gap-3">
			<h2 class="card-title text-lg">トークンを発行しました</h2>
			<p class="text-sm font-semibold">
				この画面を閉じると二度と表示されません。今すぐ安全な場所にコピーしてください。
			</p>
			<div class="flex flex-col gap-2 sm:flex-row sm:items-start">
				<code
					class="bg-base-300/70 rounded-box flex-1 overflow-x-auto p-4 font-mono text-sm break-all whitespace-pre-wrap select-all"
					>{generatedToken}</code
				>
				<button type="button" class="btn btn-sm btn-outline shrink-0" onclick={copyToken}>
					{copied ? 'コピーしました' : 'コピー'}
				</button>
			</div>
		</div>
	</div>
{/if}

<div class="card bg-base-100 border-base-200/70 rounded-box mt-6 border shadow">
	<div class="card-body">
		<h2 class="card-title text-lg">新しいトークンを発行</h2>

		<form
			method="POST"
			action="?/create"
			use:enhance={scrollToGeneratedToken}
			class="mt-2 space-y-4"
		>
			<div class="form-control">
				<label class="label" for="name">
					<span class="label-text font-medium">トークン名 <span class="text-error">*</span></span>
				</label>
				<input
					id="name"
					name="name"
					type="text"
					class="input input-bordered w-full max-w-md"
					placeholder="例: MCPサーバー用"
					maxlength="60"
					required
				/>
				<p class="text-base-content/50 mt-1 text-xs">
					用途が分かる名前を付けてください（60文字以内）
				</p>
			</div>

			<fieldset class="form-control">
				<legend class="label-text font-medium">スコープ</legend>
				<div class="mt-1 flex flex-col gap-2">
					<label class="flex items-center gap-2 text-sm">
						<input type="checkbox" class="checkbox checkbox-primary checkbox-sm" checked disabled />
						<span>read <span class="text-base-content/50">（読み取り・常に付与）</span></span>
					</label>
					<label class="flex cursor-pointer items-center gap-2 text-sm">
						<input
							type="checkbox"
							name="scopes"
							value="write"
							class="checkbox checkbox-primary checkbox-sm"
						/>
						<span>write <span class="text-base-content/50">（書き込み）</span></span>
					</label>
				</div>
			</fieldset>

			<div class="form-control">
				<label class="label" for="expiresInDays">
					<span class="label-text font-medium">有効期限</span>
				</label>
				<select
					id="expiresInDays"
					name="expiresInDays"
					class="select select-bordered w-full max-w-xs"
				>
					<option value="30">30日</option>
					<option value="90" selected>90日</option>
					<option value="365">1年</option>
					<option value="">無期限</option>
				</select>
			</div>

			<div>
				<button type="submit" class="btn btn-primary">発行する</button>
			</div>
		</form>
	</div>
</div>

<div class="card bg-base-100 border-base-200/70 rounded-box mt-8 border shadow">
	<div class="card-body">
		<h2 class="card-title text-lg">発行済みトークン</h2>

		{#if data.tokens.length === 0}
			<p class="text-base-content/60 text-sm">まだトークンはありません。</p>
		{:else}
			<div class="overflow-x-auto">
				<table class="table-sm table">
					<thead>
						<tr>
							<th>名前</th>
							<th>プレフィックス</th>
							<th>スコープ</th>
							<th>最終使用</th>
							<th>有効期限</th>
							<th>状態</th>
							<th class="text-right">操作</th>
						</tr>
					</thead>
					<tbody>
						{#each data.tokens as token (token.id)}
							<tr class={token.status === 'revoked' ? 'opacity-50' : ''}>
								<td class="font-medium">{token.name}</td>
								<td><code class="text-xs">{token.prefix}</code></td>
								<td>
									<div class="flex flex-wrap gap-1">
										{#each token.scopes as scope (scope)}
											<span class="badge badge-ghost badge-sm">{scope}</span>
										{/each}
									</div>
								</td>
								<td class="text-xs">
									{token.lastUsedAt ? formatDateTime(token.lastUsedAt) : '未使用'}
								</td>
								<td class="text-xs">
									{token.expiresAt ? formatDateTime(token.expiresAt) : '無期限'}
								</td>
								<td>
									{#if token.status === 'revoked'}
										<span class="badge badge-error badge-sm">失効</span>
									{:else if token.status === 'expired'}
										<span class="badge badge-warning badge-sm">期限切れ</span>
									{:else}
										<span class="badge badge-success badge-sm">有効</span>
									{/if}
								</td>
								<td class="text-right">
									{#if token.status !== 'revoked'}
										<form method="POST" action="?/revoke" use:enhance>
											<input type="hidden" name="id" value={token.id} />
											<button
												type="submit"
												class="btn btn-ghost text-error btn-xs"
												onclick={(e) => {
													if (
														!confirm(
															`「${token.name}」を失効させますか？この操作は取り消せません。`
														)
													) {
														e.preventDefault();
													}
												}}
											>
												失効
											</button>
										</form>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>
