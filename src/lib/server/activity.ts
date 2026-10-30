import { db, schema } from './db';

export type Changes = Record<string, { from: unknown; to: unknown }>;

export async function logActivity(entry: {
	userId: number | null;
	entityType: schema.ActivityLog['entityType'];
	entityId?: number | null;
	entityLabel?: string | null;
	action: schema.ActivityLog['action'];
	changes?: Changes | null;
}) {
	await db.insert(schema.activityLogs).values({
		...entry,
		changes: entry.changes && Object.keys(entry.changes).length ? JSON.stringify(entry.changes) : null,
		createdAt: Date.now()
	});
}

/** เทียบค่าเดิมกับค่าใหม่ เฉพาะฟิลด์ที่ระบุใน patch */
export function diff<T extends Record<string, unknown>>(before: T, patch: Partial<T>): Changes {
	const out: Changes = {};
	for (const [k, v] of Object.entries(patch)) {
		if (v === undefined) continue;
		const prev = before[k] ?? null;
		if ((prev ?? null) !== (v ?? null)) out[k] = { from: prev, to: v ?? null };
	}
	return out;
}
