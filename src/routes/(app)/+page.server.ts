import { desc, max, ne } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.js';
import { lookups, taskList, type TaskRow } from '#lib/server/queries.js';
import { daysUntil, dueState, todayISO } from '#lib/labels.js';
import { TARGETS, levelHigh, levelLow, type Level } from '#lib/kpi.js';
import type { PageServerLoad } from './$types';

const DAY = 86_400_000;
const utc = (iso: string) => {
	const [y, m, d] = iso.split('-').map(Number);
	return Date.UTC(y, m - 1, d);
};
const isoOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const round = (n: number, d = 0) => Math.round(n * 10 ** d) / 10 ** d;
const isReview = (t: TaskRow) => t.status === 'doing' && !!t.note?.startsWith('[รอตรวจ]');

/** น้ำหนักงาน = ชั่วโมงประเมิน (อย่างน้อย 1 ชม. เพื่อไม่ให้งานที่ไม่ได้ประเมินหายไปจากการคำนวณ) */
const weight = (t: TaskRow) => Math.max(1, t.estimatedHours);

/** สัดส่วนที่ควรเสร็จตามแผน ณ เวลาที่กำหนด: เพิ่มเป็นเส้นตรงจากวันเริ่มถึงสิ้นวันกำหนดส่ง */
function plannedFraction(t: TaskRow, atMs: number) {
	if (!t.dueDate) return t.status === 'done' ? 1 : 0;
	const due = utc(t.dueDate) + DAY;
	const start = t.startDate ? utc(t.startDate) : due - DAY;
	if (atMs >= due) return 1;
	if (atMs <= start) return 0;
	return (atMs - start) / (due - start);
}

/** % ความคืบหน้าแบบถ่วงน้ำหนักชั่วโมง เทียบกับแผน */
function progressVsPlan(tasks: TaskRow[], atMs: number) {
	const w = tasks.reduce((s, t) => s + weight(t), 0);
	if (!w) return { actual: null, plan: null };
	const actual = tasks.reduce((s, t) => s + weight(t) * (t.status === 'done' ? 1 : t.progress / 100), 0) / w;
	const plan = tasks.reduce((s, t) => s + weight(t) * plannedFraction(t, atMs), 0) / w;
	return { actual: round(actual * 100), plan: round(plan * 100) };
}

const gapLevel = (actual: number | null, plan: number | null): Level =>
	actual === null || plan === null
		? 'none'
		: actual - plan >= TARGETS.progressGap.warn
			? 'ok'
			: actual - plan >= TARGETS.progressGap.bad
				? 'warn'
				: 'bad';

const sumBy = (ts: TaskRow[], f: (t: TaskRow) => number) => ts.reduce((s, t) => s + f(t), 0);

