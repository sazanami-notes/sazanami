import { db } from '$lib/server/db/connection';
import { error } from '@sveltejs/kit';

export const actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) {
			throw error(401, 'Unauthorized');
		}

		const formData = await request.formData();
		const title = formData.get('title')?.toString() || 'Untitled Note';
		const content = formData.get('content')?.toString() || '';
		const isPublic = formData.get('isPublic') === 'on';

		// Create note logic would go here

		return { success: true };
	}
};
