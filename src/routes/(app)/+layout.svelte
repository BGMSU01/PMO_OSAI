<script lang="ts">
	import { page } from '$app/state';
	import { ROLE_LABEL } from '#lib/labels.js';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import KanbanSquare from '@lucide/svelte/icons/square-kanban';
	import ListTodo from '@lucide/svelte/icons/list-todo';
	import FolderKanban from '@lucide/svelte/icons/folder-kanban';
	import History from '@lucide/svelte/icons/activity';
	import Users from '@lucide/svelte/icons/users';
	import LogOut from '@lucide/svelte/icons/log-out';
	import UserCog from '@lucide/svelte/icons/user-cog';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	// label = เมนูเต็มบนจอใหญ่, short = แถบไอคอน (แท็บเล็ต) และแถบล่าง (มือถือ)
	const nav = $derived([
		{ href: '/', label: 'Dashboard', short: 'ภาพรวม', icon: LayoutDashboard },
		{ href: '/board', label: 'Kanban Board', short: 'บอร์ด', icon: KanbanSquare },
		{ href: '/tasks', label: 'งานทั้งหมด', short: 'งาน', icon: ListTodo },
		{ href: '/projects', label: 'โปรเจกต์', short: 'โปรเจกต์', icon: FolderKanban },
		{ href: '/activity', label: 'Activity Log', short: 'ประวัติ', icon: History },
		...(data.user.role === 'admin' ? [{ href: '/users', label: 'จัดการพนักงาน', short: 'พนักงาน', icon: Users }] : [])
	]);

	const isActive = (href: string) =>
		href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
</script>

<div class="min-h-screen md:grid md:grid-cols-[84px_minmax(0,1fr)] lg:grid-cols-[230px_minmax(0,1fr)]">
	<!-- มือถือ: แถบบนแบบย่อ -->
	<header class="sticky top-0 z-30 flex items-center justify-between gap-2 border-b bg-card/95 px-4 py-2.5 backdrop-blur md:hidden print:hidden">
		<a href="/" class="flex min-w-0 items-center gap-2">
			<span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
				<KanbanSquare class="size-4.5" />
			</span>
			<span class="truncate font-display leading-tight">
				<span class="block text-sm text-primary">กองอาคารสถานที่</span>
				<span class="block text-xs font-light text-muted-foreground">มหาวิทยาลัยมหาสารคาม</span>
			</span>
		</a>
		<div class="flex shrink-0 items-center gap-1">
			<a href="/account" class="flex size-9 items-center justify-center rounded-full bg-mint text-sm font-medium text-primary" aria-label="บัญชีของฉัน ({data.user.name})">
				{data.user.name.slice(0, 1)}
			</a>
			<form method="POST" action="/logout">
				<button class="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted" aria-label="ออกจากระบบ"><LogOut class="size-4.5" /></button>
			</form>
		</div>
	</header>

	<!-- แท็บเล็ต: แถบไอคอน / จอใหญ่: เมนูเต็ม -->
	<aside class="sticky top-0 hidden h-screen flex-col border-r bg-card md:flex print:hidden">
		<a href="/" class="flex items-center justify-center gap-2.5 px-3 py-5 lg:justify-start lg:px-4">
			<span class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
				<KanbanSquare class="size-5" />
			</span>
			<span class="hidden font-display leading-tight lg:block">
				<span class="block text-[15px] font-normal text-primary">กองอาคารสถานที่</span>
				<span class="block text-xs font-light text-muted-foreground">มหาวิทยาลัยมหาสารคาม</span>
			</span>
		</a>
		<p class="hidden px-4 pb-2 text-xs font-medium text-muted-foreground lg:block">ระบบติดตามงาน (PMO)</p>
		<nav class="flex flex-1 flex-col gap-1 overflow-y-auto px-2 lg:px-3">
			{#each nav as item (item.href)}
				<a
					href={item.href}
					title={item.label}
					class="flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-xs transition-colors lg:flex-row lg:gap-2.5 lg:px-3 lg:text-sm {isActive(item.href)
						? 'bg-primary/10 font-medium text-primary'
						: 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
				>
					<item.icon class="size-5 lg:size-4" />
					<span class="lg:hidden">{item.short}</span>
					<span class="hidden lg:inline">{item.label}</span>
				</a>
			{/each}
		</nav>
		<div class="border-t p-2 lg:p-3">
			<a href="/account" title="บัญชีของฉัน" class="flex items-center justify-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted lg:justify-start">
				<span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-mint text-sm font-medium text-primary">
					{data.user.name.slice(0, 1)}
				</span>
				<span class="hidden min-w-0 flex-1 leading-tight lg:block">
					<span class="block truncate text-sm font-medium">{data.user.name}</span>
					<span class="block truncate text-xs text-muted-foreground">{ROLE_LABEL[data.user.role]} · {data.user.position ?? ''}</span>
				</span>
				<UserCog class="hidden size-4 text-muted-foreground lg:block" />
			</a>
			<form method="POST" action="/logout">
				<button title="ออกจากระบบ" class="mt-1 flex w-full items-center justify-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground lg:justify-start">
					<LogOut class="size-4" /> <span class="hidden lg:inline">ออกจากระบบ</span>
				</button>
			</form>
		</div>
	</aside>

	<main class="min-w-0 p-4 pb-24 sm:p-6 md:p-8 md:pb-8">
		{@render children()}
	</main>

	<!-- มือถือ: แถบเมนูล่าง -->
	<nav
		aria-label="เมนูหลัก"
		class="fixed inset-x-0 bottom-0 z-30 grid border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden print:hidden"
		style="grid-template-columns: repeat({nav.length}, minmax(0, 1fr))"
	>
		{#each nav as item (item.href)}
			<a
				href={item.href}
				aria-current={isActive(item.href) ? 'page' : undefined}
				class="flex flex-col items-center gap-0.5 py-2 text-xs {isActive(item.href) ? 'font-medium text-primary' : 'text-muted-foreground'}"
			>
				<span class="flex h-7 w-12 items-center justify-center rounded-full {isActive(item.href) ? 'bg-mint' : ''}"><item.icon class="size-5" /></span>
				<span class="truncate">{item.short}</span>
			</a>
		{/each}
	</nav>
</div>
