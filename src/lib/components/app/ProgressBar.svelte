<script lang="ts">
	let { value, tone = 'primary' }: { value: number; tone?: 'primary' | 'emerald' | 'rose' } = $props();
	const bar = { primary: 'bg-primary', emerald: 'bg-ok', rose: 'bg-bad' };
</script>

<div class="h-1.5 w-full overflow-hidden rounded-full bg-mint">
	<div class="h-full rounded-full {bar[tone]}" style="width: {Math.max(0, Math.min(100, value))}%"></div>
</div>
