import { describe, it, expect } from 'vitest';
import { generateSlug } from '$lib/utils/slug';

describe('generateSlug', () => {
	it('should generate a slug for a simple English title', () => {
		expect(generateSlug('Hello World')).toBe('hello-world');
	});

	it('should remove Japanese characters', () => {
		expect(generateSlug('日本語のタイトル')).toBe(''); // 日本語は除去される
		expect(generateSlug('吾輩は猫である')).toBe('');
		expect(generateSlug('あいうえお')).toBe('');
		expect(generateSlug('アイウエオ')).toBe('');
	});

	it('should replace spaces with hyphens', () => {
		expect(generateSlug('  leading and trailing spaces  ')).toBe('leading-and-trailing-spaces');
		expect(generateSlug('multiple   spaces')).toBe('multiple-spaces');
	});

	it('should remove special characters except hyphens', () => {
		expect(generateSlug('Title!@#$%^&*()_+=[]{}|;:\'",.<>/?`~')).toBe('title');
		expect(generateSlug('Title-with-hyphens')).toBe('title-with-hyphens');
	});

	it('should convert full-width alphanumeric and symbols to half-width', () => {
		expect(
			generateSlug(
				'ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ０１２３４５６７８９'
			)
		).toBe('abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz0123456789');
		expect(generateSlug('！＠＃＄％＾＆＊（）＿＋＝―')).toBe(''); // 全角記号は半角に変換後、除去される
	});

	it('should handle mixed characters', () => {
		expect(generateSlug('日本語 Title with 数字 123 and !@#$')).toBe('title-with-123-and'); // 日本語は除去される
		expect(generateSlug('Sazanami ノートアプリ')).toBe('sazanami'); // 日本語は除去される
	});

	it('should remove leading/trailing hyphens', () => {
		expect(generateSlug('-start-end-')).toBe('start-end');
		expect(generateSlug('---start-end---')).toBe('start-end');
	});

	it('should handle empty string', () => {
		expect(generateSlug('')).toBe('');
	});

	it('should handle string with only spaces', () => {
		expect(generateSlug('   ')).toBe('');
	});

	it('should handle string with only special characters', () => {
		expect(generateSlug('!@#$%^&*')).toBe('');
	});

	it('should handle string with only full-width spaces', () => {
		expect(generateSlug('　　　')).toBe('');
	});

	it('should handle string with mixed case and spaces', () => {
		expect(generateSlug('My Awesome New Note')).toBe('my-awesome-new-note');
	});

	it('should handle string with underscores', () => {
		expect(generateSlug('title_with_underscores')).toBe('title-with-underscores');
	});

	it('should handle string with consecutive hyphens', () => {
		expect(generateSlug('title--with---consecutive----hyphens')).toBe(
			'title-with-consecutive-hyphens'
		);
	});
});
