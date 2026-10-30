import { and, eq } from 'drizzle-orm';
import { db, schema } from './db';
import { diff, logActivity, type Changes } from './activity';
import { FIELD_LABEL, PRIORITIES, STATUSES } from '#lib/labels.js';
import type { SessionUser } from './auth';

export type TaskPatch = Partial<
	Pick<
		schema.Task,
		| 'title'
		| 'projectId'
		| 'assigneeId'
		| 'priority'
		| 'status'
		| 'startDate'
		| 'dueDate'
		| 'estimatedHours'
		| 'actualHours'
		| 'progress'
		| 'note'
	>
>;

// พนักงานทั่วไปแก้ได้เฉพาะความคืบหน้าของงานตัวเอง
export const MEMBER_FIELDS = ['status', 'progress', 'actualHours', 'note'] as const;

export class TaskError extends Error {
	constructor(
		message: string,
		public status = 400
	) {
		super(message);
	}
}

export function canEditTask(user: SessionUser, task: Pick<schema.Task, 'assigneeId'>) {
	return user.role === 'admin' || task.assigneeId === user.id;
}

const str = (v: FormDataEntryValue | null) => {
	const s = v == null ? '' : String(v).trim();
	return s === '' ? null : s;
};
const num = (v: FormDataEntryValue | null) => {
	const s = str(v);
	if (s === null) return undefined;
	const n = Number(s);
	return Number.isFinite(n) && n >= 0 ? n : undefined;
};

/** แปลง FormData เป็น patch — ใส่เฉพาะฟิลด์ที่มีอยู่ในฟอร์ม */
export function patchFromForm(form: FormData): TaskPatch {
	const p: TaskPatch = {};
	if (form.has('title')) p.title = str(form.get('title')) ?? undefined;
	if (form.has('projectId')) p.projectId = num(form.get('projectId'));
	if (form.has('assigneeId')) p.assigneeId = num(form.get('assigneeId')) ?? null;
	if (form.has('priority')) {
		const v = str(form.get('priority'));
		if (PRIORITIES.includes(v as never)) p.priority = v as schema.TaskPriority;
	}
	if (form.has('status')) {
		const v = str(form.get('status'));
		if (STATUSES.includes(v as never)) p.status = v as schema.TaskStatus;
	}
	if (form.has('startDate')) p.startDate = str(form.get('startDate'));
	if (form.has('dueDate')) p.dueDate = str(form.get('dueDate'));
	if (form.has('estimatedHours')) p.estimatedHours = num(form.get('estimatedHours')) ?? 0;
	if (form.has('actualHours')) p.actualHours = num(form.get('actualHours')) ?? 0;
	if (form.has('progress')) p.progress = Math.min(100, Math.round(num(form.get('progress')) ?? 0));
	if (form.has('note')) p.note = str(form.get('note'));
	return p;
}

function label(task: Pick<schema.Task, 'code' | 'title'>) {
	return `${task.code} ${task.title}`;
}

export async function updateTask(
	user: SessionUser,
	taskId: number,
	patch: TaskPatch,
	opts: { expectedVersion?: number; action?: 'update' | 'status' | 'revert' } = {}
) {
	const [task] = await db.select().from(schema.tasks).where(eq(schema.tasks.id, taskId));
	if (!task) throw new TaskError('ไม่พบงานนี้', 404);
	if (task.deletedAt) throw new TaskError('งานนี้ถูกลบแล้ว กู้คืนได้ที่ Activity Log', 410);
	if (!canEditTask(user, task)) throw new TaskError('คุณแก้ไขได้เฉพาะงานที่ตัวเองรับผิดชอบ', 403);

	if (user.role !== 'admin') {
		for (const k of Object.keys(patch)) {
			if (!(MEMBER_FIELDS as readonly string[]).includes(k)) delete patch[k as keyof TaskPatch];
		}
	}
	if (patch.title === undefined) delete patch.title;
	if (patch.status === 'done' && (patch.progress ?? task.progress) < 100) patch.progress = 100;

	if (opts.expectedVersion !== undefined && opts.expectedVersion !== task.version) throw conflict();

	const changes = diff(task, patch);
	if (!Object.keys(changes).length) return { task, changes };

	const values = Object.fromEntries(Object.entries(changes).map(([k, c]) => [k, c.to]));
	const [updated] = await db
		.update(schema.tasks)
		.set({ ...values, version: task.version + 1, updatedAt: Date.now() })
		// เงื่อนไข version ใน UPDATE เดียวกัน กันสองคนบันทึกพร้อมกันแล้วทับกัน
		.where(and(eq(schema.tasks.id, taskId), eq(schema.tasks.version, task.version)))
		.returning();
	if (!updated) throw conflict();

	const onlyStatus = Object.keys(changes).every((k) => k === 'status' || k === 'progress');
	await logActivity({
		userId: user.id,
		entityType: 'task',
		entityId: task.id,
		entityLabel: label(updated),
		action: opts.action ?? (onlyStatus && changes.status ? 'status' : 'update'),
		changes
	});
	return { task: updated, changes };
}

