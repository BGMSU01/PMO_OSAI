import { fail } from '@sveltejs/kit';
import { lookups, taskList } from '#lib/server/queries.js';
import { TaskError, updateTask } from '#lib/server/tasks.js';
import { STATUSES, type Status } from '#lib/labels.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
	const user = locals.user!;
	// ค่าเริ่มต้น: พนักงานเห็นงานตัวเอง, Admin เห็นทั้งหมด
	const assignee = url.searchParams.get('assignee') ?? (user.role === 'admin' ? 'all' : 'me');
	const project = url.searchParams.get('project') ?? 'all';
	const assigneeId = assignee === 'me' ? user.id : assignee === 'all' ? null : Number(assignee);

	const [tasks, lk] = await Promise.all([taskList(), lookups()]);
	const filtered = tasks.filter(
		(t) =>
			(assigneeId === null || t.assigneeId === assigneeId) &&
			(project === 'all' || t.projectId === Number(project))
	);
	return {
		tasks: filtered,
		filters: { assignee, project },
		users: lk.users.filter((u) => u.active && u.username !== 'admin'),
		projects: lk.projects
	};
};

export const actions: Actions = {
	move: async ({ request, locals }) => {
		const form = await request.formData();
		const status = String(form.get('status')) as Status;
		if (!STATUSES.includes(status)) return fail(400, { message: 'สถานะไม่ถูกต้อง' });
		try {
			await updateTask(locals.user!, Number(form.get('id')), { status }, { expectedVersion: Number(form.get('version')) });
		} catch (e) {
			if (e instanceof TaskError) return fail(e.status, { message: e.message });
			throw e;
		}
	}
};
