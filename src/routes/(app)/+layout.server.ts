import { requireUser } from '#lib/server/auth.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = (event) => ({ user: requireUser(event) });
