<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<div class="bg-base-300 rounded-box mx-auto my-10 h-[80vh] w-2/3 shadow-xl">
	{@render children()}
</div>
