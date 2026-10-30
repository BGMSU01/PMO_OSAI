import { AsyncLocalStorage } from 'node:async_hooks';
import { env } from 'cloudflare:workers';
import { drizzle as drizzleD1 } from 'drizzle-orm/d1';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import * as schema from './schema';

// ฐานข้อมูลของแต่ละ request:
// - Cloudflare Pages: D1 จาก binding `DB` (adapter-cloudflare v8 ให้อ่านผ่าน cloudflare:workers)
// - เครื่อง dev: SQLite ไฟล์ local.db ผ่าน libSQL (โหลดแบบ dynamic เฉพาะ dev จึงไม่ถูก bundle ขึ้น Cloudflare)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DB = BaseSQLiteDatabase<'async', any, typeof schema>;

const store = new AsyncLocalStorage<DB>();
let devDb: DB | undefined;

export async function resolveDb(): Promise<DB> {
	// dev ใช้ local.db เสมอ (ทำงานคู่กับ npm run db:seed / db:studio)
	if (import.meta.env.DEV) {
		devDb ??= (await import('./local')).createLocalDb() as unknown as DB;
		return devDb;
	}
	if (env.DB) return drizzleD1(env.DB, { schema }) as unknown as DB;
	throw new Error('ไม่พบฐานข้อมูล: ตั้งค่า D1 binding ชื่อ DB ใน wrangler.jsonc');
}

/** รันงานของ request นี้โดยผูกกับฐานข้อมูลที่ resolve มา (เรียกใน hooks.server.ts) */
export function withDb<T>(db: DB, fn: () => T) {
	return store.run(db, fn);
}

/** ใช้ได้ทุกที่ฝั่ง server เหมือน instance ปกติ — ชี้ไปฐานข้อมูลของ request ปัจจุบัน */
export const db = new Proxy({} as DB, {
	get(_, prop) {
		const current = store.getStore() ?? devDb;
		if (!current) throw new Error('เรียกใช้ db นอก request (ยังไม่ได้ resolveDb)');
		const value = Reflect.get(current, prop, current);
		return typeof value === 'function' ? value.bind(current) : value;
	}
});

export { schema };
