import { taskList } from '#lib/server/queries.js';
import { PRIORITY_LABEL, STATUS_LABEL, daysUntil, dueState, todayISO } from '#lib/labels.js';
import type { RequestHandler } from './$types';

const DUE_LABEL = { overdue: 'เกินกำหนด', soon: 'ใกล้ครบกำหนด', normal: 'ปกติ', done: 'เสร็จแล้ว', none: '-' };

const cell = (v: unknown) => {
	let s = v == null ? '' : String(v);
	// กัน CSV/Formula injection: ข้อความที่ขึ้นต้นด้วย = + - @ tab หรือ CR จะถูก Excel รันเป็นสูตร
	// จึงเติม ' นำหน้า (เฉพาะข้อความ ตัวเลขติดลบอย่างวันคงเหลือยังเป็นตัวเลขเหมือนเดิม)
	if (typeof v === 'string' && /^[=+\-@\t\r]./.test(s)) s = `'${s}`;
	return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Report สำหรับหัวหน้า: เปิดด้วย Excel ได้ทันที (มี BOM ให้อ่านภาษาไทยถูก)
export const GET: RequestHandler = async () => {
	const today = todayISO();
	const header = ['รหัสงาน', 'ลูกค้า / โครงการ', 'ชื่องาน', 'ผู้รับผิดชอบ', 'ความสำคัญ', 'สถานะ', 'วันเริ่ม', 'กำหนดเสร็จ', 'ชั่วโมงประเมิน', 'ชั่วโมงจริง', '% ความคืบหน้า', 'วันคงเหลือ', 'สถานะเวลา', 'หมายเหตุ'];
	const rows = (await taskList()).map((t) => [
		t.code,
		t.projectName,
		t.title,
		t.assigneeName ?? '',
		PRIORITY_LABEL[t.priority],
		STATUS_LABEL[t.status],
		t.startDate ?? '',
		t.dueDate ?? '',
		t.estimatedHours,
		t.actualHours,
		`${t.progress}%`,
		t.status === 'done' ? '' : (daysUntil(t.dueDate, today) ?? ''),
		DUE_LABEL[dueState(t, today)],
		t.note ?? ''
	]);
	const csv = '﻿' + [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
	return new Response(csv, {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="tasks-${today}.csv"`
		}
	});
};
