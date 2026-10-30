<script lang="ts">
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { Textarea } from '#lib/components/ui/textarea/index.js';
	import { PRIORITIES, PRIORITY_LABEL, STATUSES, STATUS_LABEL } from '#lib/labels.js';
	import { selectClass } from '#lib/ui.js';

	type TaskValues = {
		title?: string;
		projectId?: number;
		assigneeId?: number | null;
		priority?: string;
		status?: string;
		startDate?: string | null;
		dueDate?: string | null;
		estimatedHours?: number;
		actualHours?: number;
		progress?: number;
		note?: string | null;
	};

	let {
		task = {},
		users,
		projects,
		isAdmin,
		lockAssignee = false
	}: {
		task?: TaskValues;
		users: { id: number; name: string }[];
		projects: { id: number; name: string }[];
		isAdmin: boolean;
		/** พนักงานสร้างงานได้เฉพาะของตัวเอง */
		lockAssignee?: boolean;
	} = $props();

	// ฟิลด์ที่ไม่มีสิทธิ์แก้จะถูก disabled (และไม่ถูกส่งไปกับฟอร์ม)
	const adminOnly = $derived(!isAdmin);
</script>

<div class="grid gap-4 sm:grid-cols-2">
	<div class="space-y-1.5 sm:col-span-2">
		<Label for="title">ชื่องาน *</Label>
		<Input id="title" name="title" value={task.title ?? ''} required disabled={adminOnly && !!task.title} />
	</div>
	<div class="space-y-1.5">
		<Label for="projectId">โปรเจกต์ *</Label>
		<select id="projectId" name="projectId" class="{selectClass} w-full" required disabled={adminOnly && !!task.projectId}>
			<option value="">— เลือก —</option>
			{#each projects as p (p.id)}<option value={p.id} selected={p.id === task.projectId}>{p.name}</option>{/each}
		</select>
	</div>
	<div class="space-y-1.5">
		<Label for="assigneeId">ผู้รับผิดชอบ</Label>
		<select id="assigneeId" name="assigneeId" class="{selectClass} w-full" disabled={adminOnly || lockAssignee}>
			<option value="">— ไม่ระบุ —</option>
			{#each users as u (u.id)}<option value={u.id} selected={u.id === task.assigneeId}>{u.name}</option>{/each}
		</select>
	</div>
	<div class="space-y-1.5">
		<Label for="status">สถานะ</Label>
		<select id="status" name="status" class="{selectClass} w-full">
			{#each STATUSES as s (s)}<option value={s} selected={s === (task.status ?? 'todo')}>{STATUS_LABEL[s]}</option>{/each}
		</select>
	</div>
	<div class="space-y-1.5">
		<Label for="priority">ความสำคัญ</Label>
		<select id="priority" name="priority" class="{selectClass} w-full" disabled={adminOnly && !!task.title}>
			{#each PRIORITIES as p (p)}<option value={p} selected={p === (task.priority ?? 'medium')}>{PRIORITY_LABEL[p]}</option>{/each}
		</select>
	</div>
	<div class="space-y-1.5">
		<Label for="startDate">วันเริ่ม</Label>
		<Input id="startDate" name="startDate" type="date" value={task.startDate ?? ''} disabled={adminOnly && !!task.title} />
	</div>
	<div class="space-y-1.5">
		<Label for="dueDate">กำหนดส่ง</Label>
		<Input id="dueDate" name="dueDate" type="date" value={task.dueDate ?? ''} disabled={adminOnly && !!task.title} />
	</div>
	<div class="space-y-1.5">
		<Label for="estimatedHours">ชั่วโมงประเมิน</Label>
		<Input id="estimatedHours" name="estimatedHours" type="number" min="0" step="0.5" value={task.estimatedHours ?? 0} disabled={adminOnly && !!task.title} />
	</div>
	<div class="space-y-1.5">
		<Label for="actualHours">ชั่วโมงใช้จริง</Label>
		<Input id="actualHours" name="actualHours" type="number" min="0" step="0.5" value={task.actualHours ?? 0} />
	</div>
	<div class="space-y-1.5 sm:col-span-2">
		<Label for="progress">% ความคืบหน้า</Label>
		<div class="flex items-center gap-3">
			<input id="progress" name="progress" type="range" min="0" max="100" step="5" value={task.progress ?? 0} class="flex-1 accent-primary"
				oninput={(e) => (e.currentTarget.nextElementSibling!.textContent = `${e.currentTarget.value}%`)} />
			<span class="w-12 text-right text-sm tabular-nums">{task.progress ?? 0}%</span>
		</div>
	</div>
	<div class="space-y-1.5 sm:col-span-2">
		<Label for="note">หมายเหตุ / อัปเดตล่าสุด</Label>
		<Textarea id="note" name="note" rows={3} value={task.note ?? ''} />
	</div>
</div>
