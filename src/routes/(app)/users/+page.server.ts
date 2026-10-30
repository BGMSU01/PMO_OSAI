import { fail } from '@sveltejs/kit';
import { asc, eq, sql } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.js';
import { requireAdmin } from '#lib/server/auth.js';
import { hashPassword } from '#lib/server/password.js';
import { logActivity } from '#lib/server/activity.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireAdmin(event);
	const users = await db
		.select({
			id: schema.users.id,
			username: schema.users.username,
			name: schema.users.name,
			email: schema.users.email,
			position: schema.users.position,
			level: schema.users.level,
			role: schema.users.role,
			active: schema.users.active,
			startDate: schema.users.startDate,
			taskCount: sql<number>`(select count(*) from tasks where tasks.assignee_id = ${schema.users.id} and tasks.deleted_at is null)`,
			openCount: sql<number>`(select count(*) from tasks where tasks.assignee_id = ${schema.users.id} and tasks.status != 'done' and tasks.deleted_at is null)`
		})
		.from(schema.users)
		.orderBy(asc(schema.users.id));
	return { users };
};

export const actions: Actions = {
	create: async (event) => {
		const admin = requireAdmin(event);
		const form = await event.request.formData();
		const values = {
			username: String(form.get('username') ?? '').trim().toLowerCase(),
			name: String(form.get('name') ?? '').trim(),
			email: String(form.get('email') ?? '').trim() || null,
			position: String(form.get('position') ?? '').trim() || null,
			role: form.get('role') === 'admin' ? ('admin' as const) : ('member' as const)
		};
		const password = String(form.get('password') ?? '');
		if (!/^[a-z0-9._-]{3,32}$/.test(values.username))
			return fail(400, { message: 'ชื่อผู้ใช้ต้องเป็น a-z, 0-9, . _ - ยาว 3-32 ตัว', values });
		if (!values.name) return fail(400, { message: 'กรุณากรอกชื่อ', values });
		if (password.length < 8) return fail(400, { message: 'รหัสผ่านอย่างน้อย 8 ตัวอักษร', values });
		const [dup] = await db.select().from(schema.users).where(eq(schema.users.username, values.username));
		if (dup) return fail(400, { message: 'ชื่อผู้ใช้นี้ถูกใช้แล้ว', values });

		const [u] = await db
			.insert(schema.users)
			.values({ ...values, passwordHash: await hashPassword(password), mustChangePassword: true, createdAt: Date.now() })
			.returning();
		await logActivity({
			userId: admin.id,
			entityType: 'user',
			entityId: u.id,
			entityLabel: u.name,
			action: 'create',
			changes: Object.fromEntries(
				Object.entries(values)
					.filter(([, v]) => v)
					.map(([k, v]) => [k, { from: null, to: v }])
			)
		});
		return { created: u.name };
	}
};
