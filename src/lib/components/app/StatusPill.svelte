<script lang="ts">
	import { LEVEL_ICON, LEVEL_TEXT, type Level } from '#lib/kpi.js';
	let { level, text, size = 'md' }: { level: Level; text?: string; size?: 'sm' | 'md' } = $props();
	// สีอย่างเดียวไม่พอ: แสดงไอคอนและข้อความทุกครั้ง
	const cls: Record<Level, string> = {
		ok: 'bg-ok text-white',
		warn: 'bg-warn-fill text-warn-ink',
		bad: 'bg-bad text-white',
		info: 'bg-info text-white',
		none: 'bg-nodata text-white'
	};
</script>

<span class="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap {size === 'sm' ? 'text-xs' : 'text-sm'} font-medium">
	<span class="flex items-center justify-center rounded-full font-bold {cls[level]} {size === 'sm' ? 'size-4 text-[11px]' : 'size-5 text-xs'}" aria-hidden="true">{LEVEL_ICON[level]}</span>
	{text ?? LEVEL_TEXT[level]}
</span>
