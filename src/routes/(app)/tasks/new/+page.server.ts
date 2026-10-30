import { fail, redirect } from '@sveltejs/kit';
import { lookups } from '#lib/server/queries.js';
import { TaskError, createTask, patchFromForm } from '#lib/server/tasks.js';
import { todayISO } from '#lib/labels.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const lk = await lookups();
	return {
		users: lk.users.filter((u) => u.active && u.username !== 'admin'),
		projects: lk.projects.filter((p) => p.status === 'active'),
		defaults: { projectId: Number(url.searchParams.get('project')) || undefined, startDate: todayISO() }
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		let task;
		try {
			task = await createTask(locals.user!, patchFromForm(await request.formData()));
		} catch (e) {
			if (e instanceof TaskError) return fail(e.status, { message: e.message });
			throw e;
		}
		redirect(303, `/tasks/${task.id}`);
	}
};
