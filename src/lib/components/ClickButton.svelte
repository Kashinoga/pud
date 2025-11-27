<script lang="ts">
	import { total } from '$lib/stores/currency';
	function click() {
		total.update((v) => v + 1);
	}
</script>

<button on:click={click}>+1</button>
