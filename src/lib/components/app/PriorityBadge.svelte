<script lang="ts">
	import { PRIORITY_LABEL, type Priority } from '#lib/labels.js';
	let { priority }: { priority: Priority } = $props();
	const cls: Record<Priority, string> = {
		high: 'border-rose-200 text-rose-700',
		medium: 'border-amber-200 text-amber-700',
		low: 'border-zinc-200 text-zinc-500'
	};
</script>

<span class="inline-flex h-5 items-center rounded-full border px-2 text-xs whitespace-nowrap {cls[priority]}">
	{PRIORITY_LABEL[priority]}
</span>
