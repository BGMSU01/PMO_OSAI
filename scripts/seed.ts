/**
 * นำเข้าข้อมูลเริ่มต้นจากไฟล์ Excel (ชีต "ทีมงาน" และ "งานทั้งหมด")
 * ใช้งาน: npm run db:seed [path/to/file.xlsx]
 * คำเตือน: ล้างข้อมูลเดิมในฐานข้อมูลทั้งหมดก่อนนำเข้า
 */
import XLSX from 'xlsx';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '../src/lib/server/db/schema';
import { hashPassword } from '../src/lib/server/password';

const FILE = process.argv[2] ?? 'data/project_tracking_sample.xlsx';
// รหัสผ่านทดสอบสำหรับเครื่อง dev เท่านั้น — ให้ผู้ใช้เปลี่ยนเองที่หน้า "บัญชีของฉัน"
const DEFAULT_PASSWORD = process.env.SEED_PASSWORD ?? 'password123';

const db = drizzle(createClient({ url: process.env.DATABASE_URL ?? 'file:local.db' }), { schema });

type Row = (string | number | null)[];

function readSheet(wb: XLSX.WorkBook, name: string, headerKey: string) {
	const ws = wb.Sheets[name];
	if (!ws) throw new Error(`ไม่พบชีต "${name}" ในไฟล์ ${FILE}`);
	const rows = XLSX.utils.sheet_to_json<Row>(ws, { header: 1, raw: true, defval: null });
	// หัวตารางไม่ได้อยู่แถวแรก (มีชื่อเรื่อง/คำอธิบายอยู่ด้านบน) จึงหาแถวที่มีคอลัมน์หลักก่อน
	const headerIdx = rows.findIndex((r) => r.some((c) => String(c ?? '').trim() === headerKey));
	if (headerIdx < 0) throw new Error(`ไม่พบหัวตาราง "${headerKey}" ในชีต "${name}"`);
	const header = rows[headerIdx].map((c) => String(c ?? '').trim());
	return rows
		.slice(headerIdx + 1)
		.filter((r) => r[header.indexOf(headerKey)] != null && String(r[header.indexOf(headerKey)]).trim() !== '')
		.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])) as Record<string, string | number | null>);
}

