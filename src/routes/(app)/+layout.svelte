<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { ROLE_LABEL, fmtDate, todayISO } from '#lib/labels.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import KanbanSquare from '@lucide/svelte/icons/square-kanban';
	import ListTodo from '@lucide/svelte/icons/list-todo';
	import FolderKanban from '@lucide/svelte/icons/folder-kanban';
	import History from '@lucide/svelte/icons/activity';
	import Users from '@lucide/svelte/icons/users';
	import LogOut from '@lucide/svelte/icons/log-out';
	import Search from '@lucide/svelte/icons/search';
	import Plus from '@lucide/svelte/icons/plus';
	import Building from '@lucide/svelte/icons/building-2';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	// label = เมนูเต็มบนจอใหญ่, short = แถบไอคอน (แท็บเล็ต) และแถบล่าง (มือถือ)
	const groups = $derived([
		{
			title: 'ติดตามงาน',
			items: [
				{ href: '/', label: 'Dashboard', short: 'ภาพรวม', icon: LayoutDashboard },
				{ href: '/board', label: 'Kanban Board', short: 'บอร์ด', icon: KanbanSquare },
				{ href: '/tasks', label: 'งานทั้งหมด', short: 'งาน', icon: ListTodo },
				{ href: '/projects', label: 'โปรเจกต์', short: 'โปรเจกต์', icon: FolderKanban }
			]
		},
		{
			title: 'ระบบ',
			items: [
				{ href: '/activity', label: 'Activity Log', short: 'ประวัติ', icon: History },
				...(data.user.role === 'admin' ? [{ href: '/users', label: 'จัดการพนักงาน', short: 'พนักงาน', icon: Users }] : [])
			]
		}
	]);
	const nav = $derived(groups.flatMap((g) => g.items));
	const current = $derived(nav.find((i) => isActive(i.href)));

	const isActive = (href: string) =>
		href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);

	let q = $state('');
	function search(e: SubmitEvent) {
		e.preventDefault();
		goto(`/tasks?q=${encodeURIComponent(q.trim())}`);
	}
</script>

