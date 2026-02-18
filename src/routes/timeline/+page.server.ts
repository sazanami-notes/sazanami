import { redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import type { ServerLoad } from '@sveltejs/kit';
import { ulid } from 'ulid';

export const load: ServerLoad = async ({ request }) => {
	const sessionData = await auth.api.getSession({
		headers: request.headers
	});

	if (!sessionData?.session) {
		throw redirect(302, '/login');
	}

	// Mock data for the timeline
	const mockUser = sessionData.user;

	// Sample 1: Plain text note with tags, pinned
	const note1 = {
		id: ulid(),
		userId: mockUser.id,
		title: 'Design Thoughts',
		content:
			'Figmaのチュートリアルとかやってる場合じゃなくてとっとと作り始めたほうがいいと思った。\n\n#design #ui',
		createdAt: new Date(),
		updatedAt: new Date(),
		isPublic: false,
		isPinned: true,
		status: 'inbox',
		tags: ['design', 'ui'],
		slug: 'design-thoughts',
		attachments: [],
		quotedNote: null
	};

	// Sample 2: Note with image attachments (2x2 grid)
	const note2 = {
		id: ulid(),
		userId: mockUser.id,
		title: 'Inspiration',
		content: 'UI design inspiration for the new timeline view.',
		createdAt: new Date(Date.now() - 3600000), // 1 hour ago
		updatedAt: new Date(Date.now() - 3600000),
		isPublic: false,
		isPinned: false,
		status: 'inbox',
		tags: ['inspiration'],
		slug: 'inspiration',
		attachments: [
			{ url: 'https://placehold.co/400x400/e2e8f0/94a3b8?text=Image+1', type: 'image' as const },
			{ url: 'https://placehold.co/400x400/e2e8f0/94a3b8?text=Image+2', type: 'image' as const },
			{ url: 'https://placehold.co/400x400/e2e8f0/94a3b8?text=Image+3', type: 'image' as const },
			{ url: 'https://placehold.co/400x400/e2e8f0/94a3b8?text=Image+4', type: 'image' as const }
		],
		quotedNote: null
	};

	// Sample 3: Note with a quoted note
	const quotedNoteData = {
		id: ulid(),
		userId: mockUser.id,
		title: 'Original Idea',
		content: 'We should really focus on mobile-first design for this app.',
		createdAt: new Date(Date.now() - 86400000), // 1 day ago
		updatedAt: new Date(Date.now() - 86400000),
		isPublic: false,
		isPinned: false,
		status: 'archived',
		tags: [],
		slug: 'original-idea'
	};

	const note3 = {
		id: ulid(),
		userId: mockUser.id,
		title: 'Re: Original Idea',
		content: 'Agreed. The timeline view is crucial for mobile interaction.',
		createdAt: new Date(Date.now() - 7200000), // 2 hours ago
		updatedAt: new Date(Date.now() - 7200000),
		isPublic: false,
		isPinned: false,
		status: 'inbox',
		tags: ['mobile', 'discussion'],
		slug: 're-original-idea',
		attachments: [],
		quotedNote: quotedNoteData
	};

	// Sample 4: Another text note
	const note4 = {
		id: ulid(),
		userId: mockUser.id,
		title: 'To Do',
		content: '- [ ] Implement timeline card\n- [ ] Fix layout issues\n- [ ] Add animations',
		createdAt: new Date(Date.now() - 10000000),
		updatedAt: new Date(Date.now() - 10000000),
		isPublic: false,
		isPinned: false,
		status: 'inbox',
		tags: ['todo'],
		slug: 'todo-list',
		attachments: [],
		quotedNote: null
	};

	const mockNotes = [note1, note2, note3, note4];

	return {
		notes: mockNotes,
		user: sessionData.user,
		session: sessionData.session
	};
};
