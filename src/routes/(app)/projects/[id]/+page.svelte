<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '#lib/components/ui/card/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import StatusBadge from '#lib/components/app/StatusBadge.svelte';
	import DueBadge from '#lib/components/app/DueBadge.svelte';
	import ProgressBar from '#lib/components/app/ProgressBar.svelte';
	import ChangeList from '#lib/components/app/ChangeList.svelte';
	import { ACTION_LABEL, fmtDateTime } from '#lib/labels.js';
	import { selectClass } from '#lib/ui.js';
	import Plus from '@lucide/svelte/icons/plus';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const p = $derived(data.project);
	const isAdmin = $derived(data.user.role === 'admin');
	let editing = $state(false);
</script>

<svelte:head><title>{p.name} · PMO Tracker</title></svelte:head>

<div class="space-y-4">
	<a href="/projects" class="text-sm text-muted-foreground hover:underline">← โปรเจกต์ทั้งหมด</a>
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold">{p.name} {#if p.status === 'archived'}<span class="text-base font-normal text-muted-foreground">(ปิดแล้ว)</span>{/if}</h1>
			{#if p.description}<p class="text-sm text-muted-foreground">{p.description}</p>{/if}
		</div>
		<div class="flex flex-wrap gap-2">
			{#if isAdmin}<Button variant="outline" onclick={() => (editing = !editing)}>แก้ไขโปรเจกต์</Button>{/if}
			<Button href="/board?project={p.id}&assignee=all" variant="outline">ดูใน Kanban</Button>
			<Button href="/tasks/new?project={p.id}"><Plus /> เพิ่มงาน</Button>
		</div>
	</div>

	{#if editing}
		<Card.Root>
			<Card.Content>
				<form method="POST" action="?/update" class="grid gap-3 sm:grid-cols-[1fr_2fr_auto_auto] sm:items-end" use:enhance={() => async ({ update, result }) => { await update({ reset: false }); if (result.type === 'success') editing = false; }}>
					<div class="space-y-1.5"><Label for="name">ชื่อ</Label><Input id="name" name="name" value={p.name} required /></div>
					<div class="space-y-1.5"><Label for="description">รายละเอียด</Label><Input id="description" name="description" value={p.description ?? ''} /></div>
					<div class="space-y-1.5">
						<Label for="status">สถานะ</Label>
						<select id="status" name="status" class="{selectClass} w-full" value={p.status}>
							<option value="active">ดำเนินการ</option>
							<option value="archived">ปิดโปรเจกต์</option>
						</select>
					</div>
					<Button type="submit">บันทึก</Button>
				</form>
				<form method="POST" action="?/delete" class="mt-3" use:enhance={({ cancel }) => { if (!confirm('ลบโปรเจกต์นี้?')) cancel(); }}>
					<button class="text-xs text-destructive hover:underline">ลบโปรเจกต์ (ได้เฉพาะเมื่อไม่มีงาน)</button>
				</form>
				{#if form?.message}<p class="mt-2 text-sm text-destructive">{form.message}</p>{/if}
			</Card.Content>
		</Card.Root>
	{/if}

	<div class="rounded-xl border bg-card">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>รหัส</Table.Head>
					<Table.Head>ชื่องาน</Table.Head>
					<Table.Head>ผู้รับผิดชอบ</Table.Head>
					<Table.Head>สถานะ</Table.Head>
					<Table.Head class="w-36">ความคืบหน้า</Table.Head>
					<Table.Head>กำหนดส่ง</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.tasks as t (t.id)}
					<Table.Row>
						<Table.Cell class="text-muted-foreground">{t.code}</Table.Cell>
						<Table.Cell class="whitespace-normal"><a class="font-medium hover:underline" href="/tasks/{t.id}">{t.title}</a></Table.Cell>
						<Table.Cell>{t.assigneeName ?? '-'}</Table.Cell>
						<Table.Cell><StatusBadge status={t.status} /></Table.Cell>
						<Table.Cell><div class="flex items-center gap-2"><div class="flex-1"><ProgressBar value={t.progress} /></div><span class="text-xs">{t.progress}%</span></div></Table.Cell>
						<Table.Cell><DueBadge task={t} /></Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row><Table.Cell colspan={6} class="py-8 text-center text-muted-foreground">ยังไม่มีงาน</Table.Cell></Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>

	{#if data.history.length}
		<Card.Root>
			<Card.Header><Card.Title>ประวัติโปรเจกต์</Card.Title></Card.Header>
			<Card.Content class="space-y-3">
				{#each data.history as h (h.id)}
					<div class="text-sm">
						<span class="font-medium">{h.userId ? data.userNames[h.userId] : 'ระบบ'}</span>
						<span class="text-muted-foreground">{ACTION_LABEL[h.action]} · {fmtDateTime(h.createdAt)}</span>
						<ChangeList changes={h.changes} />
					</div>
				{/each}
			</Card.Content>
		</Card.Root>
	{/if}
</div>
