// ป้ายภาษาไทยที่ใช้ร่วมกันทั้งฝั่ง server และ client

export const STATUSES = ['todo', 'doing', 'done'] as const;
export type Status = (typeof STATUSES)[number];
export const STATUS_LABEL: Record<Status, string> = {
	todo: 'To do',
	doing: 'Doing',
	done: 'Done'
};
export const STATUS_TH: Record<Status, string> = {
	todo: 'ยังไม่เริ่ม',
	doing: 'กำลังทำ',
	done: 'เสร็จแล้ว'
};

export const PRIORITIES = ['high', 'medium', 'low'] as const;
export type Priority = (typeof PRIORITIES)[number];
export const PRIORITY_LABEL: Record<Priority, string> = { high: 'สูง', medium: 'กลาง', low: 'ต่ำ' };

export const ROLE_LABEL = { admin: 'Admin', member: 'พนักงาน' } as const;

export const FIELD_LABEL: Record<string, string> = {
	title: 'ชื่องาน',
	code: 'รหัสงาน',
	projectId: 'โปรเจกต์',
	assigneeId: 'ผู้รับผิดชอบ',
	priority: 'ความสำคัญ',
	status: 'สถานะ',
	startDate: 'วันเริ่ม',
	dueDate: 'กำหนดส่ง',
	estimatedHours: 'ชม.ประเมิน',
	actualHours: 'ชม.จริง',
	progress: '% ความคืบหน้า',
	note: 'หมายเหตุ',
	name: 'ชื่อ',
	description: 'รายละเอียด',
	username: 'ชื่อผู้ใช้',
	email: 'อีเมล',
	position: 'ตำแหน่ง',
	duties: 'หน้าที่',
	level: 'ระดับ',
	role: 'สิทธิ์',
	active: 'สถานะบัญชี',
	password: 'รหัสผ่าน',
	locked: 'การล็อกบัญชี'
};

export const ACTION_LABEL: Record<string, string> = {
	create: 'สร้าง',
	update: 'แก้ไข',
	delete: 'ลบ',
	restore: 'กู้คืน',
	status: 'เปลี่ยนสถานะ',
	revert: 'ย้อนกลับ',
	import: 'นำเข้าข้อมูล',
	login: 'เข้าสู่ระบบ'
};

export const ENTITY_LABEL: Record<string, string> = {
	task: 'งาน',
	project: 'โปรเจกต์',
	user: 'พนักงาน',
	system: 'ระบบ'
};

// ทุกวันที่/เวลาอ้างอิงเวลาไทย ไม่ขึ้นกับเขตเวลาของ server (Cloudflare ใช้ UTC)
export const TIME_ZONE = 'Asia/Bangkok';

const thDate = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: '2-digit', timeZone: 'UTC' });
const thDateTime = new Intl.DateTimeFormat('th-TH', {
	day: 'numeric',
	month: 'short',
	year: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
	timeZone: TIME_ZONE
});

export function fmtDate(iso: string | null | undefined) {
	if (!iso) return '-';
	const [y, m, d] = iso.split('-').map(Number);
	return thDate.format(new Date(Date.UTC(y, m - 1, d)));
}

export function fmtDateTime(ms: number) {
	return thDateTime.format(new Date(ms));
}

const isoDay = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

/** วันที่ปัจจุบันตามเวลาไทย รูปแบบ YYYY-MM-DD */
export function todayISO(now = new Date()) {
	return isoDay.format(now);
}

/** เวลา (epoch ms) ของจุดเริ่มวันตามเวลาไทย เช่น ใช้กรอง log ตามช่วงวันที่ */
export function bangkokDayStart(iso: string) {
	return Date.parse(`${iso}T00:00:00+07:00`);
}

/** จำนวนวันจากวันนี้ถึงกำหนดส่ง (ติดลบ = เลยกำหนด) */
export function daysUntil(iso: string | null | undefined, today = todayISO()) {
	if (!iso) return null;
	const utc = (s: string) => {
		const [y, m, d] = s.split('-').map(Number);
		return Date.UTC(y, m - 1, d);
	};
	return Math.round((utc(iso) - utc(today)) / 86_400_000);
}

export type DueState = 'done' | 'overdue' | 'soon' | 'normal' | 'none';
/** เกินกำหนด = ยังไม่เสร็จและเลยกำหนดส่ง / ใกล้ครบกำหนด = เหลือไม่เกิน 3 วัน (ตามเกณฑ์ใน Excel เดิม) */
export function dueState(task: { status: string; dueDate: string | null }, today = todayISO()): DueState {
	if (task.status === 'done') return 'done';
	const days = daysUntil(task.dueDate, today);
	if (days === null) return 'none';
	if (days < 0) return 'overdue';
	if (days <= 3) return 'soon';
	return 'normal';
}

/** ข้อความกิจกรรม เช่น "แก้ไขงาน", "เข้าสู่ระบบ" */
export function actionText(action: string, entityType: string) {
	if (action === 'login' || action === 'import') return ACTION_LABEL[action];
	return `${ACTION_LABEL[action] ?? action}${ENTITY_LABEL[entityType] ?? ''}`;
}
