<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<div class="my-10 mx-auto w-2/3 bg-base-300 rounded-box shadow-xl h-[80vh]">
	{@render children()}
</div>
