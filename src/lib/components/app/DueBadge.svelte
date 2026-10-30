<script lang="ts">
	import { daysUntil, dueState, fmtDate } from '#lib/labels.js';
	let { task, short = false }: { task: { status: string; dueDate: string | null }; short?: boolean } = $props();
	const state = $derived(dueState(task));
	const days = $derived(daysUntil(task.dueDate));
	const cls = {
		overdue: 'bg-bad/10 text-bad font-medium',
		soon: 'bg-warn-fill/30 text-warn-ink font-medium',
		normal: 'text-muted-foreground',
		done: 'text-muted-foreground',
		none: 'text-muted-foreground'
	};
</script>

<span class="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs whitespace-nowrap {cls[state]}">
	{#if state === 'overdue'}<span aria-hidden="true">✕</span>{:else if state === 'soon'}<span aria-hidden="true">!</span>{/if}
	{fmtDate(task.dueDate)}
	{#if state === 'overdue'}
		· เลย {Math.abs(days ?? 0)} วัน
	{:else if state === 'soon' && !short}
		· {days === 0 ? 'วันนี้' : `อีก ${days} วัน`}
	{/if}
</span>
