import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.js';
import { verifyPassword } from '#lib/server/password.js';
import { createSession, setSessionCookie } from '#lib/server/auth.js';
import { logActivity } from '#lib/server/activity.js';
import type { Actions, PageServerLoad } from './$types';

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

const safeNext = (next: string | null) => (next && next.startsWith('/') && !next.startsWith('//') ? next : '/');

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.user) redirect(303, safeNext(url.searchParams.get('next')));
};

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const form = await request.formData();
		const username = String(form.get('username') ?? '').trim().toLowerCase();
		const password = String(form.get('password') ?? '');
		if (!username || !password) return fail(400, { username, message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });

		const [user] = await db.select().from(schema.users).where(eq(schema.users.username, username));
		const invalid = () => fail(400, { username, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
		if (!user) return invalid();
		if (user.lockedUntil && user.lockedUntil > Date.now()) {
			const mins = Math.ceil((user.lockedUntil - Date.now()) / 60_000);
			return fail(429, { username, message: `ใส่รหัสผ่านผิดหลายครั้ง บัญชีถูกล็อกชั่วคราว ลองใหม่ในอีก ${mins} นาที หรือติดต่อ Admin` });
		}
		if (!(await verifyPassword(password, user.passwordHash))) {
			// ผิดครบ MAX_FAILED ครั้งติดกัน -> ล็อก LOCK_MINUTES นาที
			const failed = user.failedLogins + 1;
			const locked = failed >= MAX_FAILED;
			await db
				.update(schema.users)
				.set({ failedLogins: locked ? 0 : failed, lockedUntil: locked ? Date.now() + LOCK_MINUTES * 60_000 : null })
				.where(eq(schema.users.id, user.id));
			if (locked) {
				await logActivity({ userId: null, entityType: 'user', entityId: user.id, entityLabel: user.name, action: 'update', changes: { locked: { from: null, to: `ล็อก ${LOCK_MINUTES} นาที (รหัสผิด ${MAX_FAILED} ครั้ง)` } } });
				return fail(429, { username, message: `ใส่รหัสผ่านผิด ${MAX_FAILED} ครั้ง บัญชีถูกล็อก ${LOCK_MINUTES} นาที` });
			}
			return invalid();
		}
		if (!user.active) return fail(403, { username, message: 'บัญชีนี้ถูกปิดการใช้งาน กรุณาติดต่อ Admin' });
		if (user.failedLogins || user.lockedUntil)
			await db.update(schema.users).set({ failedLogins: 0, lockedUntil: null }).where(eq(schema.users.id, user.id));

		const { token, expiresAt } = await createSession(user.id);
		setSessionCookie(cookies, token, expiresAt);
		await logActivity({ userId: user.id, entityType: 'user', entityId: user.id, entityLabel: user.name, action: 'login' });
		redirect(303, safeNext(url.searchParams.get('next')));
	}
};
