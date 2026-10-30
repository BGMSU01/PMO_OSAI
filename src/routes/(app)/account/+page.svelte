<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { ROLE_LABEL } from '#lib/labels.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>บัญชีของฉัน · PMO Tracker</title></svelte:head>

<div class="mx-auto max-w-md space-y-4">
	<h1 class="text-2xl font-semibold">บัญชีของฉัน</h1>
	{#if data.user.mustChangePassword}
		<p class="rounded-xl border border-warn-fill bg-warn-fill/20 px-4 py-3 text-sm text-warn-ink">
			<b>! กรุณาตั้งรหัสผ่านใหม่ก่อนเริ่มใช้งาน</b> — บัญชีนี้ยังใช้รหัสผ่านเริ่มต้นหรือรหัสที่ Admin ตั้งให้
		</p>
	{/if}
	<Card.Root>
		<Card.Header>
			<Card.Title>{data.user.name}</Card.Title>
			<Card.Description>{data.user.username} · {ROLE_LABEL[data.user.role]} · {data.user.position ?? ''}</Card.Description>
		</Card.Header>
		<Card.Content>
			<form method="POST" action="?/password" class="space-y-3" use:enhance>
				<div class="space-y-1.5"><Label for="current">รหัสผ่านปัจจุบัน</Label><Input id="current" name="current" type="password" autocomplete="current-password" required /></div>
				<div class="space-y-1.5"><Label for="next">รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)</Label><Input id="next" name="next" type="password" minlength={8} autocomplete="new-password" required /></div>
				<div class="space-y-1.5"><Label for="confirm">ยืนยันรหัสผ่านใหม่</Label><Input id="confirm" name="confirm" type="password" autocomplete="new-password" required /></div>
				{#if form?.message}<p class="text-sm text-destructive">{form.message}</p>{/if}
				{#if form?.saved}<p class="text-sm text-ok">✓ เปลี่ยนรหัสผ่านแล้ว <a href="/" class="underline">ไปหน้า Dashboard</a></p>{/if}
				<Button type="submit" class="w-full">เปลี่ยนรหัสผ่าน</Button>
			</form>
		</Card.Content>
	</Card.Root>
</div>