function toISODate(v: unknown): string | null {
	if (v == null || v === '') return null;
	if (typeof v === 'number') {
		// Excel serial date (1 = 1900-01-01) -> คำนวณแบบ UTC เพื่อเลี่ยงปัญหา timezone
		const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000);
		return d.toISOString().slice(0, 10);
	}
	const m = String(v).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
	if (!m) return null;
	let year = Number(m[3]);
	if (year > 2400) year -= 543; // ปี พ.ศ. -> ค.ศ.
	return `${year}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

function toNumber(v: unknown) {
	const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/[%,]/g, ''));
	return Number.isFinite(n) ? n : 0;
}

function toPercent(v: unknown) {
	// ค่าใน Excel เป็นสัดส่วน 0-1 (จัดรูปแบบเป็น %) หรือเป็นข้อความ "70%"
	if (typeof v === 'number') return Math.round(v <= 1 ? v * 100 : v);
	return Math.round(toNumber(v));
}

const STATUS_MAP: Record<string, schema.TaskStatus> = {
	ยังไม่เริ่ม: 'todo',
	กำลังดำเนินการ: 'doing',
	รอตรวจ: 'doing',
	เสร็จแล้ว: 'done'
};
const PRIORITY_MAP: Record<string, schema.TaskPriority> = { สูง: 'high', กลาง: 'medium', ต่ำ: 'low' };

async function main() {
	const wb = XLSX.readFile(FILE);
	const team = readSheet(wb, 'ทีมงาน', 'ชื่อ');
	const taskRows = readSheet(wb, 'งานทั้งหมด', 'รหัสงาน');
	const now = Date.now();
	const passwordHash = await hashPassword(DEFAULT_PASSWORD);

	await db.delete(schema.activityLogs);
	await db.delete(schema.sessions);
	await db.delete(schema.tasks);
	await db.delete(schema.projects);
	await db.delete(schema.users);
	// เริ่มนับ id ใหม่ เพื่อให้ id คงที่ทุกครั้งที่ seed
	await db.run(sql`delete from sqlite_sequence`);

	// บัญชีผู้ดูแลระบบ (IT) แยกจากพนักงาน
	const [admin] = await db
		.insert(schema.users)
		.values({ username: 'admin', name: 'ผู้ดูแลระบบ', position: 'System Admin', role: 'admin', passwordHash, mustChangePassword: true, createdAt: now })
		.returning();

	const userByName = new Map<string, number>();
	for (const r of team) {
		const email = r['อีเมล'] ? String(r['อีเมล']).trim() : null;
		const position = r['ตำแหน่ง'] ? String(r['ตำแหน่ง']).trim() : null;
		const [u] = await db
			.insert(schema.users)
			.values({
				username: email ? email.split('@')[0].toLowerCase() : `user${r['ลำดับ']}`,
				name: String(r['ชื่อ']).trim(),
				email,
				position,
				duties: r['หน้าที่หลัก'] ? String(r['หน้าที่หลัก']).trim() : null,
				level: r['ระดับ'] ? String(r['ระดับ']).trim() : null,
				startDate: toISODate(r['วันเริ่มงาน']),
				// หัวหน้าทีมได้สิทธิ์ admin เพื่อจัดการทีมและดู report
				role: position?.includes('หัวหน้า') ? 'admin' : 'member',
				passwordHash,
				mustChangePassword: true,
				createdAt: now
			})
			.returning();
		userByName.set(u.name, u.id);
	}

	const projectByName = new Map<string, number>();
	for (const name of new Set(taskRows.map((r) => String(r['ลูกค้า / โครงการ']).trim()))) {
		const [p] = await db.insert(schema.projects).values({ name, createdAt: now }).returning();
		projectByName.set(name, p.id);
	}

	let reviewCount = 0;
	for (const r of taskRows) {
		const rawStatus = String(r['สถานะ'] ?? '').trim();
		const status = STATUS_MAP[rawStatus] ?? 'todo';
		let note = r['หมายเหตุ'] ? String(r['หมายเหตุ']).trim() : '';
		// ระบบใหม่มี 3 สถานะ (To do / Doing / Done) — "รอตรวจ" รวมไว้ใน Doing และติดป้ายในหมายเหตุ
		if (rawStatus === 'รอตรวจ') {
			note = `[รอตรวจ] ${note}`.trim();
			reviewCount++;
		}
		await db.insert(schema.tasks).values({
			code: String(r['รหัสงาน']).trim(),
			projectId: projectByName.get(String(r['ลูกค้า / โครงการ']).trim())!,
			title: String(r['ชื่องาน']).trim(),
			assigneeId: userByName.get(String(r['ผู้รับผิดชอบ'] ?? '').trim()) ?? null,
			priority: PRIORITY_MAP[String(r['ความสำคัญ'] ?? '').trim()] ?? 'medium',
			status,
			startDate: toISODate(r['วันเริ่ม']),
			dueDate: toISODate(r['กำหนดเสร็จ']),
			estimatedHours: toNumber(r['ชั่วโมงประเมิน']),
			actualHours: toNumber(r['ชั่วโมงจริง']),
			progress: status === 'done' ? 100 : toPercent(r['% ความคืบหน้า']),
			note: note || null,
			createdAt: now,
			updatedAt: now
		});
	}

	await db.insert(schema.activityLogs).values({
		userId: admin.id,
		entityType: 'system',
		action: 'import',
		entityLabel: `นำเข้าจาก Excel: พนักงาน ${team.length} คน, โปรเจกต์ ${projectByName.size}, งาน ${taskRows.length}`,
		createdAt: now
	});

	console.log(
		`✔ นำเข้าเรียบร้อย: พนักงาน ${team.length} คน (+admin), โปรเจกต์ ${projectByName.size}, งาน ${taskRows.length} (รอตรวจ ${reviewCount} งานรวมไว้ใน Doing)`
	);
	console.log(`  รหัสผ่านเริ่มต้นของทุกบัญชี: ${DEFAULT_PASSWORD}`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
