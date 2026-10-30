<script lang="ts">
	// Bullet chart: แถบค่าจริงบนพื้นช่วง พร้อมขีดเป้า (ใช้แทน Gauge)
	let {
		value,
		target,
		max = 100,
		level = 'ok',
		label
	}: { value: number; target?: number | null; max?: number; level?: 'ok' | 'warn' | 'bad' | 'info' | 'none'; label?: string } = $props();
	const pct = (v: number) => Math.max(0, Math.min(100, (v / max) * 100));
	const fill = { ok: 'bg-ok', warn: 'bg-warn', bad: 'bg-bad', info: 'bg-info', none: 'bg-nodata' };
</script>

<div class="relative h-3 w-full rounded-full bg-mint" role="img" aria-label={label ?? `ค่าจริง ${value} เป้า ${target ?? '-'}`}>
	<div class="absolute inset-y-0.5 left-0.5 rounded-full {fill[level]}" style="width: calc({pct(value)}% - 4px)"></div>
	{#if target != null}
		<div class="absolute -top-1 -bottom-1 w-0.5 rounded bg-foreground" style="left: calc({pct(target)}% - 1px)"></div>
	{/if}
</div>
