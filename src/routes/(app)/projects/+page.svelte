<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import ProgressBar from '#lib/components/app/ProgressBar.svelte';
	import Plus from '@lucide/svelte/icons/plus';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let showForm = $state(false);
</script>

<svelte:head><title>โปรเจกต์ · PMO Tracker</title></svelte:head>

<div class="space-y-4">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="page-title">โปรเจกต์</h1>
			<p class="text-sm text-muted-foreground">ลูกค้า / โครงการทั้งหมด {data.projects.length} รายการ</p>
		</div>
		{#if data.user.role === 'admin'}
			<Button onclick={() => (showForm = !showForm)}><Plus /> เพิ่มโปรเจกต์</Button>
		{/if}
	</div>

	{#if showForm}
		<Card.Root>
			<Card.Content>
				<form method="POST" action="?/create" class="flex flex-wrap gap-2" use:enhance={() => async ({ update, result }) => { await update(); if (result.type === 'success') showForm = false; }}>
					<Input name="name" placeholder="ชื่อลูกค้า / โครงการ" class="w-64" required />
					<Input name="description" placeholder="รายละเอียด (ไม่บังคับ)" class="min-w-64 flex-1" />
					<Button type="submit">บันทึก</Button>
				</form>
				{#if form?.message}<p class="mt-2 text-sm text-destructive">{form.message}</p>{/if}
			</Card.Content>
		</Card.Root>
	{/if}

	<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
		{#each data.projects as p (p.id)}
			<a href="/projects/{p.id}" class="block">
				<Card.Root class="h-full transition hover:shadow-md {p.status === 'archived' ? 'opacity-60' : ''}">
					<Card.Header>
						<Card.Title>{p.name}</Card.Title>
						<Card.Description class="line-clamp-1">{p.description ?? (p.status === 'archived' ? 'ปิดโปรเจกต์แล้ว' : ' ')}</Card.Description>
					</Card.Header>
					<Card.Content class="space-y-3">
						<div class="flex items-center gap-2">
							<div class="flex-1"><ProgressBar value={p.progress} tone={p.overdue ? 'rose' : 'primary'} /></div>
							<span class="text-sm tabular-nums">{p.progress}%</span>
						</div>
						<div class="flex justify-between text-sm">
							<span>เสร็จ {p.done}/{p.total} งาน</span>
							{#if p.overdue}<span class="font-medium text-rose-600">เลยกำหนด {p.overdue}</span>{/if}
						</div>
						<p class="truncate text-xs text-muted-foreground">ทีม: {p.members.join(', ') || '-'}</p>
					</Card.Content>
				</Card.Root>
			</a>
		{/each}
	</div>
</div>
