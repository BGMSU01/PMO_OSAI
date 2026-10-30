import { fail } from '@sveltejs/kit';
import { and, eq, ne } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.js';
import { hashPassword, sha256Hex, verifyPassword } from '#lib/server/password.js';
import { SESSION_COOKIE } from '#lib/server/auth.js';
import { logActivity } from '#lib/server/activity.js';
import type { Actions } from './$types';

export const actions: Actions = {
	password: async ({ request, locals, cookies }) => {
		const user = locals.user!;
		const form = await request.formData();
		const current = String(form.get('current') ?? '');
		const next = String(form.get('next') ?? '');
		const [row] = await db.select().from(schema.users).where(eq(schema.users.id, user.id));
		if (!(await verifyPassword(current, row.passwordHash))) return fail(400, { message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
		if (next.length < 8) return fail(400, { message: 'รหัสผ่านใหม่อย่างน้อย 8 ตัวอักษร' });
		if (next !== String(form.get('confirm') ?? '')) return fail(400, { message: 'ยืนยันรหัสผ่านไม่ตรงกัน' });
		if (next === current) return fail(400, { message: 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม' });
		await db
			.update(schema.users)
			.set({ passwordHash: await hashPassword(next), mustChangePassword: false })
			.where(eq(schema.users.id, user.id));
		// ออกจากระบบเครื่องอื่นทั้งหมด ยกเว้นเครื่องนี้
		const sid = await sha256Hex(cookies.get(SESSION_COOKIE) ?? '');
		await db.delete(schema.sessions).where(and(eq(schema.sessions.userId, user.id), ne(schema.sessions.id, sid)));
		await logActivity({ userId: user.id, entityType: 'user', entityId: user.id, entityLabel: user.name, action: 'update', changes: { password: { from: null, to: 'changed' } } });
		return { saved: true };
	}
};
