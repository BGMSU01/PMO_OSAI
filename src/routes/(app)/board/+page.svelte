<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { deserialize } from '$app/forms';
	import { page } from '$app/state';
	import { Button } from '#lib/components/ui/button/index.js';
	import DueBadge from '#lib/components/app/DueBadge.svelte';
	import PriorityBadge from '#lib/components/app/PriorityBadge.svelte';
	import ProgressBar from '#lib/components/app/ProgressBar.svelte';
	import { STATUSES, STATUS_LABEL, STATUS_TH, type Status } from '#lib/labels.js';
	import { selectClass } from '#lib/ui.js';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Plus from '@lucide/svelte/icons/plus';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// สถานะชั่วคราวระหว่างรอ server ตอบ (optimistic update)
	let pending = $state<Record<number, Status>>({});
	let dragId = $state<number | null>(null);
	let overCol = $state<Status | null>(null);
	let message = $state('');

	const statusOf = (t: (typeof data.tasks)[number]) => pending[t.id] ?? t.status;
	const columns = $derived(
		STATUSES.map((s) => ({ status: s, tasks: data.tasks.filter((t) => statusOf(t) === s) }))
	);
	const canMove = (t: (typeof data.tasks)[number]) =>
		data.user.role === 'admin' || t.assigneeId === data.user.id;

	const colStyle: Record<Status, string> = {
		todo: 'border-t-zinc-400',
		doing: 'border-t-blue-500',
		done: 'border-t-emerald-500'
	};

	async function move(id: number, status: Status) {
		const task = data.tasks.find((t) => t.id === id);
		if (!task || statusOf(task) === status) return;
		pending[id] = status;
		message = '';
		const body = new FormData();
		body.set('id', String(id));
		body.set('status', status);
		body.set('version', String(task.version));
		const res = await fetch('?/move', { method: 'POST', body, headers: { 'x-sveltekit-action': 'true' } });
		const result = deserialize(await res.text());
		if (result.type === 'failure') message = String(result.data?.message ?? 'บันทึกไม่สำเร็จ');
		await invalidateAll();
		delete pending[id];
	}

	function setFilter(key: string, value: string) {
		const url = new URL(page.url.href);
		url.searchParams.set(key, value);
		goto(url);
	}
</script>

<svelte:head><title>Kanban Board · PMO Tracker</title></svelte:head>

