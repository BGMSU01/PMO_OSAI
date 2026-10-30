<script lang="ts">
	import { fmtDate } from '#lib/labels.js';

	// S-curve: แผนสะสม (เส้นประสีเขียว = เป้า) เทียบผลจริง ณ วันนี้ (จุดสีเข้ม) พร้อมเส้น "วันนี้"
	let {
		weeks,
		today,
		actual,
		plan
	}: { weeks: { date: string; plan: number }[]; today: string; actual: number; plan: number } = $props();

	const W = 640;
	const H = 240;
	const pad = { l: 40, r: 16, t: 16, b: 32 };
	const ms = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
	const x0 = $derived(ms(weeks[0]?.date ?? today));
	const x1 = $derived(ms(weeks.at(-1)?.date ?? today));
	const sx = (iso: string) => pad.l + ((ms(iso) - x0) / Math.max(1, x1 - x0)) * (W - pad.l - pad.r);
	const sy = (v: number) => pad.t + (1 - v / 100) * (H - pad.t - pad.b);
	const path = $derived(weeks.map((w, i) => `${i ? 'L' : 'M'}${sx(w.date).toFixed(1)} ${sy(w.plan).toFixed(1)}`).join(' '));
	const tx = $derived(Math.min(Math.max(sx(today), pad.l), W - pad.r));
	// ป้ายแกน x: ทุก ~4 สัปดาห์
	const ticks = $derived(weeks.filter((_, i) => i % 4 === 0));
</script>

<svg viewBox="0 0 {W} {H}" class="h-auto w-full" role="img" aria-label="กราฟ S-curve ความคืบหน้าตามแผนเทียบผลจริง ณ วันนี้">
	{#each [0, 25, 50, 75, 100] as v (v)}
		<line x1={pad.l} x2={W - pad.r} y1={sy(v)} y2={sy(v)} stroke="var(--border)" />
		<text x={pad.l - 8} y={sy(v) + 4} text-anchor="end" class="fill-muted-foreground text-[12px] tabular-nums">{v}%</text>
	{/each}
	{#each ticks as t (t.date)}
		<text x={sx(t.date)} y={H - 10} text-anchor="middle" class="fill-muted-foreground text-[12px]">{fmtDate(t.date)}</text>
	{/each}

	<path d={path} fill="none" stroke="var(--ok)" stroke-width="2.5" stroke-dasharray="6 5" />
	<text x={W - pad.r} y={sy(100) - 4} text-anchor="end" class="fill-ok text-[12px] font-medium">แผน (เป้า)</text>

	<line x1={tx} x2={tx} y1={pad.t} y2={H - pad.b} stroke="var(--foreground)" stroke-opacity=".35" />
	<text x={tx + 6} y={pad.t + 12} class="fill-muted-foreground text-[12px]">วันนี้</text>

	<!-- ช่องว่างระหว่างแผนกับผลจริง -->
	<line x1={tx} x2={tx} y1={sy(plan)} y2={sy(actual)} stroke={actual < plan ? 'var(--bad)' : 'var(--ok)'} stroke-width="4" stroke-linecap="round" opacity=".5" />
	<circle cx={tx} cy={sy(plan)} r="4" fill="var(--card)" stroke="var(--ok)" stroke-width="2" />
	<circle cx={tx} cy={sy(actual)} r="6" fill="var(--foreground)" />
	<text x={tx - 10} y={sy(actual) + 4} text-anchor="end" class="fill-foreground text-[13px] font-semibold tabular-nums">จริง {actual}%</text>
	<text x={tx - 10} y={sy(plan) - 6} text-anchor="end" class="fill-ok text-[13px] font-semibold tabular-nums">แผน {plan}%</text>
</svg>