function conflict() {
	return new TaskError(
		'งานนี้ถูกแก้ไขโดยคนอื่นหลังจากที่คุณเปิดหน้า กรุณาโหลดหน้าใหม่เพื่อดูข้อมูลล่าสุดก่อนบันทึก',
		409
	);
}

export async function nextTaskCode() {
	const rows = await db.select({ code: schema.tasks.code }).from(schema.tasks);
	const max = rows.reduce((m, r) => Math.max(m, Number(r.code.match(/(\d+)$/)?.[1] ?? 0)), 0);
	return `T-${String(max + 1).padStart(3, '0')}`;
}

export async function createTask(user: SessionUser, patch: TaskPatch) {
	if (!patch.title) throw new TaskError('กรุณากรอกชื่องาน');
	if (!patch.projectId) throw new TaskError('กรุณาเลือกโปรเจกต์');
	// พนักงานสร้างงานได้ แต่ผู้รับผิดชอบต้องเป็นตัวเอง
	if (user.role !== 'admin') patch.assigneeId = user.id;
	const now = Date.now();
	const [task] = await db
		.insert(schema.tasks)
		.values({
			...patch,
			title: patch.title,
			projectId: patch.projectId,
			progress: patch.status === 'done' ? 100 : (patch.progress ?? 0),
			code: await nextTaskCode(),
			createdAt: now,
			updatedAt: now
		})
		.returning();
	const changes: Changes = {};
	for (const [k, v] of Object.entries(patch)) if (v != null && v !== '') changes[k] = { from: null, to: v };
	await logActivity({
		userId: user.id,
		entityType: 'task',
		entityId: task.id,
		entityLabel: label(task),
		action: 'create',
		changes
	});
	return task;
}

/** ลบแบบซ่อนไว้ (soft delete): ข้อมูลยังอยู่และกู้คืนได้ */
export async function deleteTask(user: SessionUser, taskId: number) {
	if (user.role !== 'admin') throw new TaskError('เฉพาะ Admin ที่ลบงานได้', 403);
	const [task] = await db.select().from(schema.tasks).where(eq(schema.tasks.id, taskId));
	if (!task || task.deletedAt) throw new TaskError('ไม่พบงานนี้', 404);
	await db
		.update(schema.tasks)
		.set({ deletedAt: Date.now(), version: task.version + 1, updatedAt: Date.now() })
		.where(eq(schema.tasks.id, taskId));
	// เก็บสำเนาข้อมูลไว้ใน log เพื่อดูย้อนหลังได้
	const changes: Changes = {};
	for (const [k, v] of Object.entries(task)) if (v != null) changes[k] = { from: v, to: null };
	await logActivity({ userId: user.id, entityType: 'task', entityId: task.id, entityLabel: label(task), action: 'delete', changes });
}

export async function restoreTask(user: SessionUser, taskId: number) {
	if (user.role !== 'admin') throw new TaskError('เฉพาะ Admin ที่กู้คืนงานได้', 403);
	const [task] = await db.select().from(schema.tasks).where(eq(schema.tasks.id, taskId));
	if (!task) throw new TaskError('ไม่พบงานนี้', 404);
	if (!task.deletedAt) throw new TaskError('งานนี้ไม่ได้ถูกลบ');
	await db
		.update(schema.tasks)
		.set({ deletedAt: null, version: task.version + 1, updatedAt: Date.now() })
		.where(eq(schema.tasks.id, taskId));
	await logActivity({ userId: user.id, entityType: 'task', entityId: task.id, entityLabel: label(task), action: 'restore' });
	return task;
}

/** ย้อนกลับการแก้ไขหนึ่งรายการ: นำค่า "from" กลับมาใช้ ได้เฉพาะเมื่อยังไม่มีใครแก้ฟิลด์นั้นต่อ */
export async function revertActivity(user: SessionUser, logId: number) {
	const [log] = await db.select().from(schema.activityLogs).where(eq(schema.activityLogs.id, logId));
	if (!log || log.entityType !== 'task' || !log.entityId || !log.changes)
		throw new TaskError('รายการนี้ย้อนกลับไม่ได้');
	if (!['update', 'status', 'revert'].includes(log.action)) throw new TaskError('ย้อนกลับได้เฉพาะการแก้ไขงาน');
	const [task] = await db.select().from(schema.tasks).where(eq(schema.tasks.id, log.entityId));
	if (!task) throw new TaskError('ไม่พบงานนี้', 404);
	const changes = JSON.parse(log.changes) as Changes;
	const current = task as unknown as Record<string, unknown>;
	const changedSince = Object.entries(changes)
		.filter(([k, c]) => (current[k] ?? null) !== (c.to ?? null))
		.map(([k]) => FIELD_LABEL[k] ?? k);
	if (changedSince.length)
		throw new TaskError(
			`ย้อนกลับไม่ได้ เพราะมีการแก้ ${changedSince.join(', ')} ต่อจากรายการนี้แล้ว — ย้อนรายการที่ใหม่กว่าก่อน หรือแก้ค่าเองที่หน้างาน`,
			409
		);
	const patch = Object.fromEntries(Object.entries(changes).map(([k, c]) => [k, c.from])) as TaskPatch;
	return updateTask(user, log.entityId, patch, { action: 'revert', expectedVersion: task.version });
}
