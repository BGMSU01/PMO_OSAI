// เกณฑ์ตัวชี้วัดของ Dashboard — หัวหน้าทีมปรับค่าเป้าได้ที่ไฟล์นี้ที่เดียว
// สถานะใช้ชุดสีของกองฯ: ok = ปกติ, warn = เฝ้าระวัง, bad = ขัดข้อง, info = ข้อมูล, none = ไม่มีข้อมูล

export type Level = 'ok' | 'warn' | 'bad' | 'info' | 'none';

export const LEVEL_ICON: Record<Level, string> = { ok: '✓', warn: '!', bad: '✕', info: 'i', none: '–' };
export const LEVEL_TEXT: Record<Level, string> = {
	ok: 'ตามเป้า',
	warn: 'เฝ้าระวัง',
	bad: 'ต่ำกว่าเป้า',
	info: 'ข้อมูล',
	none: 'ไม่มีข้อมูล'
};

export const TARGETS = {
	/** ความคืบหน้าจริงต้องตามหลังแผนไม่เกินกี่จุด % */
	progressGap: { warn: -5, bad: -15 },
	/** % งานที่ถึงกำหนดแล้วต้องเสร็จ */
	dueDone: { target: 90, warn: 75 },
	/** จำนวนงานเลยกำหนดที่ยอมรับได้ */
	overdue: { target: 0, warn: 3 },
	/** ชั่วโมงจริงเทียบประเมิน (งานที่เสร็จแล้ว) ไม่ควรเกิน % */
	effort: { target: 110, warn: 130 },
	/** สัญญาณเสี่ยง: ภาระงานคงเหลือต่อคน (ชม.) ใน 14 วันข้างหน้า */
	workload: { warn: 40 }
} as const;

/** ค่ามาก = ดี */
export function levelHigh(value: number | null, target: number, warn: number): Level {
	if (value === null) return 'none';
	return value >= target ? 'ok' : value >= warn ? 'warn' : 'bad';
}

/** ค่าน้อย = ดี */
export function levelLow(value: number | null, target: number, warn: number): Level {
	if (value === null) return 'none';
	return value <= target ? 'ok' : value <= warn ? 'warn' : 'bad';
}
