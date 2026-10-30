<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import Building from '@lucide/svelte/icons/building-2';
	import KanbanSquare from '@lucide/svelte/icons/square-kanban';
	import ChartLine from '@lucide/svelte/icons/chart-line';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	let loading = $state(false);

	const features = [
		{ icon: KanbanSquare, title: 'อัปเดตงานบน Kanban', text: 'ทุกคนเห็นข้อมูลล่าสุดชุดเดียวกัน ไม่ต้องส่งไฟล์ Excel ต่อกัน' },
		{ icon: ChartLine, title: 'Dashboard สำหรับหัวหน้า', text: 'สรุปรายคน รายโปรเจกต์ และงานที่เลยกำหนดได้ทันที' },
		{ icon: ShieldCheck, title: 'ประวัติทุกการแก้ไข', text: 'รู้ว่าใครแก้อะไรเมื่อไร และย้อนกลับได้' }
	];
</script>

<svelte:head><title>เข้าสู่ระบบ · PMO Tracker</title></svelte:head>

<main class="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
	<!-- แผงแบรนด์ -->
	<section class="brand relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col">
		<div class="flex items-center gap-3">
			<span class="flex size-11 items-center justify-center rounded-xl bg-primary shadow-lg shadow-black/30"><Building class="size-6" /></span>
			<span class="font-display leading-tight">
				<span class="block text-lg">กองอาคารสถานที่</span>
				<span class="block text-sm font-light text-deep-fg">มหาวิทยาลัยมหาสารคาม</span>
			</span>
		</div>

		<div class="my-auto max-w-lg py-12">
			<p class="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-signal ring-1 ring-white/15">
				<span class="size-1.5 rounded-full bg-signal"></span> PMO Tracker
			</p>
			<h1 class="text-4xl leading-tight xl:text-5xl">ติดตามงานทั้งทีม<br />ในที่เดียว</h1>
			<p class="mt-4 text-base text-deep-fg">แทนการส่งไฟล์ Excel ทาง LINE ทุกคนอัปเดตงานของตัวเอง หัวหน้าเห็นภาพรวมทันที</p>
			<ul class="mt-10 space-y-5">
				{#each features as f (f.title)}
					<li class="flex gap-4">
						<span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15"><f.icon class="size-5 text-signal" /></span>
						<span>
							<span class="block font-medium">{f.title}</span>
							<span class="block text-sm text-deep-fg">{f.text}</span>
						</span>
					</li>
				{/each}
			</ul>
		</div>

		<p class="text-xs text-deep-fg/70">© กองอาคารสถานที่ มหาวิทยาลัยมหาสารคาม</p>
	</section>

	<!-- ฟอร์มเข้าสู่ระบบ -->
	<section class="flex items-center justify-center bg-background p-6 sm:p-10">
		<div class="w-full max-w-sm">
			<div class="mb-8 flex items-center gap-3 lg:hidden">
				<span class="flex size-11 items-center justify-center rounded-xl bg-primary text-white"><Building class="size-6" /></span>
				<span class="font-display leading-tight">
					<span class="block text-lg text-primary">กองอาคารสถานที่</span>
					<span class="block text-sm font-light text-muted-foreground">มหาวิทยาลัยมหาสารคาม</span>
				</span>
			</div>

			<h2 class="text-2xl">เข้าสู่ระบบ</h2>
			<p class="mt-1 text-sm text-muted-foreground">ระบบติดตามงาน · ใช้บัญชีของคุณเอง</p>

			<form
				method="POST"
				class="mt-8 space-y-5"
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
					<Input id="username" name="username" autocomplete="username" class="h-11" value={form?.username ?? ''} required />
				</div>
				<div class="space-y-1.5">
					<Label for="password">รหัสผ่าน</Label>
					<Input id="password" name="password" type="password" autocomplete="current-password" class="h-11" required />
				</div>
				{#if form?.message}
					<p class="rounded-lg border border-bad/20 bg-bad/5 px-3 py-2 text-sm text-bad">✕ {form.message}</p>
				{/if}
				<Button type="submit" class="h-11 w-full text-base" disabled={loading}>
					{loading ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
				</Button>
			</form>
			<p class="mt-6 rounded-lg bg-muted px-3 py-2.5 text-xs text-muted-foreground">
				ชื่อผู้ใช้คือชื่อหน้า @ ของอีเมล เช่น <code>vipa</code>, <code>napa</code> · ลืมรหัสผ่านติดต่อ Admin
			</p>
		</div>
	</section>
</main>

<style>
	.brand {
		background:
			radial-gradient(70% 55% at 85% 10%, rgb(0 224 131 / 0.18), transparent 70%),
			radial-gradient(60% 60% at 0% 100%, rgb(0 130 76 / 0.45), transparent 70%),
			linear-gradient(160deg, #0b3a27 0%, var(--deep) 55%, #031a0d 100%);
	}
	/* ลายเส้นตารางจาง ๆ ให้แผงมีมิติ */
	.brand::before {
		content: '';
		position: absolute;
		inset: 0;
		background-image:
			linear-gradient(rgb(255 255 255 / 0.04) 1px, transparent 1px),
			linear-gradient(90deg, rgb(255 255 255 / 0.04) 1px, transparent 1px);
		background-size: 40px 40px;
		mask-image: radial-gradient(80% 70% at 30% 40%, black, transparent);
		pointer-events: none;
	}
</style>