<div class="min-h-screen md:grid md:grid-cols-[84px_minmax(0,1fr)] lg:grid-cols-[248px_minmax(0,1fr)]">
	<!-- มือถือ: แถบบนสีเขียวเข้ม -->
	<header class="sticky top-0 z-30 flex items-center justify-between gap-2 bg-deep px-4 py-2.5 text-white md:hidden print:hidden">
		<a href="/" class="flex min-w-0 items-center gap-2.5">
			<span class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary shadow-lg shadow-black/20">
				<Building class="size-5" />
			</span>
			<span class="truncate font-display leading-tight">
				<span class="block text-sm">กองอาคารสถานที่</span>
				<span class="block text-xs font-light text-deep-fg">ระบบติดตามงาน</span>
			</span>
		</a>
		<div class="flex shrink-0 items-center gap-1">
			<a href="/account" class="flex size-9 items-center justify-center rounded-full bg-white/10 text-sm font-medium ring-1 ring-white/15" aria-label="บัญชีของฉัน ({data.user.name})">
				{data.user.name.slice(0, 1)}
			</a>
			<form method="POST" action="/logout">
				<button class="flex size-9 items-center justify-center rounded-full text-deep-fg hover:bg-white/10" aria-label="ออกจากระบบ"><LogOut class="size-4.5" /></button>
			</form>
		</div>
	</header>

	<!-- แท็บเล็ต: แถบไอคอน / จอใหญ่: เมนูเต็ม (พื้นเขียวเข้ม) -->
	<aside class="sidebar sticky top-0 hidden h-screen flex-col text-deep-fg md:flex print:hidden">
		<a href="/" class="flex items-center justify-center gap-3 px-3 pt-6 pb-5 lg:justify-start lg:px-5">
			<span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-black/25">
				<Building class="size-5" />
			</span>
			<span class="hidden font-display leading-tight lg:block">
				<span class="block text-[15px] text-white">กองอาคารสถานที่</span>
				<span class="block text-xs font-light text-deep-fg/80">มหาวิทยาลัยมหาสารคาม</span>
			</span>
		</a>

		<nav class="flex flex-1 flex-col gap-5 overflow-y-auto px-2 py-2 lg:px-3">
			{#each groups as g (g.title)}
				<div>
					<p class="mb-1.5 hidden px-3 text-xs font-medium tracking-wide text-deep-fg/55 lg:block">{g.title}</p>
					<div class="flex flex-col gap-0.5">
						{#each g.items as item (item.href)}
							{@const active = isActive(item.href)}
							<a
								href={item.href}
								title={item.label}
								aria-current={active ? 'page' : undefined}
								class="relative flex flex-col items-center gap-1 rounded-xl px-1 py-2.5 text-xs transition-colors lg:flex-row lg:gap-3 lg:px-3 lg:text-sm {active
									? 'bg-white/10 font-medium text-white'
									: 'hover:bg-white/5 hover:text-white'}"
							>
								{#if active}<span class="absolute top-2 bottom-2 left-0 w-1 rounded-r-full bg-signal max-lg:hidden"></span>{/if}
								<item.icon class="size-5 lg:size-[18px] {active ? 'text-signal' : ''}" />
								<span class="lg:hidden">{item.short}</span>
								<span class="hidden lg:inline">{item.label}</span>
							</a>
						{/each}
					</div>
				</div>
			{/each}
		</nav>

		<div class="m-2 rounded-2xl bg-white/5 p-2 ring-1 ring-white/10 lg:m-3 lg:p-3">
			<a href="/account" title="บัญชีของฉัน" class="flex items-center justify-center gap-3 rounded-lg lg:justify-start">
				<span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
					{data.user.name.slice(0, 1)}
				</span>
				<span class="hidden min-w-0 flex-1 leading-tight lg:block">
					<span class="block truncate text-sm font-medium text-white">{data.user.name}</span>
					<span class="block truncate text-xs text-deep-fg/70">{ROLE_LABEL[data.user.role]} · {data.user.position ?? ''}</span>
				</span>
			</a>
			<form method="POST" action="/logout" class="mt-2">
				<button title="ออกจากระบบ" class="flex w-full items-center justify-center gap-2 rounded-lg px-2 py-1.5 text-xs text-deep-fg/80 hover:bg-white/10 hover:text-white">
					<LogOut class="size-4" /> <span class="hidden lg:inline">ออกจากระบบ</span>
				</button>
			</form>
		</div>
	</aside>

	<div class="min-w-0">
		<!-- แถบบน (แท็บเล็ต/จอใหญ่): ตำแหน่งปัจจุบัน + ค้นหา + เพิ่มงาน -->
		<div class="sticky top-0 z-20 hidden h-16 items-center gap-4 border-b border-border/70 bg-background/80 px-6 backdrop-blur-md md:flex lg:px-8 print:hidden">
			<div class="min-w-0 leading-tight">
				<p class="text-xs text-muted-foreground">กองอาคารสถานที่ · {fmtDate(todayISO())}</p>
				<p class="truncate text-sm font-semibold">{current?.label ?? 'บัญชีของฉัน'}</p>
			</div>
			<form class="relative ml-auto w-full max-w-sm" onsubmit={search} role="search">
				<Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
				<input
					bind:value={q}
					type="search"
					placeholder="ค้นหางาน รหัสงาน หรือหมายเหตุ…"
					aria-label="ค้นหางาน"
					class="h-9 w-full rounded-full border border-border bg-card pr-4 pl-9 text-sm shadow-xs outline-none focus:border-primary focus:ring-3 focus:ring-primary/15"
				/>
			</form>
			<Button href="/tasks/new" size="sm" class="rounded-full"><Plus /> เพิ่มงาน</Button>
		</div>

		<main class="min-w-0 p-4 pb-24 sm:p-6 md:p-6 md:pb-8 lg:p-8">
			{@render children()}
		</main>
	</div>

	<!-- มือถือ: แถบเมนูล่าง -->
	<nav
		aria-label="เมนูหลัก"
		class="fixed inset-x-0 bottom-0 z-30 grid border-t bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_-8px_rgb(16_40_28/0.15)] backdrop-blur md:hidden print:hidden"
		style="grid-template-columns: repeat({nav.length}, minmax(0, 1fr))"
	>
		{#each nav as item (item.href)}
			<a
				href={item.href}
				aria-current={isActive(item.href) ? 'page' : undefined}
				class="flex flex-col items-center gap-0.5 py-2 text-xs {isActive(item.href) ? 'font-medium text-primary' : 'text-muted-foreground'}"
			>
				<span class="flex h-7 w-12 items-center justify-center rounded-full transition-colors {isActive(item.href) ? 'bg-mint' : ''}"><item.icon class="size-5" /></span>
				<span class="truncate">{item.short}</span>
			</a>
		{/each}
	</nav>
</div>

<style>
	.sidebar {
		background:
			radial-gradient(120% 60% at 0% 0%, rgb(0 130 76 / 0.28), transparent 60%),
			linear-gradient(180deg, var(--deep) 0%, #04200f 100%);
	}
</style>