<div class="space-y-4">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold">Kanban Board</h1>
			<p class="text-sm text-muted-foreground"><span class="hidden lg:inline">ลากการ์ดไปคอลัมน์อื่นเพื่อเปลี่ยนสถานะ (หรือกดปุ่ม ‹ › บนการ์ด)</span><span class="lg:hidden">ปัดซ้าย–ขวาเพื่อดูคอลัมน์ · กด ‹ › บนการ์ดเพื่อเปลี่ยนสถานะ</span></p>
		</div>
		<div class="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
			<select class="{selectClass} w-full sm:w-auto" value={data.filters.assignee} onchange={(e) => setFilter('assignee', e.currentTarget.value)}>
				<option value="me">งานของฉัน</option>
				<option value="all">ทุกคน</option>
				{#each data.users as u (u.id)}<option value={String(u.id)}>{u.name}</option>{/each}
			</select>
			<select class="{selectClass} w-full sm:w-auto" value={data.filters.project} onchange={(e) => setFilter('project', e.currentTarget.value)}>
				<option value="all">ทุกโปรเจกต์</option>
				{#each data.projects as p (p.id)}<option value={String(p.id)}>{p.name}</option>{/each}
			</select>
			<Button href="/tasks/new" class="col-span-2 sm:col-span-1"><Plus /> เพิ่มงาน</Button>
		</div>
	</div>

	{#if message}
		<p class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{message}</p>
	{/if}

	<div class="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:px-6 md:mx-0 md:px-0 lg:grid lg:grid-cols-3 lg:gap-4 lg:overflow-visible lg:pb-0">
		{#each columns as col (col.status)}
			<section
				role="list"
				aria-label={STATUS_LABEL[col.status]}
				class="flex min-h-[50vh] w-[85%] max-w-sm shrink-0 snap-start flex-col rounded-xl sm:w-[46%] lg:min-h-[60vh] lg:w-auto lg:max-w-none border border-t-4 bg-muted/40 transition-colors {colStyle[col.status]} {overCol === col.status
					? 'bg-primary/5 ring-2 ring-primary/30'
					: ''}"
				ondragover={(e) => {
					if (dragId === null) return;
					e.preventDefault();
					overCol = col.status;
				}}
				ondragleave={() => (overCol = null)}
				ondrop={(e) => {
					e.preventDefault();
					overCol = null;
					if (dragId !== null) move(dragId, col.status);
					dragId = null;
				}}
			>
				<header class="flex items-center justify-between px-3 py-2.5">
					<h2 class="font-semibold">
						{STATUS_LABEL[col.status]} <span class="text-sm font-normal text-muted-foreground">· {STATUS_TH[col.status]}</span>
					</h2>
					<span class="rounded-full bg-background px-2 text-sm tabular-nums">{col.tasks.length}</span>
				</header>
				<div class="flex flex-1 flex-col gap-2 px-2 pb-2">
					{#each col.tasks as t (t.id)}
						{@const movable = canMove(t)}
						{@const idx = STATUSES.indexOf(col.status)}
						<article
							role="listitem"
							draggable={movable}
							ondragstart={(e) => {
								dragId = t.id;
								e.dataTransfer?.setData('text/plain', String(t.id));
							}}
							ondragend={() => (dragId = null)}
							class="group rounded-lg border bg-card p-3 shadow-xs transition {movable ? 'cursor-grab active:cursor-grabbing' : 'opacity-80'} {dragId === t.id
								? 'opacity-40'
								: ''} {pending[t.id] ? 'animate-pulse' : ''}"
						>
							<div class="flex items-center justify-between gap-2 text-xs text-muted-foreground">
								<span class="truncate">{t.code} · {t.projectName}</span>
								<PriorityBadge priority={t.priority} />
							</div>
							<a href="/tasks/{t.id}" class="mt-1 block text-sm leading-snug font-medium hover:underline">{t.title}</a>
							{#if t.note?.startsWith('[รอตรวจ]')}
								<span class="mt-1 inline-block rounded bg-violet-100 px-1.5 text-xs text-violet-700">รอตรวจ</span>
							{/if}
							{#if col.status !== 'todo'}
								<div class="mt-2 flex items-center gap-2">
									<div class="flex-1"><ProgressBar value={t.progress} tone={col.status === 'done' ? 'emerald' : 'primary'} /></div>
									<span class="text-xs tabular-nums text-muted-foreground">{t.progress}%</span>
								</div>
							{/if}
							<div class="mt-2 flex items-center justify-between gap-2">
								<span class="flex min-w-0 items-center gap-1.5 text-xs">
									<span class="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
										{t.assigneeName?.slice(0, 1) ?? '?'}
									</span>
									<span class="truncate">{t.assigneeName ?? 'ไม่มีผู้รับผิดชอบ'}</span>
								</span>
								<span class="shrink-0"><DueBadge task={{ ...t, status: statusOf(t) }} short /></span>
							</div>
							{#if movable}
								<div class="mt-2 flex justify-between border-t pt-2 opacity-60 group-hover:opacity-100">
									<button
										class="flex items-center text-xs text-muted-foreground hover:text-foreground disabled:invisible"
										disabled={idx === 0}
										onclick={() => move(t.id, STATUSES[idx - 1])}
									>
										<ChevronLeft class="size-3.5" />{idx > 0 ? STATUS_LABEL[STATUSES[idx - 1]] : ''}
									</button>
									<button
										class="flex items-center text-xs text-muted-foreground hover:text-foreground disabled:invisible"
										disabled={idx === STATUSES.length - 1}
										onclick={() => move(t.id, STATUSES[idx + 1])}
									>
										{idx < STATUSES.length - 1 ? STATUS_LABEL[STATUSES[idx + 1]] : ''}<ChevronRight class="size-3.5" />
									</button>
								</div>
							{/if}
						</article>
					{:else}
						<p class="py-8 text-center text-sm text-muted-foreground">ไม่มีงาน</p>
					{/each}
				</div>
			</section>
		{/each}
	</div>
</div>