export const load: PageServerLoad = async () => {
	const today = todayISO();
	const nowMs = utc(today) + DAY; // สิ้นวันนี้
	const [tasks, lk, recent, [last]] = await Promise.all([
		taskList(),
		lookups(),
		db
			.select()
			.from(schema.activityLogs)
			.where(ne(schema.activityLogs.action, 'login'))
			.orderBy(desc(schema.activityLogs.id))
			.limit(6),
		db.select({ at: max(schema.tasks.updatedAt) }).from(schema.tasks)
	]);
	const state = new Map(tasks.map((t) => [t.id, dueState(t, today)]));
	const open = tasks.filter((t) => t.status !== 'done');
	const overdue = tasks.filter((t) => state.get(t.id) === 'overdue');

	// ---------- 1) Process: แถบขั้นตอนงาน ----------
	const process = [
		{ key: 'todo', label: 'รอเริ่ม', count: tasks.filter((t) => t.status === 'todo').length, href: '/tasks?status=todo' },
		{ key: 'doing', label: 'กำลังทำ', count: tasks.filter((t) => t.status === 'doing' && !isReview(t)).length, href: '/tasks?status=doing' },
		{ key: 'review', label: 'รอตรวจ', count: tasks.filter(isReview).length, href: `/tasks?q=${encodeURIComponent('[รอตรวจ]')}` },
		{ key: 'done', label: 'เสร็จ', count: tasks.filter((t) => t.status === 'done').length, href: '/tasks?status=done' }
	];

	// ---------- 2) KPI: ค่าจริง + เป้า + สถานะ + การเทียบ + สาเหตุ + ที่มา ----------
	const pv = progressVsPlan(tasks, nowMs);
	const dueTasks = tasks.filter((t) => t.dueDate && t.dueDate < today);
	const dueDoneCount = dueTasks.filter((t) => t.status === 'done').length;
	const dueDone = dueTasks.length ? round((dueDoneCount / dueTasks.length) * 100) : null;
	const doneTasks = tasks.filter((t) => t.status === 'done' && t.estimatedHours > 0);
	const doneActual = round(sumBy(doneTasks, (t) => t.actualHours));
	const doneEst = round(sumBy(doneTasks, (t) => t.estimatedHours));
	const effort = doneEst ? round((doneActual / doneEst) * 100) : null;
	const overrun = [...doneTasks].sort((a, b) => b.actualHours / b.estimatedHours - a.actualHours / a.estimatedHours)[0];
	const oldestOverdue = [...overdue].sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))[0];

	const projects = lk.projects
		.map((p) => {
			const ts = tasks.filter((t) => t.projectId === p.id);
			const v = progressVsPlan(ts, nowMs);
			return {
				id: p.id,
				name: p.name,
				total: ts.length,
				done: ts.filter((t) => t.status === 'done').length,
				overdue: ts.filter((t) => state.get(t.id) === 'overdue').length,
				actual: v.actual ?? 0,
				plan: v.plan ?? 0,
				gap: v.actual !== null && v.plan !== null ? round(v.actual - v.plan) : 0,
				level: gapLevel(v.actual, v.plan)
			};
		})
		.filter((p) => p.total > 0)
		.sort((a, b) => a.gap - b.gap);
	const lag = projects[0];

	const kpis = [
		{
			key: 'progress',
			title: 'ความคืบหน้ารวมเทียบแผน',
			value: pv.actual,
			unit: '%',
			targetText: `แผน ณ วันนี้ ${pv.plan}%`,
			level: gapLevel(pv.actual, pv.plan),
			compare:
				pv.actual !== null && pv.plan !== null
					? pv.actual >= pv.plan
						? `เร็วกว่าแผน ${round(pv.actual - pv.plan)} จุด`
						: `ช้ากว่าแผน ${round(pv.plan - pv.actual)} จุด`
					: '',
			insight: lag && lag.gap < 0 ? `ฉุดมากสุด: ${lag.name} ช้ากว่าแผน ${-lag.gap} จุด` : 'ทุกโปรเจกต์เป็นไปตามแผน',
			formula: 'Σ(ชม.ประเมิน × % คืบหน้า) ÷ Σ ชม.ประเมิน · แผนคิดเป็นเส้นตรงจากวันเริ่มถึงกำหนดส่ง',
			source: `งาน ${tasks.length} รายการ`,
			href: '/tasks',
			bar: { value: pv.actual ?? 0, target: pv.plan, max: 100 }
		},
		{
			key: 'dueDone',
			title: 'งานที่ถึงกำหนดแล้วเสร็จทัน',
			value: dueDone,
			unit: '%',
			targetText: `เป้า ≥ ${TARGETS.dueDone.target}%`,
			level: levelHigh(dueDone, TARGETS.dueDone.target, TARGETS.dueDone.warn),
			compare: `เสร็จ ${dueDoneCount} จาก ${dueTasks.length} งานที่ผ่านวันกำหนดส่งแล้ว`,
			insight: dueTasks.length
				? `ยังไม่เสร็จ ${dueTasks.length - dueDoneCount} งาน ดูรายการในแผงแจ้งเตือน`
				: 'ยังไม่มีงานที่ถึงกำหนด',
			formula: 'งานเสร็จ ÷ งานที่วันกำหนดส่งผ่านไปแล้ว',
			source: `งาน ${dueTasks.length} รายการ`,
			href: '/tasks?status=overdue',
			bar: { value: dueDone ?? 0, target: TARGETS.dueDone.target, max: 100 }
		},
		{
			key: 'overdue',
			title: 'งานเลยกำหนด',
			value: overdue.length,
			unit: 'งาน',
			targetText: `เป้า ${TARGETS.overdue.target} งาน`,
			level: levelLow(overdue.length, TARGETS.overdue.target, TARGETS.overdue.warn),
			compare: `${round((overdue.length / Math.max(1, open.length)) * 100)}% ของงานที่ยังไม่เสร็จ (${open.length} งาน)`,
			insight: oldestOverdue
				? `ค้างนานสุด: ${oldestOverdue.code} (${oldestOverdue.assigneeName ?? 'ไม่มีผู้รับผิดชอบ'}) เลยมา ${-(daysUntil(oldestOverdue.dueDate, today) ?? 0)} วัน`
				: 'ไม่มีงานเลยกำหนด',
			formula: 'งานที่ยังไม่เสร็จและเลยวันกำหนดส่ง',
			source: `งานค้าง ${open.length} รายการ`,
			href: '/tasks?status=overdue',
			bar: { value: overdue.length, target: TARGETS.overdue.target, max: Math.max(TARGETS.overdue.warn * 2, overdue.length) }
		},
		{
			key: 'effort',
			title: 'ชั่วโมงจริงเทียบที่ประเมิน',
			value: effort,
			unit: '%',
			targetText: `เป้า ≤ ${TARGETS.effort.target}%`,
			level: levelLow(effort, TARGETS.effort.target, TARGETS.effort.warn),
			compare: `ใช้ ${doneActual} จาก ${doneEst} ชม. ที่ประเมินไว้`,
			insight:
				overrun && overrun.actualHours > overrun.estimatedHours
					? `เกินมากสุด: ${overrun.code} ใช้ ${overrun.actualHours}/${overrun.estimatedHours} ชม.`
					: 'ไม่มีงานที่ใช้เวลาเกินประเมิน',
			formula: 'Σ ชม.จริง ÷ Σ ชม.ประเมิน เฉพาะงานที่เสร็จแล้ว',
			source: `งานเสร็จ ${doneTasks.length} รายการ`,
			href: '/tasks?status=done',
			bar: { value: effort ?? 0, target: TARGETS.effort.target, max: 160 }
		}
	];

	// ---------- 3) Trend: S-curve แผนสะสมรายสัปดาห์ + ผลจริงวันนี้ ----------
	const starts = tasks.map((t) => t.startDate ?? t.dueDate).filter(Boolean).sort() as string[];
	const dues = tasks.map((t) => t.dueDate).filter(Boolean).sort() as string[];
	const first = utc(starts[0] ?? today);
	const lastDue = utc(dues.at(-1) ?? today) + DAY;
	const weeks: { date: string; plan: number }[] = [];
	for (let ms = first; ms < lastDue + 7 * DAY; ms += 7 * DAY) {
		weeks.push({ date: isoOf(Math.min(ms, lastDue - DAY)), plan: progressVsPlan(tasks, Math.min(ms, lastDue)).plan ?? 0 });
	}
	const trend = { weeks, today, actual: pv.actual ?? 0, plan: pv.plan ?? 0 };

	// ---------- 4) Analysis: รายคน ----------
	const horizon = utc(today) + 14 * DAY;
	const people = lk.users
		.filter((u) => u.active && u.username !== 'admin')
		.map((u) => {
			const ts = tasks.filter((t) => t.assigneeId === u.id);
			const mine = ts.filter((t) => t.status !== 'done');
			const v = progressVsPlan(ts, nowMs);
			return {
				id: u.id,
				name: u.name,
				total: ts.length,
				open: mine.length,
				done: ts.length - mine.length,
				overdue: ts.filter((t) => state.get(t.id) === 'overdue').length,
				actual: v.actual ?? 0,
				plan: v.plan ?? 0,
				level: gapLevel(v.actual, v.plan),
				remaining: round(
					sumBy(
						mine.filter((t) => !t.dueDate || utc(t.dueDate) <= horizon),
						(t) => t.estimatedHours * (1 - t.progress / 100)
					)
				)
			};
		})
		.sort((a, b) => b.overdue - a.overdue || a.actual - a.plan - (b.actual - b.plan));

	// ---------- 5) Alert เรียงตามความรุนแรง + 6) Action มีเจ้าของและวันกำหนด ----------
	const PRI = { high: 3, medium: 2, low: 1 } as const;
	const alerts = [...overdue, ...tasks.filter((t) => state.get(t.id) === 'soon' && t.progress < 70)]
		.map((t) => {
			const days = daysUntil(t.dueDate, today) ?? 0;
			const late = state.get(t.id) === 'overdue';
			return {
				id: t.id,
				code: t.code,
				title: t.title,
				projectName: t.projectName,
				assigneeName: t.assigneeName,
				dueDate: t.dueDate,
				progress: t.progress,
				priority: t.priority,
				level: (late ? 'bad' : 'warn') as Level,
				age: late ? `เลยกำหนด ${-days} วัน` : days === 0 ? 'ครบกำหนดวันนี้' : `เหลือ ${days} วัน`,
				score: (late ? 1000 - days : 500 - days) * 10 + PRI[t.priority]
			};
		})
		.sort((a, b) => b.score - a.score);

	const overloaded = people.filter((p) => p.remaining > TARGETS.workload.warn);
	const unassigned = open.filter((t) => !t.assigneeId).length;
	const soonLow = alerts.filter((a) => a.level === 'warn').length;
	const kri = [
		{
			title: 'งานใกล้ครบกำหนด (≤ 3 วัน) แต่คืบหน้าไม่ถึง 70%',
			value: soonLow,
			level: (soonLow ? 'warn' : 'ok') as Level,
			detail: soonLow ? 'อยู่ในแผงแจ้งเตือนด้านข้าง' : 'ไม่มีสัญญาณเสี่ยง'
		},
		{
			title: `ภาระงานคงเหลือเกิน ${TARGETS.workload.warn} ชม. ใน 14 วัน`,
			value: overloaded.length,
			level: (overloaded.length ? 'warn' : 'ok') as Level,
			detail: overloaded.length ? overloaded.map((p) => `${p.name} ${p.remaining} ชม.`).join(' · ') : 'ไม่มีสัญญาณเสี่ยง'
		},
		{
			title: 'งานค้างที่ไม่มีผู้รับผิดชอบ',
			value: unassigned,
			level: (unassigned ? 'bad' : 'ok') as Level,
			detail: unassigned ? 'มอบหมายผู้รับผิดชอบที่หน้ารายการงาน' : 'ทุกงานมีเจ้าของ'
		}
	];

	return {
		today,
		lastUpdated: Math.max(last?.at ?? 0, recent[0]?.createdAt ?? 0),
		taskCount: tasks.length,
		process,
		kpis,
		trend,
		projects,
		people,
		alerts,
		kri,
		recent,
		userNames: lk.userNames
	};
};
