import { lookups, taskList } from '#lib/server/queries.js';
import { dueState, todayISO } from '#lib/labels.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
	const f = {
		q: url.searchParams.get('q') ?? '',
		assignee: url.searchParams.get('assignee') ?? 'all',
		project: url.searchParams.get('project') ?? 'all',
		status: url.searchParams.get('status') ?? 'all'
	};
	const [tasks, lk] = await Promise.all([taskList(), lookups()]);
	const today = todayISO();
	const q = f.q.trim().toLowerCase();
	const assigneeId = f.assignee === 'me' ? locals.user!.id : Number(f.assignee);

	const rows = tasks.filter((t) => {
		if (q && !`${t.code} ${t.title} ${t.note ?? ''}`.toLowerCase().includes(q)) return false;
		if (f.assignee !== 'all' && t.assigneeId !== assigneeId) return false;
		if (f.project !== 'all' && t.projectId !== Number(f.project)) return false;
		if (f.status === 'overdue') return dueState(t, today) === 'overdue';
		if (f.status !== 'all' && t.status !== f.status) return false;
		return true;
	});
	return { rows, filters: f, users: lk.users, projects: lk.projects };
};
