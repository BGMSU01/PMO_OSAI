<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import ChangeList from '#lib/components/app/ChangeList.svelte';
	import { actionText, fmtDateTime } from '#lib/labels.js';
	import { selectClass } from '#lib/ui.js';
	import Undo2 from '@lucide/svelte/icons/undo-2';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let filterForm: HTMLFormElement;

	const pages = $derived(Math.max(1, Math.ceil(data.total / data.pageSize)));
	const pageHref = (p: number) => {
		const url = new URL(page.url.href);
		url.searchParams.set('page', String(p));
		return url.pathname + url.search;
	};
	const dot: Record<string, string> = {
		create: 'bg-emerald-500',
		update: 'bg-primary',
		status: 'bg-blue-400',
		delete: 'bg-rose-500',
		revert: 'bg-amber-500',
		import: 'bg-violet-500',
		login: 'bg-zinc-400'
	};
</script>

<svelte:head><title>Activity Log · PMO Tracker</title></svelte:head>

<div class="space-y-4">
	<div>
		<h1 class="page-title">Activity Log</h1>
		<p class="text-sm text-muted-foreground">บันทึกทุกการเปลี่ยนแปลง — ใครแก้อะไร เมื่อไร ({data.total} รายการ)</p>
	</div>

	<form bind:this={filterForm} class="toolbar grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap">
		<select name="user" class="{selectClass} w-full sm:w-auto" value={data.filters.user} onchange={() => filterForm.requestSubmit()}>
			<option value="all">ทุกคน</option>
			{#each data.users as u (u.id)}<option value={String(u.id)}>{u.name}</option>{/each}
		</select>
		<select name="type" class="{selectClass} w-full sm:w-auto" value={data.filters.type} onchange={() => filterForm.requestSubmit()}>
			<option value="all">ทุกประเภท</option>
			<option value="task">งาน</option>
			<option value="project">โปรเจกต์</option>
			<option value="user">พนักงาน</option>
			<option value="system">ระบบ</option>
			<option value="login">การเข้าสู่ระบบ</option>
		</select>
		<Input type="date" name="from" value={data.filters.from} class="w-full sm:w-auto" onchange={() => filterForm.requestSubmit()} />
		<span class="hidden text-sm text-muted-foreground sm:inline">ถึง</span>
		<Input type="date" name="to" value={data.filters.to} class="w-full sm:w-auto" onchange={() => filterForm.requestSubmit()} />
	</form>

	{#if form?.message}
		<p class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{form.message}</p>
	{:else if form?.restored}
		<p class="rounded-md bg-mint px-3 py-2 text-sm text-ok">✓ กู้คืนงานเรียบร้อย</p>
	{:else if form?.reverted}
		<p class="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">ย้อนกลับเรียบร้อย (บันทึกเป็นรายการใหม่ด้านบน) ✓</p>
	{/if}

	<div class="rounded-2xl border bg-card shadow-card">
		<ul class="divide-y">
			{#each data.rows as a (a.id)}
				<li class="flex gap-3 px-4 py-3">
					<span class="mt-1.5 size-2.5 shrink-0 rounded-full {dot[a.action] ?? 'bg-zinc-400'}"></span>
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-baseline gap-x-2">
							<span class="font-medium">{a.userId ? (data.userNames[a.userId] ?? 'ผู้ใช้ที่ถูกลบ') : 'ระบบ'}</span>
							<span class="text-sm text-muted-foreground">{actionText(a.action, a.entityType)}</span>
							{#if a.entityType === 'task' && a.entityId}
								<a class="text-sm hover:underline" href="/tasks/{a.entityId}">{a.entityLabel}</a>
							{:else if a.entityType === 'project' && a.entityId && a.action !== 'delete'}
								<a class="text-sm hover:underline" href="/projects/{a.entityId}">{a.entityLabel}</a>
							{:else if a.action !== 'login'}
								<span class="text-sm">{a.entityLabel}</span>
							{/if}
							<span class="ml-auto text-xs whitespace-nowrap text-muted-foreground">{fmtDateTime(a.createdAt)}</span>
						</div>
						<ChangeList changes={a.changes} users={data.userNames} projects={data.projectNames} />
					</div>
					{#if a.entityType === 'task' && a.action === 'delete' && a.entityId && data.user.role === 'admin' && data.deletedIds.includes(a.entityId)}
						<form method="POST" action="?/restore" use:enhance>
							<input type="hidden" name="taskId" value={a.entityId} />
							<Button type="submit" size="xs" variant="ghost"><Undo2 /> กู้คืน</Button>
						</form>
					{:else if a.entityType === 'task' && ['update', 'status', 'revert'].includes(a.action)}
						<form method="POST" action="?/revert" use:enhance={({ cancel }) => { if (!confirm('คืนค่าก่อนการแก้ไขนี้?')) cancel(); }}>
							<input type="hidden" name="logId" value={a.id} />
							<Button type="submit" size="xs" variant="ghost" title="ย้อนกลับการแก้ไขนี้"><Undo2 /> ย้อนกลับ</Button>
						</form>
					{/if}
				</li>
			{:else}
				<li class="py-10 text-center text-sm text-muted-foreground">ไม่พบรายการ</li>
			{/each}
		</ul>
	</div>

	{#if pages > 1}
		<div class="flex items-center justify-center gap-2 text-sm">
			<Button size="sm" variant="outline" href={pageHref(data.filters.page - 1)} disabled={data.filters.page <= 1} class={data.filters.page <= 1 ? 'pointer-events-none opacity-50' : ''}>ก่อนหน้า</Button>
			<span>หน้า {data.filters.page} / {pages}</span>
			<Button size="sm" variant="outline" href={pageHref(data.filters.page + 1)} class={data.filters.page >= pages ? 'pointer-events-none opacity-50' : ''}>ถัดไป</Button>
		</div>
	{/if}
</div>
