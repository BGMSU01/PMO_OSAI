import { error, fail, redirect } from '@sveltejs/kit';
import { and, desc, eq, isNull, ne, or, count } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.js';
import { requireAdmin } from '#lib/server/auth.js';
import { hashPassword } from '#lib/server/password.js';
import { diff, logActivity } from '#lib/server/activity.js';
import type { Actions, PageServerLoad } from './$types';

async function getUser(id: number) {
	const [u] = await db.select().from(schema.users).where(eq(schema.users.id, id));
	return u;
}

async function countAdmins(excludeId: number) {
	const [r] = await db
		.select({ n: count() })
		.from(schema.users)
		.where(and(eq(schema.users.role, 'admin'), eq(schema.users.active, true), ne(schema.users.id, excludeId)));
	return r.n;
}

export const load: PageServerLoad = async (event) => {
	requireAdmin(event);
	const u = await getUser(Number(event.params.id));
	if (!u) error(404, 'ไม่พบพนักงาน');
	const { passwordHash: _, ...user } = u;
	const [{ n: taskCount }] = await db.select({ n: count() }).from(schema.tasks).where(and(eq(schema.tasks.assigneeId, u.id), isNull(schema.tasks.deletedAt)));
	const recent = await db
		.select()
		.from(schema.activityLogs)
		.where(or(eq(schema.activityLogs.userId, u.id), and(eq(schema.activityLogs.entityType, 'user'), eq(schema.activityLogs.entityId, u.id))))
		.orderBy(desc(schema.activityLogs.id))
		.limit(15);
	return { target: user, taskCount, recent };
};

export const actions: Actions = {
	update: async (event) => {
		const admin = requireAdmin(event);
		const id = Number(event.params.id);
		const before = await getUser(id);
		if (!before) return fail(404, { message: 'ไม่พบพนักงาน' });
		const form = await event.request.formData();
		const s = (k: string) => String(form.get(k) ?? '').trim() || null;
		const patch = {
			name: s('name') ?? before.name,
			email: s('email'),
			position: s('position'),
			duties: s('duties'),
			level: s('level'),
			startDate: s('startDate'),
			role: form.get('role') === 'admin' ? ('admin' as const) : ('member' as const),
			active: form.get('active') === 'on'
		};
		if ((before.role === 'admin' && patch.role !== 'admin') || (before.active && !patch.active)) {
			if (id === admin.id) return fail(400, { message: 'ลดสิทธิ์หรือปิดการใช้งานบัญชีตัวเองไม่ได้' });
			if (before.role === 'admin' && (await countAdmins(id)) === 0)
				return fail(400, { message: 'ต้องมี Admin ที่ใช้งานอยู่อย่างน้อย 1 คน' });
		}
		const changes = diff(before, patch);
		const password = String(form.get('password') ?? '');
		if (password) {
			if (password.length < 8) return fail(400, { message: 'รหัสผ่านอย่างน้อย 8 ตัวอักษร' });
			changes.password = { from: null, to: 'reset' };
		}
		if (!Object.keys(changes).length) return { saved: true };

		await db
			.update(schema.users)
			.set({
				...patch,
				...(password ? { passwordHash: await hashPassword(password), mustChangePassword: true, failedLogins: 0, lockedUntil: null } : {})
			})
			.where(eq(schema.users.id, id));
		// ปิดใช้งานหรือรีเซ็ตรหัสผ่าน -> บังคับออกจากระบบทุกเครื่อง
		if (!patch.active || password) await db.delete(schema.sessions).where(eq(schema.sessions.userId, id));
		await logActivity({ userId: admin.id, entityType: 'user', entityId: id, entityLabel: patch.name, action: 'update', changes });
		return { saved: true };
	},
	delete: async (event) => {
		const admin = requireAdmin(event);
		const id = Number(event.params.id);
		const u = await getUser(id);
		if (!u) return fail(404, { message: 'ไม่พบพนักงาน' });
		if (id === admin.id) return fail(400, { message: 'ลบบัญชีตัวเองไม่ได้' });
		if (u.role === 'admin' && (await countAdmins(id)) === 0) return fail(400, { message: 'ต้องมี Admin อย่างน้อย 1 คน' });
		const [{ n }] = await db.select({ n: count() }).from(schema.tasks).where(and(eq(schema.tasks.assigneeId, id), isNull(schema.tasks.deletedAt)));
		if (n > 0)
			return fail(400, { message: `ยังมีงานที่รับผิดชอบ ${n} งาน — โอนงานให้คนอื่นก่อน หรือใช้ "ปิดการใช้งาน" เพื่อเก็บประวัติไว้` });
		await db.delete(schema.users).where(eq(schema.users.id, id));
		await logActivity({ userId: admin.id, entityType: 'user', entityId: id, entityLabel: u.name, action: 'delete' });
		redirect(303, '/users');
	}
};
