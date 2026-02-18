<script lang="ts">
	import QRCode from 'qrcode';

	let { value }: { value: string } = $props();
	let canvas: HTMLCanvasElement | undefined = $state();

	$effect(() => {
		if (canvas && value) {
			QRCode.toCanvas(canvas, value, { width: 200 }, (error) => {
				if (error) console.error(error);
			});
		}
	});
</script>

<canvas bind:this={canvas}></canvas>
