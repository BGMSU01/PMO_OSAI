<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import StatusPill from '#lib/components/app/StatusPill.svelte';
	import Bullet from '#lib/components/app/Bullet.svelte';
	import SCurve from '#lib/components/app/SCurve.svelte';
	import { actionText, fmtDate, fmtDateTime, PRIORITY_LABEL } from '#lib/labels.js';
	import { TARGETS } from '#lib/kpi.js';
	import Download from '@lucide/svelte/icons/download';
	import Printer from '@lucide/svelte/icons/printer';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const late = $derived(data.alerts.filter((a) => a.level === 'bad'));
	const behind = $derived(data.projects.filter((p) => p.gap < TARGETS.progressGap.warn));
	const trendGap = $derived(data.trend.actual - data.trend.plan);
	const peopleLate = $derived(data.people.filter((p) => p.overdue > 0));
	const maxRemaining = $derived(Math.max(1, ...data.people.map((p) => p.remaining)));
	const topLoad = $derived([...data.people].sort((a, b) => b.remaining - a.remaining)[0]);
</script>

<svelte:head><title>Dashboard · PMO Tracker</title></svelte:head>

<div class="dash mx-auto max-w-[1400px] space-y-5">
	<!-- ส่วนหัว: ช่วงข้อมูล + อัปเดตล่าสุด + ที่มา -->
	<header class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<p class="font-display text-sm font-light text-muted-foreground">กองอาคารสถานที่ · ระบบติดตามงาน</p>
			<h1 class="text-2xl text-primary sm:text-3xl">Dashboard ติดตามงานทีม</h1>
			<p class="mt-1 text-sm text-muted-foreground">
				ข้อมูล ณ {fmtDate(data.today)} · อัปเดตล่าสุด {data.lastUpdated ? fmtDateTime(data.lastUpdated) : '-'} · ที่มา: ฐานข้อมูล PMO Tracker งาน {data.taskCount} รายการ
			</p>
		</div>
		<div class="flex gap-2 print:hidden">
			<Button variant="outline" href="/export/tasks.csv"><Download /> ส่งออก CSV</Button>
			<Button variant="outline" onclick={() => window.print()}><Printer /> พิมพ์รายงาน</Button>
		</div>
	</header>

	<!-- 01 Process: แถบขั้นตอนงาน -->
	<nav aria-label="ขั้นตอนงาน" class="panel grid grid-cols-2 gap-1 p-2 sm:flex sm:items-stretch">
		{#each data.process as s, i (s.key)}
			<a href={s.href} class="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-mint">
				<span class="flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums {s.key === 'done' ? 'bg-ok text-white' : 'bg-mint text-primary'}">{i + 1}</span>
				<span class="leading-tight">
					<span class="block text-sm text-muted-foreground">{s.label}</span>
					<span class="block text-xl font-semibold tabular-nums">{s.count} <span class="text-sm font-normal text-muted-foreground">งาน</span></span>
				</span>
			</a>
			{#if i < data.process.length - 1}<ChevronRight class="my-auto hidden size-4 shrink-0 text-muted-foreground sm:block" />{/if}
		{/each}
	</nav>

	<!-- 02 KPI: ค่าจริง + เป้า + สถานะ + การเทียบ + สาเหตุ + ที่มา -->
	<section aria-labelledby="kpi-h">
		<h2 id="kpi-h" class="sr-only">ตัวชี้วัดหลัก (KPI)</h2>
		<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
			{#each data.kpis as k (k.key)}
				<article class="panel flex flex-col gap-3 p-4">
					<div class="flex items-start justify-between gap-2">
						<h3 class="text-base leading-snug">{k.title}</h3>
						<StatusPill level={k.level} size="sm" />
					</div>
					<div class="flex flex-wrap items-baseline gap-x-2">
						<span class="text-4xl font-semibold tabular-nums">{k.value ?? '–'}</span>
						<span class="text-sm text-muted-foreground">{k.unit}</span>
						<span class="ml-auto text-sm text-muted-foreground">{k.targetText}</span>
					</div>
					<Bullet value={k.bar.value} target={k.bar.target} max={k.bar.max} level={k.level} />
					<p class="text-sm font-medium">{k.compare}</p>
					<p class="text-sm text-muted-foreground">{k.insight}</p>
					<footer class="mt-auto border-t pt-2 text-xs text-muted-foreground">
						<p>สูตร: {k.formula}</p>
						<a href={k.href} class="mt-0.5 inline-flex items-center hover:text-primary hover:underline">ที่มา: {k.source} · ดูรายการ <ChevronRight class="size-3" /></a>
					</footer>
				</article>
			{/each}
		</div>
	</section>

	<div class="grid gap-5 *:min-w-0 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
		<!-- 03 Trend -->
		<section class="panel p-5">
			<p class="eyebrow">แนวโน้มเทียบแผน</p>
			<h2 class="text-xl">
				{#if trendGap < 0}ภาพรวมช้ากว่าแผน {-trendGap} จุด ณ วันนี้{:else}ภาพรวมเป็นไปตามแผน (เร็วกว่า {trendGap} จุด){/if}
			</h2>
			<div class="mt-3"><SCurve {...data.trend} /></div>
			<p class="summary">
				เส้นประคือ % งานที่ควรเสร็จสะสมตามกำหนดส่งของทุกงาน (ถ่วงน้ำหนักด้วยชั่วโมงประเมิน) จุดสีเข้มคือผลจริงวันนี้
				แถบระหว่างสองจุดคือส่วนที่ต้องเร่งให้ทันแผน
			</p>
		</section>

		<!-- 05 Alert + 06 Action -->
		<section class="panel flex flex-col p-5">
			<p class="eyebrow">แจ้งเตือนและสิ่งที่ต้องทำ</p>
			<h2 class="text-xl">{late.length ? `${late.length} งานเลยกำหนด ต้องตามวันนี้` : 'ไม่มีงานเลยกำหนด'}</h2>
			<ul class="mt-3 divide-y">
				{#each data.alerts.slice(0, 8) as a (a.id)}
					<li class="flex items-start gap-3 py-2.5">
						<StatusPill level={a.level} text="" size="sm" />
						<div class="min-w-0 flex-1">
							<a href="/tasks/{a.id}" class="line-clamp-1 text-sm font-medium hover:underline">{a.code} {a.title}</a>
							<p class="text-xs text-muted-foreground">{a.projectName} · ความสำคัญ{PRIORITY_LABEL[a.priority]} · คืบหน้า {a.progress}%</p>
							<p class="text-xs">
								<span class="font-medium">ผู้รับผิดชอบ: {a.assigneeName ?? 'ยังไม่มี'}</span> · กำหนด {fmtDate(a.dueDate)}
							</p>
						</div>
						<span class="shrink-0 text-right text-xs font-medium {a.level === 'bad' ? 'text-bad' : 'text-warn-ink'}">{a.age}</span>
					</li>
				{:else}
					<li class="py-6 text-center text-sm text-muted-foreground">ไม่มีงานที่ต้องเร่ง</li>
				{/each}
			</ul>
			{#if data.alerts.length > 8}
				<a href="/tasks?status=overdue" class="mt-2 text-sm text-primary hover:underline">ดูทั้งหมด {data.alerts.length} รายการ →</a>
			{/if}
			<p class="summary mt-auto">เรียงตามความรุนแรง: เลยกำหนดนานสุดก่อน แล้วตามความสำคัญ · ทุกรายการมีผู้รับผิดชอบและวันกำหนด กดชื่องานเพื่ออัปเดต</p>
		</section>
	</div>

	<div class="grid gap-5 *:min-w-0 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
		<!-- 04 Analysis: รายโปรเจกต์ -->
		<section class="panel p-5">
			<p class="eyebrow">วิเคราะห์รายโปรเจกต์</p>
			<h2 class="text-xl">{behind.length ? `${behind[0].name} ล่าช้าที่สุด` : 'ทุกโปรเจกต์อยู่ในเกณฑ์'}</h2>
			<ul class="mt-4 space-y-3.5">
				{#each data.projects as p (p.id)}
					<li>
						<a href="/projects/{p.id}" class="block rounded-lg hover:bg-mint/50">
							<div class="flex items-center justify-between gap-2 text-sm">
								<span class="truncate font-medium">{p.name}</span>
								<StatusPill level={p.level} text={p.gap < 0 ? `ช้า ${-p.gap} จุด` : 'ตามแผน'} size="sm" />
							</div>
							<div class="mt-1.5 flex items-center gap-3">
								<div class="flex-1"><Bullet value={p.actual} target={p.plan} level={p.level} /></div>
								<span class="w-24 shrink-0 text-right text-xs text-muted-foreground tabular-nums sm:w-28">{p.actual}% / แผน {p.plan}%</span>
							</div>
						</a>
					</li>
				{/each}
			</ul>
			<p class="summary">
				แถบ = ความคืบหน้าจริง · ขีดดำ = แผน ณ วันนี้ · ช้ากว่าแผนเกิน {-TARGETS.progressGap.warn} จุดเป็น “เฝ้าระวัง” เกิน {-TARGETS.progressGap.bad} จุดเป็น “ต่ำกว่าเป้า”
			</p>
		</section>

		<!-- 04 Analysis: รายคน -->
		<section id="people" class="panel p-5">
			<p class="eyebrow">วิเคราะห์รายบุคคล</p>
			<h2 class="text-xl">
				{peopleLate.length ? `${peopleLate.length} คนมีงานเลยกำหนด` : 'ไม่มีใครมีงานเลยกำหนด'}{topLoad ? ` · ${topLoad.name} ภาระคงเหลือมากสุด` : ''}
			</h2>
			<div class="mt-3 overflow-x-auto">
				<table class="w-full text-sm">
					<thead class="text-left text-xs text-muted-foreground">
						<tr class="border-b">
							<th class="py-2 pr-2 font-medium">ผู้รับผิดชอบ</th>
							<th class="px-2 py-2 font-medium">สถานะ</th>
							<th class="hidden w-[24%] px-2 py-2 font-medium md:table-cell">คืบหน้าเทียบแผน</th>
							<th class="hidden px-2 py-2 text-right font-medium sm:table-cell">ค้าง</th>
							<th class="px-2 py-2 text-right font-medium"><span class="sm:hidden">เลย</span><span class="hidden sm:inline">เลยกำหนด</span></th>
							<th class="w-[30%] py-2 pl-2 font-medium sm:w-[22%]">ชม. คงเหลือ<span class="hidden sm:inline"> 14 วัน</span></th>
						</tr>
					</thead>
					<tbody>
						{#each data.people as p (p.id)}
							<tr class="border-b last:border-0">
								<td class="py-2 pr-2"><a href="/tasks?assignee={p.id}" class="font-medium hover:underline">{p.name}</a></td>
								<td class="px-2 py-2">
									<StatusPill
										level={p.overdue ? 'bad' : p.level}
										text={p.overdue ? 'เลยกำหนด' : p.level === 'ok' ? 'ตามแผน' : p.level === 'none' ? 'ไม่มีงาน' : 'ช้ากว่าแผน'}
										size="sm"
									/>
								</td>
								<td class="hidden px-2 py-2 md:table-cell"><Bullet value={p.actual} target={p.plan} level={p.level} /></td>
								<td class="hidden px-2 py-2 text-right tabular-nums sm:table-cell">{p.open}</td>
								<td class="px-2 py-2 text-right tabular-nums {p.overdue ? 'font-semibold text-bad' : 'text-muted-foreground'}">{p.overdue}</td>
								<td class="py-2 pl-2">
									<div class="flex items-center gap-2">
										<div class="h-2.5 flex-1 rounded-full bg-mint">
											<div
												class="h-full rounded-full {p.remaining > TARGETS.workload.warn ? 'bg-warn' : p.id === topLoad?.id ? 'bg-primary' : 'bg-sage/60'}"
												style="width:{(p.remaining / maxRemaining) * 100}%"
											></div>
										</div>
										<span class="w-10 text-right text-xs tabular-nums">{p.remaining}</span>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<p class="summary">
				เรียงคนที่ต้องช่วยก่อน · ชม. คงเหลือ = ชม.ประเมิน × (100% − คืบหน้า) ของงานที่ครบกำหนดภายใน 14 วัน เกิน {TARGETS.workload.warn} ชม. ถือว่าเสี่ยงงานล้น
			</p>
		</section>
	</div>

	<div class="grid gap-5 *:min-w-0 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
		<!-- KRI: สัญญาณเสี่ยง แยกจาก KPI -->
		<section class="panel p-5">
			<p class="eyebrow">สัญญาณเสี่ยง (KRI) · เห็นก่อน KPI ตก</p>
			<h2 class="text-xl">{data.kri.filter((k) => k.level !== 'ok').length} สัญญาณที่ต้องเฝ้าระวัง</h2>
			<ul class="mt-3 grid gap-3 md:grid-cols-3">
				{#each data.kri as k (k.title)}
					<li class="rounded-xl bg-muted p-3">
						<StatusPill level={k.level} text={k.level === 'ok' ? 'ปกติ' : k.level === 'warn' ? 'เฝ้าระวัง' : 'ต้องแก้'} size="sm" />
						<p class="mt-2 text-2xl font-semibold tabular-nums">{k.value}</p>
						<p class="text-sm">{k.title}</p>
						<p class="mt-1 text-xs text-muted-foreground">{k.detail}</p>
					</li>
				{/each}
			</ul>
		</section>

		<section class="panel p-5 print:hidden">
			<p class="eyebrow">หลักฐานการเปลี่ยนแปลง</p>
			<h2 class="text-xl">ความเคลื่อนไหวล่าสุด</h2>
			<ul class="mt-2 divide-y">
				{#each data.recent as a (a.id)}
					<li class="py-2 text-sm">
						<span class="font-medium">{a.userId ? data.userNames[a.userId] : 'ระบบ'}</span>
						<span class="text-muted-foreground">{actionText(a.action, a.entityType)}</span>
						{#if a.entityType === 'task' && a.entityId && a.action !== 'delete'}
							<a class="hover:underline" href="/tasks/{a.entityId}">{a.entityLabel}</a>
						{:else}
							<span>{a.entityLabel}</span>
						{/if}
						<span class="block text-xs text-muted-foreground">{fmtDateTime(a.createdAt)}</span>
					</li>
				{/each}
			</ul>
			<a href="/activity" class="mt-2 inline-block text-sm text-primary hover:underline">ดู Activity Log ทั้งหมด →</a>
		</section>
	</div>
</div>

<style>
	/* การ์ดตามคู่มือ: มุมโค้ง 16px เงาสองชั้นแทนเส้นขอบ */
	.dash :global(.panel) {
		background: var(--card);
		border-radius: 16px;
		box-shadow:
			0 1px 2px rgb(31 43 37 / 0.06),
			0 4px 16px -4px rgb(31 43 37 / 0.08);
	}
	.eyebrow {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--sage);
	}
	.summary {
		margin-top: 0.75rem;
		border-top: 1px solid var(--border);
		padding-top: 0.625rem;
		font-size: 0.8125rem;
		color: var(--muted-foreground);
	}
	@media print {
		.dash :global(.panel) {
			box-shadow: none;
			border: 1px solid var(--border);
			break-inside: avoid;
		}
	}
</style>
