<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import TaskForm from '#lib/components/app/TaskForm.svelte';
	import StatusBadge from '#lib/components/app/StatusBadge.svelte';
	import PriorityBadge from '#lib/components/app/PriorityBadge.svelte';
	import DueBadge from '#lib/components/app/DueBadge.svelte';
	import ChangeList from '#lib/components/app/ChangeList.svelte';
	import { ACTION_LABEL, fmtDateTime } from '#lib/labels.js';
	import Undo2 from '@lucide/svelte/icons/undo-2';
	import Trash from '@lucide/svelte/icons/trash';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const isAdmin = $derived(data.user.role === 'admin');
	const t = $derived(data.task);
</script>

<svelte:head><title>{t.code} {t.title} · PMO Tracker</title></svelte:head>

<div class="space-y-4">
	<a href="/tasks" class="text-sm text-muted-foreground hover:underline">← งานทั้งหมด</a>
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<p class="text-sm text-muted-foreground">{t.code} · <a class="hover:underline" href="/projects/{t.projectId}">{t.projectName}</a></p>
			<h1 class="text-2xl font-semibold">{t.title}</h1>
			<div class="mt-2 flex flex-wrap items-center gap-2">
				<StatusBadge status={t.status} />
				<PriorityBadge priority={t.priority} />
				<DueBadge task={t} />
				<span class="text-sm text-muted-foreground">ผู้รับผิดชอบ: {t.assigneeName ?? '-'}</span>
			</div>
		</div>
		{#if isAdmin && !t.deletedAt}
			<form method="POST" action="?/delete" use:enhance={({ cancel }) => { if (!confirm(`ลบงาน ${t.code}? (ข้อมูลยังดูย้อนหลังได้ใน Activity Log)`)) cancel(); }}>
				<Button variant="destructive" type="submit"><Trash /> ลบงาน</Button>
			</form>
		{/if}
	</div>

	{#if t.deletedAt}
		<div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-bad/30 bg-bad/5 px-4 py-3">
			<p class="text-sm"><span class="font-medium text-bad">✕ งานนี้ถูกลบแล้ว</span> เมื่อ {fmtDateTime(t.deletedAt)} · ไม่นับใน Dashboard และ Kanban</p>
			{#if isAdmin}
				<form method="POST" action="?/restore" use:enhance>
					<Button type="submit" size="sm"><Undo2 /> กู้คืนงาน</Button>
				</form>
			{/if}
		</div>
	{/if}

	<div class="grid gap-4 *:min-w-0 xl:grid-cols-[minmax(0,1fr)_400px]">
		<Card.Root>
			<Card.Header>
				<Card.Title>{data.canEdit ? 'อัปเดตงาน' : 'รายละเอียดงาน'}</Card.Title>
				<Card.Description>
					{#if !data.canEdit}
						ดูได้อย่างเดียว — แก้ไขได้เฉพาะผู้รับผิดชอบหรือ Admin
					{:else if !isAdmin}
						คุณอัปเดตได้: สถานะ, % ความคืบหน้า, ชั่วโมงจริง และหมายเหตุ
					{:else}
						แก้ไขล่าสุด {fmtDateTime(t.updatedAt)} (เวอร์ชัน {t.version})
					{/if}
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<form method="POST" action="?/update" use:enhance={() => async ({ update }) => update({ reset: false })} class="space-y-4">
					<input type="hidden" name="version" value={t.version} />
					<fieldset disabled={!data.canEdit} class="contents">
						{#key t.version}
							<TaskForm task={t} users={data.users} projects={data.projects} {isAdmin} />
						{/key}
					</fieldset>
					{#if form?.message}
						<p class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{form.message}</p>
					{:else if form?.saved}
						<p class="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">บันทึกแล้ว ✓</p>
					{/if}
					{#if data.canEdit}
						<div class="flex justify-end"><Button type="submit">บันทึกการเปลี่ยนแปลง</Button></div>
					{/if}
				</form>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>ประวัติการแก้ไข</Card.Title>
				<Card.Description>ใครแก้อะไร เมื่อไร — กด "ย้อนกลับ" เพื่อคืนค่าเดิม</Card.Description>
			</Card.Header>
			<Card.Content>
				<ol class="relative space-y-4 border-l pl-4">
					{#each data.history as h (h.id)}
						<li class="relative">
							<span class="absolute top-1.5 -left-[21px] size-2.5 rounded-full border-2 border-background {h.action === 'revert' ? 'bg-amber-500' : h.action === 'create' ? 'bg-emerald-500' : 'bg-primary'}"></span>
							<div class="flex items-start justify-between gap-2">
								<p class="text-sm">
									<span class="font-medium">{h.userId ? data.userNames[h.userId] : 'ระบบ'}</span>
									<span class="text-muted-foreground">{ACTION_LABEL[h.action]}</span>
								</p>
								{#if data.canEdit && ['update', 'status', 'revert'].includes(h.action)}
									<form method="POST" action="?/revert" use:enhance={({ cancel }) => { if (!confirm('คืนค่าก่อนการแก้ไขนี้?')) cancel(); }}>
										<input type="hidden" name="logId" value={h.id} />
										<button class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><Undo2 class="size-3.5" /> ย้อนกลับ</button>
									</form>
								{/if}
							</div>
							<p class="text-xs text-muted-foreground">{fmtDateTime(h.createdAt)}</p>
							<ChangeList changes={h.changes} users={data.userNames} projects={data.projectNames} />
						</li>
					{:else}
						<li class="text-sm text-muted-foreground">ยังไม่มีการแก้ไขตั้งแต่นำเข้าจาก Excel</li>
					{/each}
				</ol>
			</Card.Content>
		</Card.Root>
	</div>
</div>
