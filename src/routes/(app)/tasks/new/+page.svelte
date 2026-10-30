<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import TaskForm from '#lib/components/app/TaskForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const isAdmin = $derived(data.user.role === 'admin');
</script>

<svelte:head><title>เพิ่มงาน · PMO Tracker</title></svelte:head>

<div class="mx-auto max-w-2xl space-y-4">
	<a href="/tasks" class="text-sm text-muted-foreground hover:underline">← งานทั้งหมด</a>
	<Card.Root>
		<Card.Header>
			<Card.Title>เพิ่มงานใหม่</Card.Title>
			<Card.Description>
				{isAdmin ? 'รหัสงานจะสร้างให้อัตโนมัติ' : 'งานที่สร้างจะกำหนดให้คุณเป็นผู้รับผิดชอบ'}
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<form method="POST" use:enhance class="space-y-4">
				<TaskForm
					task={{ ...data.defaults, assigneeId: isAdmin ? null : data.user.id }}
					users={data.users}
					projects={data.projects}
					isAdmin
					lockAssignee={!isAdmin}
				/>
				{#if form?.message}<p class="text-sm text-destructive">{form.message}</p>{/if}
				<div class="flex justify-end gap-2">
					<Button variant="outline" href="/tasks">ยกเลิก</Button>
					<Button type="submit">บันทึก</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>
</div>
