/**
 * Escapes special characters in a string to prevent HTML injection.
 */
export function escapeHtml(value: string): string {
	if (!value) return '';
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/**
 * Basic HTML sanitizer that uses a whitelist approach.
 * Note: For production use with complex HTML, a library like DOMPurify is recommended.
 * This implementation is a lightweight alternative for environments where external libs are restricted.
 */
export function sanitizeHtml(html: string): string {
	if (!html) return '';

	// 1. Decode common HTML entities (numeric and hex) to catch bypass attempts like <a href="&#106;avascript:...">
	let decoded = html
		.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
		.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

	// 2. Remove script tags and their content
	decoded = decoded.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

	// 3. Remove on* event handlers
	decoded = decoded.replace(/\son[a-z]+\s*=\s*(["'])(?:(?!\1).)*\1/gi, '');
	decoded = decoded.replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '');

	// 4. Sanitize dangerous protocols in href/src
	const dangerousProtocols = /^(?:javascript|data|vbscript|file):/i;

	const allowedTags = [
		'p', 'br', 'b', 'i', 'strong', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
		'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'img', 'span', 'div',
		'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'input', 'label',
		'button', 'del', 's', 'sub', 'sup'
	];

	// We'll use a regex to find all tags and their attributes
	return decoded.replace(/<(\/?)([a-z0-9]+)([^>]*)>/gi, (match, slash, tag, attrs) => {
		const tagName = tag.toLowerCase();

		if (!allowedTags.includes(tagName)) {
			return ''; // Strip non-whitelisted tags
		}

		// Reconstruct tag with sanitized attributes
		if (slash) return `</${tagName}>`;

		const sanitizedAttrs: string[] = [];
		// Improved attribute regex to handle various spacing and quotes
		const attrRegex = /([a-z0-9-]+)\s*=\s*(["'])(.*?)\2/gi;
		let attrMatch;

		const allowedAttrs = [
			'href', 'src', 'alt', 'title', 'class', 'style', 'target', 'rel',
			'width', 'height', 'type', 'checked', 'disabled', 'data-wiki-link', 'data-type', 'data-checked'
		];

		while ((attrMatch = attrRegex.exec(attrs)) !== null) {
			const name = attrMatch[1].toLowerCase();
			const value = attrMatch[3];

			if (allowedAttrs.includes(name) || name.startsWith('data-')) {
				if ((name === 'href' || name === 'src') && dangerousProtocols.test(value.trim())) {
					continue;
				}
				sanitizedAttrs.push(`${name}="${value}"`);
			}
		}

		// Handle boolean attributes
		const booleanAttrs = ['checked', 'disabled', 'readonly', 'required'];
		for (const attr of booleanAttrs) {
			const reg = new RegExp(`\\s${attr}(\\s|$)`, 'i');
			if (reg.test(attrs) && !sanitizedAttrs.some(a => a.startsWith(attr + '='))) {
				sanitizedAttrs.push(attr);
			}
		}

		const attrString = sanitizedAttrs.join(' ');
		return `<${tagName}${attrString ? ' ' + attrString : ''}>`;
	});
}
