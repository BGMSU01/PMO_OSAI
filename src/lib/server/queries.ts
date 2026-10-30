import { asc, eq, isNull } from 'drizzle-orm';
import { db, schema } from './db';

export async function lookups() {
	const [users, projects] = await Promise.all([
		db
			.select({ id: schema.users.id, name: schema.users.name, active: schema.users.active, username: schema.users.username })
			.from(schema.users)
			.orderBy(asc(schema.users.id)),
		db
			.select({ id: schema.projects.id, name: schema.projects.name, status: schema.projects.status })
			.from(schema.projects)
			.orderBy(asc(schema.projects.name))
	]);
	return {
		users,
		projects,
		userNames: Object.fromEntries(users.map((u) => [u.id, u.name])) as Record<number, string>,
		projectNames: Object.fromEntries(projects.map((p) => [p.id, p.name])) as Record<number, string>
	};
}

/** งานพร้อมชื่อโปรเจกต์และผู้รับผิดชอบ (ไม่รวมงานที่ถูกลบ เว้นแต่ขอ) */
export function taskList(opts: { withDeleted?: boolean } = {}) {
	return db
		.select({
			id: schema.tasks.id,
			code: schema.tasks.code,
			title: schema.tasks.title,
			status: schema.tasks.status,
			priority: schema.tasks.priority,
			startDate: schema.tasks.startDate,
			dueDate: schema.tasks.dueDate,
			progress: schema.tasks.progress,
			estimatedHours: schema.tasks.estimatedHours,
			actualHours: schema.tasks.actualHours,
			note: schema.tasks.note,
			version: schema.tasks.version,
			updatedAt: schema.tasks.updatedAt,
			deletedAt: schema.tasks.deletedAt,
			projectId: schema.tasks.projectId,
			projectName: schema.projects.name,
			assigneeId: schema.tasks.assigneeId,
			assigneeName: schema.users.name
		})
		.from(schema.tasks)
		.innerJoin(schema.projects, eq(schema.tasks.projectId, schema.projects.id))
		.leftJoin(schema.users, eq(schema.tasks.assigneeId, schema.users.id))
		.where(opts.withDeleted ? undefined : isNull(schema.tasks.deletedAt))
		.orderBy(asc(schema.tasks.code));
}

export type TaskRow = Awaited<ReturnType<typeof taskList>>[number];
