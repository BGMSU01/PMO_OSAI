<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import ChangeList from '#lib/components/app/ChangeList.svelte';
	import { actionText, fmtDateTime } from '#lib/labels.js';
	import { selectClass } from '#lib/ui.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const u = $derived(data.target);
</script>

<svelte:head><title>{u.name} · จัดการพนักงาน</title></svelte:head>

<div class="space-y-4">
	<a href="/users" class="text-sm text-muted-foreground hover:underline">← จัดการพนักงาน</a>
	<div class="grid gap-4 *:min-w-0 xl:grid-cols-[minmax(0,1fr)_380px]">
		<Card.Root>
			<Card.Header>
				<Card.Title>แก้ไขข้อมูล: {u.name}</Card.Title>
				<Card.Description>ชื่อผู้ใช้ <code>{u.username}</code> · รับผิดชอบ {data.taskCount} งาน</Card.Description>
				{#if u.lockedUntil && u.lockedUntil > Date.now()}
					<p class="mt-2 rounded-md bg-bad/10 px-3 py-2 text-sm text-bad">✕ บัญชีถูกล็อกถึง {fmtDateTime(u.lockedUntil)} เพราะใส่รหัสผิดหลายครั้ง — ตั้งรหัสผ่านใหม่ด้านล่างเพื่อปลดล็อก</p>
				{:else if u.mustChangePassword}
					<p class="mt-2 text-xs text-muted-foreground">! ผู้ใช้ยังไม่ได้เปลี่ยนรหัสผ่านเริ่มต้น</p>
				{/if}
			</Card.Header>
			<Card.Content>
				<form method="POST" action="?/update" class="grid gap-4 sm:grid-cols-2" use:enhance={() => async ({ update }) => update({ reset: false })}>
					<div class="space-y-1.5"><Label for="name">ชื่อ</Label><Input id="name" name="name" value={u.name} required /></div>
					<div class="space-y-1.5"><Label for="email">อีเมล</Label><Input id="email" name="email" type="email" value={u.email ?? ''} /></div>
					<div class="space-y-1.5"><Label for="position">ตำแหน่ง</Label><Input id="position" name="position" value={u.position ?? ''} /></div>
					<div class="space-y-1.5"><Label for="level">ระดับ</Label><Input id="level" name="level" value={u.level ?? ''} /></div>
					<div class="space-y-1.5 sm:col-span-2"><Label for="duties">หน้าที่หลัก</Label><Input id="duties" name="duties" value={u.duties ?? ''} /></div>
					<div class="space-y-1.5"><Label for="startDate">วันเริ่มงาน</Label><Input id="startDate" name="startDate" type="date" value={u.startDate ?? ''} /></div>
					<div class="space-y-1.5">
						<Label for="role">สิทธิ์</Label>
						<select id="role" name="role" class="{selectClass} w-full" value={u.role}>
							<option value="member">พนักงาน</option>
							<option value="admin">Admin</option>
						</select>
					</div>
					<div class="space-y-1.5">
						<Label for="password">ตั้งรหัสผ่านใหม่</Label>
						<Input id="password" name="password" type="password" autocomplete="new-password" placeholder="เว้นว่างถ้าไม่เปลี่ยน (ผู้ใช้ต้องเปลี่ยนเองตอนเข้าระบบ)" />
					</div>
					<label class="flex items-center gap-2 self-end pb-2 text-sm">
						<input type="checkbox" name="active" checked={u.active} class="rounded border-input text-primary" />
						เปิดใช้งานบัญชี (ปิด = เข้าระบบไม่ได้ แต่ประวัติยังอยู่)
					</label>
					{#if form?.message}
						<p class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive sm:col-span-2">{form.message}</p>
					{:else if form?.saved}
						<p class="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 sm:col-span-2">บันทึกแล้ว ✓</p>
					{/if}
					<div class="flex justify-end sm:col-span-2"><Button type="submit">บันทึก</Button></div>
				</form>
				<form method="POST" action="?/delete" class="mt-4 border-t pt-4" use:enhance={({ cancel }) => { if (!confirm(`ลบ ${u.name} ออกจากระบบถาวร?`)) cancel(); }}>
					<Button type="submit" variant="destructive" size="sm">ลบพนักงาน</Button>
					<span class="ml-2 text-xs text-muted-foreground">ลบได้เฉพาะคนที่ไม่มีงานค้างในระบบ</span>
				</form>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header><Card.Title>กิจกรรมล่าสุด</Card.Title></Card.Header>
			<Card.Content class="space-y-3">
				{#each data.recent as h (h.id)}
					<div class="text-sm">
						<span class="text-muted-foreground">{actionText(h.action, h.entityType)}</span> {h.entityLabel}
						<p class="text-xs text-muted-foreground">{fmtDateTime(h.createdAt)}</p>
						{#if h.entityType === 'user'}<ChangeList changes={h.changes} />{/if}
					</div>
				{:else}
					<p class="text-sm text-muted-foreground">ยังไม่มีกิจกรรม</p>
				{/each}
			</Card.Content>
		</Card.Root>
	</div>
</div>
