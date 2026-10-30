import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { SESSION_COOKIE, validateSession } from '#lib/server/auth.js';
import { resolveDb, withDb } from '#lib/server/db/index.js';

const PUBLIC_PATHS = ['/login'];

// ผูกฐานข้อมูล (D1 บน Cloudflare / local.db ตอน dev) กับทุกขั้นของ request นี้
export const handle: Handle = async ({ event, resolve }) =>
	withDb(await resolveDb(), () => guard({ event, resolve }));

const guard: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);
	event.locals.user = token ? await validateSession(token) : null;
	if (token && !event.locals.user) event.cookies.delete(SESSION_COOKIE, { path: '/' });

	if (!event.locals.user && !PUBLIC_PATHS.includes(event.url.pathname)) {
		const next = event.url.pathname + event.url.search;
		redirect(303, next === '/' ? '/login' : `/login?next=${encodeURIComponent(next)}`);
	}
	// รหัสผ่านเริ่มต้น/ที่ Admin ตั้งให้ ต้องเปลี่ยนก่อนใช้งานส่วนอื่น
	if (event.locals.user?.mustChangePassword && !['/account', '/logout'].includes(event.url.pathname)) {
		redirect(303, '/account?force=1');
	}
	return resolve(event);
};
