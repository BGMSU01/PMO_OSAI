<script lang="ts">
	import { STATUS_LABEL, type Status } from '#lib/labels.js';
	let { status }: { status: Status } = $props();
	const cls: Record<Status, string> = {
		todo: 'bg-muted text-muted-foreground ring-1 ring-border',
		doing: 'bg-info/10 text-info',
		done: 'bg-mint text-ok'
	};
	const icon: Record<Status, string> = { todo: '○', doing: '◐', done: '✓' };
</script>

<span class="inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-medium whitespace-nowrap {cls[status]}">
	<span aria-hidden="true">{icon[status]}</span>{STATUS_LABEL[status]}
</span>
