import { describe, it, expect } from 'vitest';
import { getNoteDetailUrl } from '$lib/utils/note-utils';
import type { Note } from '$lib/types';
import { generateSlug } from '$lib/utils/slug';

describe('MemoCard', () => {
	it('should generate correct URL for English title', () => {
		const note = {
			id: 'test-id',
			title: 'Test Note',
			content: 'Test content',
			createdAt: new Date(),
			updatedAt: new Date(),
			isPublic: false,
			userId: 'test-user-id'
		} as Note;

		const expectedUrl = `/notes/${note.id}/${generateSlug(note.title)}`;
		expect(getNoteDetailUrl(note, 'test-user')).toBe(expectedUrl);
	});

	it('should generate correct URL for Japanese title', () => {
		const note = {
			id: 'test-id',
			title: 'テストノート',
			content: 'テストコンテンツ',
			createdAt: new Date(),
			updatedAt: new Date(),
			isPublic: false,
			userId: 'test-user-id'
		} as Note;

		const expectedUrl = `/notes/${note.id}/${generateSlug(note.title)}`;
		expect(getNoteDetailUrl(note, 'test-user')).toBe(expectedUrl);
	});

	it('should generate correct URL for empty title', () => {
		const note = {
			id: 'test-id',
			title: '',
			content: 'Test content',
			createdAt: new Date(),
			updatedAt: new Date(),
			isPublic: false,
			userId: 'test-user-id'
		} as Note;

		const expectedUrl = `/notes/${note.id}/${generateSlug(note.title)}`;
		expect(getNoteDetailUrl(note, 'test-user')).toBe(expectedUrl);
	});
});
