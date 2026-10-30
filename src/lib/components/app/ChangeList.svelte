<script lang="ts">
	import { FIELD_LABEL, PRIORITY_LABEL, STATUS_LABEL, fmtDate } from '#lib/labels.js';

	let {
		changes,
		users = {},
		projects = {}
	}: { changes: string | null; users?: Record<number, string>; projects?: Record<number, string> } = $props();

	const HIDDEN = new Set(['id', 'version', 'createdAt', 'updatedAt', 'passwordHash']);
	const entries = $derived(
		changes
			? Object.entries(JSON.parse(changes) as Record<string, { from: unknown; to: unknown }>).filter(
					([k]) => !HIDDEN.has(k)
				)
			: []
	);

	function show(field: string, v: unknown): string {
		if (v === null || v === undefined || v === '') return '—';
		if (field === 'status') return STATUS_LABEL[v as keyof typeof STATUS_LABEL] ?? String(v);
		if (field === 'priority') return PRIORITY_LABEL[v as keyof typeof PRIORITY_LABEL] ?? String(v);
		if (field === 'assigneeId') return users[v as number] ?? `#${v}`;
		if (field === 'projectId') return projects[v as number] ?? `#${v}`;
		if (field === 'startDate' || field === 'dueDate') return fmtDate(String(v));
		if (field === 'progress') return `${v}%`;
		if (field === 'active') return v ? 'ใช้งาน' : 'ปิดใช้งาน';
		if (field === 'password') return '••••••';
		return String(v);
	}
</script>

{#if entries.length}
	<ul class="mt-1 space-y-0.5 text-xs">
		{#each entries as [field, c] (field)}
			<li class="text-muted-foreground">
				<span class="font-medium text-foreground">{FIELD_LABEL[field] ?? field}:</span>
				{#if c.from !== null && c.from !== undefined}
					<span class="line-through decoration-rose-400/70">{show(field, c.from)}</span> →
				{/if}
				<span class="text-foreground">{show(field, c.to)}</span>
			</li>
		{/each}
	</ul>
{/if}
