import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.js';
import { requireAdmin } from '#lib/server/auth.js';
import { logActivity } from '#lib/server/activity.js';
import { lookups, taskList } from '#lib/server/queries.js';
import { dueState, todayISO } from '#lib/labels.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [tasks, lk] = await Promise.all([taskList(), lookups()]);
	const today = todayISO();
	const projects = await db.select().from(schema.projects).orderBy(schema.projects.name);
	return {
		projects: projects.map((p) => {
			const ts = tasks.filter((t) => t.projectId === p.id);
			return {
				...p,
				total: ts.length,
				done: ts.filter((t) => t.status === 'done').length,
				overdue: ts.filter((t) => dueState(t, today) === 'overdue').length,
				progress: ts.length ? Math.round(ts.reduce((s, t) => s + t.progress, 0) / ts.length) : 0,
				members: [...new Set(ts.map((t) => t.assigneeId).filter(Boolean))].map((id) => lk.userNames[id!])
			};
		})
	};
};

export const actions: Actions = {
	create: async (event) => {
		const user = requireAdmin(event);
		const form = await event.request.formData();
		const name = String(form.get('name') ?? '').trim();
		const description = String(form.get('description') ?? '').trim() || null;
		if (!name) return fail(400, { message: 'กรุณากรอกชื่อโปรเจกต์' });
		const [dup] = await db.select().from(schema.projects).where(eq(schema.projects.name, name));
		if (dup) return fail(400, { message: 'มีโปรเจกต์ชื่อนี้แล้ว' });
		const [p] = await db.insert(schema.projects).values({ name, description, createdAt: Date.now() }).returning();
		await logActivity({
			userId: user.id,
			entityType: 'project',
			entityId: p.id,
			entityLabel: p.name,
			action: 'create',
			changes: { name: { from: null, to: name }, ...(description ? { description: { from: null, to: description } } : {}) }
		});
		return { created: true };
	}
};
