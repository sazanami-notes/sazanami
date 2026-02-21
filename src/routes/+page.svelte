<div class="min-h-screen bg-base-100 flex flex-col items-center">
	<!-- Hero Section -->
	<section class="hero min-h-[70vh] bg-gradient-to-b from-primary/10 to-base-100 w-full flex flex-col items-center justify-center px-4 text-center overflow-hidden relative">
		<!-- Decorative Ripples (CSS Only) -->
		<div class="absolute inset-0 z-0 pointer-events-none opacity-20">
			<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-primary rounded-full animate-ripple"></div>
			<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-primary rounded-full animate-ripple [animation-delay:1s]"></div>
			<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-primary rounded-full animate-ripple [animation-delay:2s]"></div>
		</div>

		<div class="hero-content relative z-10">
			<div class="max-w-xl">
				<div class="flex justify-center mb-6">
					<div class="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center shadow-lg transform rotate-12">
						<svg xmlns="http://www.w3.org/2000/svg" height="48" viewBox="0 0 24 24" width="48" fill="white">
							<path d="M0 0h24v24H0V0z" fill="none"/>
							<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15.5L6.5 13l1.41-1.41L11 14.67l6.09-6.09L18.5 10 11 17.5z"/>
						</svg>
					</div>
				</div>
				<h1 class="text-6xl font-black tracking-tight mb-4">
					Sazanami
				</h1>
				<p class="text-2xl font-medium text-base-content/70 mb-8">
					Capture Every <span class="text-primary italic">Ripple</span> of Thought
				</p>
				<p class="text-lg text-base-content/60 max-w-md mx-auto mb-10">
					思考のさざなみを、すべて書き留める。あなたのアイデアが流れ、育つためのミニマルな空間。
				</p>
				<div class="flex flex-col sm:flex-row gap-4 justify-center">
					<a href="/login?mode=register" class="btn btn-primary btn-lg px-8">無料で始める</a>
					<a href="/login" class="btn btn-outline btn-lg px-8">ログイン</a>
				</div>
			</div>
		</div>

		<!-- Wave bottom -->
		<div class="absolute bottom-0 left-0 w-full overflow-hidden leading-[0]">
			<svg viewBox="0 0 1200 120" preserveAspectRatio="none" class="relative block w-[calc(100%+1.3px)] h-20 fill-base-200">
				<path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C58.47,112.49,120.3,121.18,181.19,111.43,241.67,101.73,284.44,70.52,321.39,56.44Z"></path>
			</svg>
		</div>
	</section>

	<!-- Features Section -->
	<section class="py-20 bg-base-200 w-full px-4">
		<div class="max-w-4xl mx-auto">
			<h2 class="text-3xl font-bold text-center mb-16">心地よいノート体験を</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
				<div class="card bg-base-100 shadow-sm border border-base-300">
					<div class="card-body items-center text-center">
						<div class="w-12 h-12 bg-secondary/20 text-secondary rounded-full flex items-center justify-center mb-4">
							<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="currentColor">
								<path d="M0 0h24v24H0z" fill="none"/><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z"/>
							</svg>
						</div>
						<h3 class="card-title text-xl">どこでも同期</h3>
						<p class="text-base-content/70">デバイスを問わず、あなたの思考にいつでもアクセス。クラウド同期で安心です。</p>
					</div>
				</div>
				<div class="card bg-base-100 shadow-sm border border-base-300">
					<div class="card-body items-center text-center">
						<div class="w-12 h-12 bg-accent/20 text-accent rounded-full flex items-center justify-center mb-4">
							<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="currentColor">
								<path d="M0 0h24v24H0z" fill="none"/><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
							</svg>
						</div>
						<h3 class="card-title text-xl">多彩なテーマ</h3>
						<p class="text-base-content/70">海のさざなみのように、心地よい複数のテーマを用意。あなたの気分に合わせて選べます。</p>
					</div>
				</div>
				<div class="card bg-base-100 shadow-sm border border-base-300">
					<div class="card-body items-center text-center">
						<div class="w-12 h-12 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-4">
							<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="currentColor">
								<path d="M0 0h24v24H0z" fill="none"/><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h10V7H7v3zm0 4h10v-3H7v3zm0 3h10v-3H7v3z"/>
							</svg>
						</div>
						<h3 class="card-title text-xl">ミニマルな編集</h3>
						<p class="text-base-content/70">集中を妨げない、洗練されたエディタ。マークダウン形式で直感的に記述できます。</p>
					</div>
				</div>
				<div class="card bg-base-100 shadow-sm border border-base-300">
					<div class="card-body items-center text-center">
						<div class="w-12 h-12 bg-info/20 text-info rounded-full flex items-center justify-center mb-4">
							<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="currentColor">
								<path d="M0 0h24v24H0z" fill="none"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
							</svg>
						</div>
						<h3 class="card-title text-xl">強力な検索</h3>
						<p class="text-base-content/70">溜まったノートも瞬時に検索。あなたの知識をいつでも引き出せます。</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Footer / Call to Action -->
	<footer class="py-20 w-full text-center px-4">
		<h2 class="text-3xl font-bold mb-8">さあ、ノートを書き始めましょう</h2>
		<a href="/login?mode=register" class="btn btn-primary btn-lg px-12">今すぐ登録</a>
		<p class="mt-8 text-base-content/50 text-sm">© 2024 Sazanami. All rights reserved.</p>
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
