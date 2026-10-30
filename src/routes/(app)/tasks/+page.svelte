<script lang="ts">
	import * as Table from '#lib/components/ui/table/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import StatusBadge from '#lib/components/app/StatusBadge.svelte';
	import PriorityBadge from '#lib/components/app/PriorityBadge.svelte';
	import DueBadge from '#lib/components/app/DueBadge.svelte';
	import ProgressBar from '#lib/components/app/ProgressBar.svelte';
	import { STATUSES, STATUS_LABEL } from '#lib/labels.js';
	import { selectClass } from '#lib/ui.js';
	import Plus from '@lucide/svelte/icons/plus';
	import Download from '@lucide/svelte/icons/download';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let form: HTMLFormElement;
</script>

<svelte:head><title>งานทั้งหมด · PMO Tracker</title></svelte:head>

<div class="space-y-4">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold">งานทั้งหมด</h1>
			<p class="text-sm text-muted-foreground">พบ {data.rows.length} งาน</p>
		</div>
		<div class="flex gap-2">
			<Button variant="outline" href="/export/tasks.csv"><Download /> CSV</Button>
			<Button href="/tasks/new"><Plus /> เพิ่มงาน</Button>
		</div>
	</div>

	<form bind:this={form} class="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" data-sveltekit-keepfocus data-sveltekit-noscroll>
		<Input name="q" value={data.filters.q} placeholder="ค้นหารหัส / ชื่องาน / หมายเหตุ" class="col-span-2 w-full sm:w-64" oninput={() => form.requestSubmit()} />
		<select name="assignee" class="{selectClass} w-full sm:w-auto" value={data.filters.assignee} onchange={() => form.requestSubmit()}>
			<option value="all">ผู้รับผิดชอบ: ทุกคน</option>
			<option value="me">งานของฉัน</option>
			{#each data.users.filter((u) => u.username !== 'admin') as u (u.id)}<option value={String(u.id)}>{u.name}</option>{/each}
		</select>
		<select name="project" class="{selectClass} w-full sm:w-auto" value={data.filters.project} onchange={() => form.requestSubmit()}>
			<option value="all">ทุกโปรเจกต์</option>
			{#each data.projects as p (p.id)}<option value={String(p.id)}>{p.name}</option>{/each}
		</select>
		<select name="status" class="{selectClass} w-full sm:w-auto" value={data.filters.status} onchange={() => form.requestSubmit()}>
			<option value="all">ทุกสถานะ</option>
			{#each STATUSES as s (s)}<option value={s}>{STATUS_LABEL[s]}</option>{/each}
			<option value="overdue">เลยกำหนด</option>
		</select>
	</form>

	<!-- มือถือ: การ์ดแทนตาราง -->
	<ul class="space-y-2 md:hidden">
		{#each data.rows as t (t.id)}
			<li>
				<a href="/tasks/{t.id}" class="block rounded-xl border bg-card p-3 active:bg-mint/50">
					<div class="flex items-center justify-between gap-2 text-xs text-muted-foreground">
						<span class="truncate">{t.code} · {t.projectName}</span>
						<PriorityBadge priority={t.priority} />
					</div>
					<p class="mt-1 text-sm leading-snug font-medium">{t.title}</p>
					<div class="mt-2 flex items-center gap-2">
						<div class="flex-1"><ProgressBar value={t.progress} /></div>
						<span class="text-xs tabular-nums">{t.progress}%</span>
					</div>
					<div class="mt-2 flex flex-wrap items-center justify-between gap-2">
						<span class="flex items-center gap-2 text-xs"><StatusBadge status={t.status} /> {t.assigneeName ?? '-'}</span>
						<DueBadge task={t} />
					</div>
				</a>
			</li>
		{:else}
			<li class="py-10 text-center text-sm text-muted-foreground">ไม่พบงานตามเงื่อนไข</li>
		{/each}
	</ul>

	<div class="hidden rounded-xl border bg-card md:block">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head class="w-20">รหัส</Table.Head>
					<Table.Head>ชื่องาน</Table.Head>
					<Table.Head>ผู้รับผิดชอบ</Table.Head>
					<Table.Head>ความสำคัญ</Table.Head>
					<Table.Head>สถานะ</Table.Head>
					<Table.Head class="w-32">ความคืบหน้า</Table.Head>
					<Table.Head>กำหนดส่ง</Table.Head>
					<Table.Head class="text-right">ชม.</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.rows as t (t.id)}
					<Table.Row>
						<Table.Cell class="text-muted-foreground">{t.code}</Table.Cell>
						<Table.Cell class="max-w-md whitespace-normal">
							<a href="/tasks/{t.id}" class="font-medium hover:underline">{t.title}</a>
							<p class="text-xs text-muted-foreground">{t.projectName}</p>
						</Table.Cell>
						<Table.Cell>{t.assigneeName ?? '-'}</Table.Cell>
						<Table.Cell><PriorityBadge priority={t.priority} /></Table.Cell>
						<Table.Cell><StatusBadge status={t.status} /></Table.Cell>
						<Table.Cell>
							<div class="flex items-center gap-2"><div class="flex-1"><ProgressBar value={t.progress} /></div><span class="text-xs tabular-nums">{t.progress}%</span></div>
						</Table.Cell>
						<Table.Cell><DueBadge task={t} /></Table.Cell>
						<Table.Cell class="text-right text-muted-foreground tabular-nums">{t.actualHours}/{t.estimatedHours}</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row><Table.Cell colspan={8} class="py-10 text-center text-muted-foreground">ไม่พบงานตามเงื่อนไข</Table.Cell></Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
</div>
