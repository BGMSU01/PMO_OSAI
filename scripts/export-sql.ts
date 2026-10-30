/**
 * แปลงข้อมูลใน local.db เป็นไฟล์ SQL สำหรับนำเข้า Cloudflare D1
 * ใช้งาน: npm run db:seed && npm run db:export-sql
 *         npx wrangler d1 execute pmo-db --file=.wrangler/seed.sql (--local หรือ --remote)
 */
import { writeFileSync } from 'node:fs';
import { createClient } from '@libsql/client';

const OUT = process.argv[2] ?? '.wrangler/seed.sql'; // ห้ามอยู่ในโฟลเดอร์ drizzle/ เพราะ wrangler จะนับเป็น migration
const TABLES = ['users', 'projects', 'tasks', 'activity_logs']; // เรียงตาม foreign key

const client = createClient({ url: process.env.DATABASE_URL ?? 'file:local.db' });
const lit = (v: unknown) =>
	v === null || v === undefined ? 'NULL' : typeof v === 'number' || typeof v === 'bigint' ? String(v) : `'${String(v).replace(/'/g, "''")}'`;

const lines = ['PRAGMA defer_foreign_keys = true;', ...[...TABLES].reverse().map((t) => `DELETE FROM ${t};`), 'DELETE FROM sessions;'];
for (const t of TABLES) {
	const rs = await client.execute(`SELECT * FROM ${t}`);
	for (const row of rs.rows) {
		lines.push(`INSERT INTO ${t} (${rs.columns.join(', ')}) VALUES (${rs.columns.map((c) => lit(row[c])).join(', ')});`);
	}
}
writeFileSync(OUT, lines.join('\n') + '\n');
console.log(`✔ เขียน ${lines.length} คำสั่งลง ${OUT}`);
