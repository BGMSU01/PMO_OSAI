<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '#lib/components/ui/card/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { ROLE_LABEL } from '#lib/labels.js';
	import { selectClass } from '#lib/ui.js';
	import Plus from '@lucide/svelte/icons/plus';
	import Pencil from '@lucide/svelte/icons/pencil';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let showForm = $state(false);
</script>

<svelte:head><title>จัดการพนักงาน · PMO Tracker</title></svelte:head>

<div class="space-y-4">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="page-title">จัดการพนักงาน</h1>
			<p class="text-sm text-muted-foreground">
				ใช้งานอยู่ {data.users.filter((u) => u.active).length} คน · ปิดการใช้งาน {data.users.filter((u) => !u.active).length} คน
			</p>
		</div>
		<Button onclick={() => (showForm = !showForm)}><Plus /> เพิ่มพนักงาน</Button>
	</div>

	{#if form?.created}
		<p class="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">เพิ่ม {form.created} เรียบร้อย ✓</p>
	{/if}

	{#if showForm || form?.message}
		<Card.Root>
			<Card.Header><Card.Title>เพิ่มพนักงานใหม่</Card.Title></Card.Header>
			<Card.Content>
				<form method="POST" action="?/create" class="grid gap-3 sm:grid-cols-3" use:enhance={() => async ({ update, result }) => { await update(); if (result.type === 'success') showForm = false; }}>
					<div class="space-y-1.5"><Label for="name">ชื่อ *</Label><Input id="name" name="name" value={form?.values?.name ?? ''} required /></div>
					<div class="space-y-1.5"><Label for="username">ชื่อผู้ใช้ (login) *</Label><Input id="username" name="username" value={form?.values?.username ?? ''} required /></div>
					<div class="space-y-1.5"><Label for="password">รหัสผ่านเริ่มต้น *</Label><Input id="password" name="password" type="password" minlength={8} autocomplete="new-password" required /></div>
					<div class="space-y-1.5"><Label for="email">อีเมล</Label><Input id="email" name="email" type="email" value={form?.values?.email ?? ''} /></div>
					<div class="space-y-1.5"><Label for="position">ตำแหน่ง</Label><Input id="position" name="position" value={form?.values?.position ?? ''} /></div>
					<div class="space-y-1.5">
						<Label for="role">สิทธิ์</Label>
						<select id="role" name="role" class="{selectClass} w-full">
							<option value="member">พนักงาน</option>
							<option value="admin">Admin</option>
						</select>
					</div>
					{#if form?.message}<p class="text-sm text-destructive sm:col-span-3">{form.message}</p>{/if}
					<div class="flex justify-end sm:col-span-3"><Button type="submit">บันทึก</Button></div>
				</form>
			</Card.Content>
		</Card.Root>
	{/if}

	<div class="rounded-2xl border bg-card shadow-card">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>ชื่อ</Table.Head>
					<Table.Head>ชื่อผู้ใช้</Table.Head>
					<Table.Head>ตำแหน่ง</Table.Head>
					<Table.Head>สิทธิ์</Table.Head>
					<Table.Head class="text-right">งานค้าง / ทั้งหมด</Table.Head>
					<Table.Head>สถานะ</Table.Head>
					<Table.Head></Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.users as u (u.id)}
					<Table.Row class={u.active ? '' : 'opacity-50'}>
						<Table.Cell class="font-medium">{u.name}</Table.Cell>
						<Table.Cell class="text-muted-foreground">{u.username}</Table.Cell>
						<Table.Cell>{u.position ?? '-'}</Table.Cell>
						<Table.Cell>
							<span class="rounded-full px-2 py-0.5 text-xs {u.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-muted'}">{ROLE_LABEL[u.role]}</span>
						</Table.Cell>
						<Table.Cell class="text-right tabular-nums">{u.openCount} / {u.taskCount}</Table.Cell>
						<Table.Cell>{u.active ? 'ใช้งาน' : 'ปิดใช้งาน'}</Table.Cell>
						<Table.Cell class="text-right"><Button size="sm" variant="ghost" href="/users/{u.id}"><Pencil /> แก้ไข</Button></Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
</div>
