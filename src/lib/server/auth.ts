import { eq } from 'drizzle-orm';
import { error, redirect, type Cookies, type RequestEvent } from '@sveltejs/kit';
import { db, schema } from './db';
import { randomToken, sha256Hex } from './password';

export const SESSION_COOKIE = 'pmo_session';
const DAY = 86_400_000;
const SESSION_TTL = 30 * DAY;

export type SessionUser = Pick<schema.User, 'id' | 'username' | 'name' | 'role' | 'position' | 'mustChangePassword'>;

export async function createSession(userId: number) {
	const token = randomToken();
	const expiresAt = Date.now() + SESSION_TTL;
	// เก็บเฉพาะ hash ของ token ในฐานข้อมูล
	await db.insert(schema.sessions).values({ id: await sha256Hex(token), userId, expiresAt });
	return { token, expiresAt };
}

export async function validateSession(token: string): Promise<SessionUser | null> {
	const id = await sha256Hex(token);
	const [row] = await db
		.select({ session: schema.sessions, user: schema.users })
		.from(schema.sessions)
		.innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
		.where(eq(schema.sessions.id, id));
	if (!row) return null;
	if (row.session.expiresAt < Date.now() || !row.user.active) {
		await db.delete(schema.sessions).where(eq(schema.sessions.id, id));
		return null;
	}
	// ต่ออายุอัตโนมัติเมื่อเหลือน้อยกว่าครึ่ง
	if (row.session.expiresAt - Date.now() < SESSION_TTL / 2) {
		await db
			.update(schema.sessions)
			.set({ expiresAt: Date.now() + SESSION_TTL })
			.where(eq(schema.sessions.id, id));
	}
	const { id: uid, username, name, role, position, mustChangePassword } = row.user;
	return { id: uid, username, name, role, position, mustChangePassword };
}

export async function invalidateSession(token: string) {
	await db.delete(schema.sessions).where(eq(schema.sessions.id, await sha256Hex(token)));
}

export function setSessionCookie(cookies: Cookies, token: string, expiresAt: number) {
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		expires: new Date(expiresAt)
	});
}

export function requireUser(event: Pick<RequestEvent, 'locals' | 'url'>) {
	if (!event.locals.user) redirect(303, `/login?next=${encodeURIComponent(event.url.pathname)}`);
	return event.locals.user;
}

export function requireAdmin(event: Pick<RequestEvent, 'locals' | 'url'>) {
	const user = requireUser(event);
	if (user.role !== 'admin') error(403, 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น');
	return user;
}
