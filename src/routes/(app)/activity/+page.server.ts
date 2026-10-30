import { fail } from '@sveltejs/kit';
import { and, count, desc, eq, gte, isNotNull, lte, ne, type SQL } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.js';
import { lookups } from '#lib/server/queries.js';
import { TaskError, restoreTask, revertActivity } from '#lib/server/tasks.js';
import { bangkokDayStart } from '#lib/labels.js';
import type { Actions, PageServerLoad } from './$types';

const PAGE_SIZE = 50;

export const load: PageServerLoad = async ({ url }) => {
	const f = {
		user: url.searchParams.get('user') ?? 'all',
		type: url.searchParams.get('type') ?? 'all',
		from: url.searchParams.get('from') ?? '',
		to: url.searchParams.get('to') ?? '',
		page: Math.max(1, Number(url.searchParams.get('page')) || 1)
	};
	const where: SQL[] = [];
	if (f.user !== 'all') where.push(eq(schema.activityLogs.userId, Number(f.user)));
	if (f.type === 'login') where.push(eq(schema.activityLogs.action, 'login'));
	else {
		where.push(ne(schema.activityLogs.action, 'login'));
		if (f.type !== 'all') where.push(eq(schema.activityLogs.entityType, f.type as 'task'));
	}
	if (f.from) where.push(gte(schema.activityLogs.createdAt, bangkokDayStart(f.from)));
	if (f.to) where.push(lte(schema.activityLogs.createdAt, bangkokDayStart(f.to) + 86_400_000 - 1));

	const [rows, [{ n }], lk] = await Promise.all([
		db
			.select()
			.from(schema.activityLogs)
			.where(and(...where))
			.orderBy(desc(schema.activityLogs.id))
			.limit(PAGE_SIZE)
			.offset((f.page - 1) * PAGE_SIZE),
		db.select({ n: count() }).from(schema.activityLogs).where(and(...where)),
		lookups()
	]);
	// งานที่ยังถูกลบอยู่ (ใช้แสดงปุ่มกู้คืน)
	const deletedIds = new Set(
		(await db.select({ id: schema.tasks.id }).from(schema.tasks).where(isNotNull(schema.tasks.deletedAt))).map((r) => r.id)
	);
	return { deletedIds: [...deletedIds], rows, total: n, pageSize: PAGE_SIZE, filters: f, users: lk.users, userNames: lk.userNames, projectNames: lk.projectNames };
};

export const actions: Actions = {
	revert: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			await revertActivity(locals.user!, Number(form.get('logId')));
		} catch (e) {
			if (e instanceof TaskError) return fail(e.status, { message: e.message });
			throw e;
		}
		return { reverted: true };
	},
	restore: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			await restoreTask(locals.user!, Number(form.get('taskId')));
		} catch (e) {
			if (e instanceof TaskError) return fail(e.status, { message: e.message });
			throw e;
		}
		return { restored: true };
	}
};
