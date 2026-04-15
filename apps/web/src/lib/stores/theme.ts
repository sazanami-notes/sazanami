import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const defaultTheme = 'sazanami-days';
const darkTheme = 'sazanami-night';

// Get the initial theme from local storage or system preference
const getInitialTheme = () => {
	if (!browser) {
		return defaultTheme;
	}

	const storedTheme = localStorage.getItem('theme');
	if (storedTheme) {
		return storedTheme;
	}

	const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
	return prefersDark ? darkTheme : defaultTheme;
};

export const theme = writable<string>(getInitialTheme());

// Update local storage when the theme changes
if (browser) {
	theme.subscribe((value) => {
		localStorage.setItem('theme', value);
	});
}
