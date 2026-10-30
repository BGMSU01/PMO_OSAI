import { error, fail, redirect } from '@sveltejs/kit';
import { and, desc, eq, ne } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.js';
import { requireAdmin } from '#lib/server/auth.js';
import { diff, logActivity } from '#lib/server/activity.js';
import { lookups, taskList } from '#lib/server/queries.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const id = Number(params.id);
	const [project] = await db.select().from(schema.projects).where(eq(schema.projects.id, id));
	if (!project) error(404, 'ไม่พบโปรเจกต์');
	const tasks = (await taskList()).filter((t) => t.projectId === id);
	const history = await db
		.select()
		.from(schema.activityLogs)
		.where(and(eq(schema.activityLogs.entityType, 'project'), eq(schema.activityLogs.entityId, id)))
		.orderBy(desc(schema.activityLogs.id));
	return { project, tasks, history, userNames: (await lookups()).userNames };
};

export const actions: Actions = {
	update: async (event) => {
		const user = requireAdmin(event);
		const id = Number(event.params.id);
		const form = await event.request.formData();
		const [before] = await db.select().from(schema.projects).where(eq(schema.projects.id, id));
		if (!before) return fail(404, { message: 'ไม่พบโปรเจกต์' });
		const patch = {
			name: String(form.get('name') ?? '').trim(),
			description: String(form.get('description') ?? '').trim() || null,
			status: form.get('status') === 'archived' ? ('archived' as const) : ('active' as const)
		};
		if (!patch.name) return fail(400, { message: 'กรุณากรอกชื่อโปรเจกต์' });
		const [dup] = await db
			.select()
			.from(schema.projects)
			.where(and(eq(schema.projects.name, patch.name), ne(schema.projects.id, id)));
		if (dup) return fail(400, { message: 'มีโปรเจกต์ชื่อนี้แล้ว' });
		const changes = diff(before, patch);
		if (Object.keys(changes).length) {
			await db.update(schema.projects).set(patch).where(eq(schema.projects.id, id));
			await logActivity({ userId: user.id, entityType: 'project', entityId: id, entityLabel: patch.name, action: 'update', changes });
		}
		return { saved: true };
	},
	delete: async (event) => {
		const user = requireAdmin(event);
		const id = Number(event.params.id);
		const [p] = await db.select().from(schema.projects).where(eq(schema.projects.id, id));
		if (!p) return fail(404, { message: 'ไม่พบโปรเจกต์' });
		const [hasTask] = await db.select({ id: schema.tasks.id }).from(schema.tasks).where(eq(schema.tasks.projectId, id)).limit(1);
		if (hasTask) return fail(400, { message: 'ยังมีงานในโปรเจกต์นี้ (รวมงานที่ลบไว้ซึ่งยังกู้คืนได้) — ใช้ "ปิดโปรเจกต์" แทน' });
		await db.delete(schema.projects).where(eq(schema.projects.id, id));
		await logActivity({ userId: user.id, entityType: 'project', entityId: id, entityLabel: p.name, action: 'delete' });
		redirect(303, '/projects');
	}
};
