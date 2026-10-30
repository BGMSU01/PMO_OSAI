import { error, fail, redirect } from '@sveltejs/kit';
import { and, desc, eq } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.js';
import { lookups, taskList } from '#lib/server/queries.js';
import {
	TaskError,
	canEditTask,
	deleteTask,
	patchFromForm,
	restoreTask,
	revertActivity,
	updateTask
} from '#lib/server/tasks.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const id = Number(params.id);
	const [task] = (await taskList({ withDeleted: true })).filter((t) => t.id === id);
	if (!task) error(404, 'ไม่พบงานนี้');
	const [lk, history] = await Promise.all([
		lookups(),
		db
			.select()
			.from(schema.activityLogs)
			.where(and(eq(schema.activityLogs.entityType, 'task'), eq(schema.activityLogs.entityId, id)))
			.orderBy(desc(schema.activityLogs.id))
	]);
	return {
		task,
		canEdit: !task.deletedAt && canEditTask(locals.user!, task),
		history,
		users: lk.users.filter((u) => u.active && u.username !== 'admin'),
		projects: lk.projects,
		userNames: lk.userNames,
		projectNames: lk.projectNames
	};
};

const handle = async (fn: () => Promise<unknown>) => {
	try {
		await fn();
	} catch (e) {
		if (e instanceof TaskError) return fail(e.status, { message: e.message });
		throw e;
	}
	return { saved: true };
};

export const actions: Actions = {
	update: async ({ request, params, locals }) => {
		const form = await request.formData();
		return handle(() =>
			updateTask(locals.user!, Number(params.id), patchFromForm(form), {
				expectedVersion: Number(form.get('version'))
			})
		);
	},
	revert: async ({ request, locals }) => {
		const form = await request.formData();
		return handle(() => revertActivity(locals.user!, Number(form.get('logId'))));
	},
	restore: async ({ params, locals }) => handle(() => restoreTask(locals.user!, Number(params.id))),
	delete: async ({ params, locals }) => {
		const res = await handle(() => deleteTask(locals.user!, Number(params.id)));
		if ('saved' in res) redirect(303, '/tasks');
		return res;
	}
};
