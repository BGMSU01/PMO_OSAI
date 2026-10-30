<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import KanbanSquare from '@lucide/svelte/icons/square-kanban';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	let loading = $state(false);
</script>

<svelte:head><title>เข้าสู่ระบบ · PMO Tracker</title></svelte:head>

<main class="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-4">
	<div class="text-center font-display">
		<p class="text-2xl font-normal text-primary">กองอาคารสถานที่</p>
		<p class="text-base font-light text-muted-foreground">มหาวิทยาลัยมหาสารคาม</p>
	</div>
	<Card.Root class="w-full max-w-sm border-t-4 border-t-primary">
		<Card.Header class="text-center">
			<div class="mx-auto mb-2 flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
				<KanbanSquare class="size-6" />
			</div>
			<h1 class="text-xl">ระบบติดตามงาน</h1>
			<Card.Description>PMO Tracker · เข้าสู่ระบบด้วยบัญชีของคุณ</Card.Description>
		</Card.Header>
		<Card.Content>
			<form
				method="POST"
				class="space-y-4"
				use:enhance={() => {
					loading = true;
					return async ({ update }) => {
						await update();
						loading = false;
					};
				}}
			>
				<div class="space-y-1.5">
					<Label for="username">ชื่อผู้ใช้</Label>
					<Input id="username" name="username" autocomplete="username" value={form?.username ?? ''} required />
				</div>
				<div class="space-y-1.5">
					<Label for="password">รหัสผ่าน</Label>
					<Input id="password" name="password" type="password" autocomplete="current-password" required />
				</div>
				{#if form?.message}
					<p class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{form.message}</p>
				{/if}
				<Button type="submit" class="w-full" size="lg" disabled={loading}>
					{loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
				</Button>
			</form>
			<p class="mt-4 text-center text-xs text-muted-foreground">
				ชื่อผู้ใช้ = ชื่อหน้าอีเมล เช่น <code>vipa</code>, <code>napa</code> หรือ <code>admin</code>
			</p>
		</Card.Content>
	</Card.Root>
</main>
