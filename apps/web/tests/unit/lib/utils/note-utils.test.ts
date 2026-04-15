import { describe, it, expect } from 'vitest';
import { extractWikiLinks } from '../../../../src/lib/utils/note-utils';

describe('extractWikiLinks', () => {
	it('should extract a single wiki link', () => {
		const content = 'This is a test with a [[Wiki Link]].';
		expect(extractWikiLinks(content)).toEqual(['Wiki Link']);
	});

	it('should extract multiple wiki links', () => {
		const content = 'Here are [[First Link]] and [[Second Link]].';
		expect(extractWikiLinks(content)).toEqual(['First Link', 'Second Link']);
	});

	it('should return an empty array if no links are present', () => {
		const content = 'This is plain text with no links.';
		expect(extractWikiLinks(content)).toEqual([]);
	});

	it('should handle empty content', () => {
		const content = '';
		expect(extractWikiLinks(content)).toEqual([]);
	});

	it('should handle null or undefined content', () => {
		expect(extractWikiLinks(null)).toEqual([]);
		expect(extractWikiLinks(undefined)).toEqual([]);
	});

	it('should extract links with special characters', () => {
		const content = 'A link with [[Special Chars: 123!@#$]].';
		expect(extractWikiLinks(content)).toEqual(['Special Chars: 123!@#$']);
	});

	it('should handle links adjacent to each other', () => {
		const content = 'Adjacent links [[Link1]][[Link2]].';
		expect(extractWikiLinks(content)).toEqual(['Link1', 'Link2']);
	});

	it('should handle multiline content', () => {
		const content = `
      This is a multiline note.
      Here is a [[Multi-line Link]].
      And another one [[Down Here]].
    `;
		expect(extractWikiLinks(content)).toEqual(['Multi-line Link', 'Down Here']);
	});
});
