import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

// ใช้เฉพาะตอนพัฒนาในเครื่อง (npm run dev): SQLite ไฟล์ local.db
export function createLocalDb() {
	return drizzle(createClient({ url: process.env.DATABASE_URL ?? 'file:local.db' }), { schema });
}
