<div class="bg-base-100 flex min-h-screen flex-col items-center">
	<!-- Hero Section -->
	<section
		class="hero from-primary/10 to-base-100 relative flex min-h-[70vh] w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-b px-4 text-center"
	>
		<!-- Decorative Ripples (CSS Only) -->
		<div class="pointer-events-none absolute inset-0 z-0 opacity-20">
			<div
				class="border-primary animate-ripple absolute top-1/2 left-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full border"
			></div>
			<div
				class="border-primary animate-ripple absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full border [animation-delay:1s]"
			></div>
			<div
				class="border-primary animate-ripple absolute top-1/2 left-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full border [animation-delay:2s]"
			></div>
		</div>

		<div class="hero-content relative z-10">
			<div class="max-w-xl">
				<div class="mb-6 flex justify-center">
					<div
						class="bg-primary flex h-20 w-20 rotate-12 transform items-center justify-center rounded-2xl shadow-lg"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							height="48"
							viewBox="0 0 24 24"
							width="48"
							fill="white"
						>
							<path d="M0 0h24v24H0V0z" fill="none" />
							<path
								d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15.5L6.5 13l1.41-1.41L11 14.67l6.09-6.09L18.5 10 11 17.5z"
							/>
						</svg>
					</div>
				</div>
				<h1 class="mb-4 text-6xl font-black tracking-tight">Sazanami</h1>
				<p class="text-base-content/70 mb-8 text-2xl font-medium">
					Capture Every <span class="text-primary italic">Ripple</span> of Thought
				</p>
				<p class="text-base-content/60 mx-auto mb-10 max-w-md text-lg">
					思考のさざなみを、すべて書き留める。あなたのアイデアが流れ、育つためのミニマルな空間。
				</p>
				<div class="flex flex-col justify-center gap-4 sm:flex-row">
					<a href="/login?mode=register" class="btn btn-primary btn-lg px-8">無料で始める</a>
					<a href="/login" class="btn btn-outline btn-lg px-8">ログイン</a>
				</div>
			</div>
		</div>

		<!-- Wave bottom -->
		<div class="absolute bottom-0 left-0 w-full overflow-hidden leading-[0]">
			<svg
				viewBox="0 0 1200 120"
				preserveAspectRatio="none"
				class="fill-base-200 relative block h-20 w-[calc(100%+1.3px)]"
			>
				<path
					d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C58.47,112.49,120.3,121.18,181.19,111.43,241.67,101.73,284.44,70.52,321.39,56.44Z"
				></path>
			</svg>
		</div>
	</section>

	<!-- Features Section -->
	<section class="bg-base-200 w-full px-4 py-20">
		<div class="mx-auto max-w-4xl">
			<h2 class="mb-16 text-center text-3xl font-bold">心地よいノート体験を</h2>
			<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
				<div class="card bg-base-100 border-base-300 border shadow-sm">
					<div class="card-body items-center text-center">
						<div
							class="bg-secondary/20 text-secondary mb-4 flex h-12 w-12 items-center justify-center rounded-full"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								height="24"
								viewBox="0 0 24 24"
								width="24"
								fill="currentColor"
							>
								<path d="M0 0h24v24H0z" fill="none" /><path
									d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z"
								/>
							</svg>
						</div>
						<h3 class="card-title text-xl">どこでも同期</h3>
						<p class="text-base-content/70">
							デバイスを問わず、あなたの思考にいつでもアクセス。クラウド同期で安心です。
						</p>
					</div>
				</div>
				<div class="card bg-base-100 border-base-300 border shadow-sm">
					<div class="card-body items-center text-center">
						<div
							class="bg-accent/20 text-accent mb-4 flex h-12 w-12 items-center justify-center rounded-full"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								height="24"
								viewBox="0 0 24 24"
								width="24"
								fill="currentColor"
							>
								<path d="M0 0h24v24H0z" fill="none" /><path
									d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"
								/>
							</svg>
						</div>
						<h3 class="card-title text-xl">多彩なテーマ</h3>
						<p class="text-base-content/70">
							海のさざなみのように、心地よい複数のテーマを用意。あなたの気分に合わせて選べます。
						</p>
					</div>
				</div>
				<div class="card bg-base-100 border-base-300 border shadow-sm">
					<div class="card-body items-center text-center">
						<div
							class="bg-primary/20 text-primary mb-4 flex h-12 w-12 items-center justify-center rounded-full"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								height="24"
								viewBox="0 0 24 24"
								width="24"
								fill="currentColor"
							>
								<path d="M0 0h24v24H0z" fill="none" /><path
									d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h10V7H7v3zm0 4h10v-3H7v3zm0 3h10v-3H7v3z"
								/>
							</svg>
						</div>
						<h3 class="card-title text-xl">ミニマルな編集</h3>
						<p class="text-base-content/70">
							集中を妨げない、洗練されたエディタ。マークダウン形式で直感的に記述できます。
						</p>
					</div>
				</div>
				<div class="card bg-base-100 border-base-300 border shadow-sm">
					<div class="card-body items-center text-center">
						<div
							class="bg-info/20 text-info mb-4 flex h-12 w-12 items-center justify-center rounded-full"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								height="24"
								viewBox="0 0 24 24"
								width="24"
								fill="currentColor"
							>
								<path d="M0 0h24v24H0z" fill="none" /><path
									d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
								/>
							</svg>
						</div>
						<h3 class="card-title text-xl">強力な検索</h3>
						<p class="text-base-content/70">
							溜まったノートも瞬時に検索。あなたの知識をいつでも引き出せます。
						</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Footer / Call to Action -->
	<footer class="w-full px-4 py-20 text-center">
		<h2 class="mb-8 text-3xl font-bold">さあ、ノートを書き始めましょう</h2>
		<a href="/login?mode=register" class="btn btn-primary btn-lg px-12">今すぐ登録</a>
		<p class="text-base-content/50 mt-8 text-sm">© 2024 Sazanami. All rights reserved.</p>
	</footer>
</div>

<style>
	@keyframes ripple {
		0% {
			transform: translate(-50%, -50%) scale(0.8);
			opacity: 0.5;
		}
		100% {
			transform: translate(-50%, -50%) scale(1.2);
			opacity: 0;
		}
	}
	.animate-ripple {
		animation: ripple 3s infinite linear;
	}
</style>
