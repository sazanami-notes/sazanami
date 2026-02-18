import { describe, it, expect, vi } from 'vitest';
import { GET } from '../../../../../src/routes/api/notes/+server';

vi.mock('$lib/server/auth', () => ({
	auth: {
		api: {
			getSession: vi.fn().mockResolvedValue(null)
		}
	}
}));

vi.mock('$lib/server/db', () => ({
	db: {},
	updateNoteLinks: vi.fn()
}));

vi.mock('$lib/server/db/schema', () => ({
	notes: {},
	tags: {},
	noteTags: {},
	timeline: {}
}));

describe('GET /api/notes', () => {
	it('should not log sensitive session data', async () => {
		const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

		const request = {
			headers: new Headers()
		};
		const url = new URL('http://localhost/api/notes');

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		await GET({ request, url } as any);

		// Should not verify console.log is called at all in this path
		expect(consoleSpy).not.toHaveBeenCalled();

		consoleSpy.mockRestore();
	});
});
