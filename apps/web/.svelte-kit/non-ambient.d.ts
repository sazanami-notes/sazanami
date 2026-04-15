
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	type MatcherParam<M> = M extends (param : string) => param is (infer U extends string) ? U : string;

	export interface AppTypes {
		RouteId(): "/" | "/api" | "/api/attachments" | "/api/notes" | "/api/notes/embed" | "/api/notes/import" | "/api/notes/resolve-link" | "/api/notes/suggestions" | "/api/notes/[id]" | "/api/notes/[id]/links" | "/api/notes/[id]/pin" | "/api/notes/[id]/status" | "/home" | "/home/archive" | "/home/box" | "/home/box/archived" | "/home/box/deleted" | "/home/media" | "/home/note" | "/home/note/new" | "/home/note/[id]" | "/home/search" | "/home/tasklist" | "/home/trash" | "/login" | "/login/two-factor" | "/reset-password" | "/settings" | "/settings/account" | "/settings/appearance" | "/settings/import" | "/[username]" | "/[username]/edit";
		RouteParams(): {
			"/api/notes/[id]": { id: string };
			"/api/notes/[id]/links": { id: string };
			"/api/notes/[id]/pin": { id: string };
			"/api/notes/[id]/status": { id: string };
			"/home/note/[id]": { id: string };
			"/[username]": { username: string };
			"/[username]/edit": { username: string }
		};
		LayoutParams(): {
			"/": { id?: string; username?: string };
			"/api": { id?: string };
			"/api/attachments": Record<string, never>;
			"/api/notes": { id?: string };
			"/api/notes/embed": Record<string, never>;
			"/api/notes/import": Record<string, never>;
			"/api/notes/resolve-link": Record<string, never>;
			"/api/notes/suggestions": Record<string, never>;
			"/api/notes/[id]": { id: string };
			"/api/notes/[id]/links": { id: string };
			"/api/notes/[id]/pin": { id: string };
			"/api/notes/[id]/status": { id: string };
			"/home": { id?: string };
			"/home/archive": Record<string, never>;
			"/home/box": Record<string, never>;
			"/home/box/archived": Record<string, never>;
			"/home/box/deleted": Record<string, never>;
			"/home/media": Record<string, never>;
			"/home/note": { id?: string };
			"/home/note/new": Record<string, never>;
			"/home/note/[id]": { id: string };
			"/home/search": Record<string, never>;
			"/home/tasklist": Record<string, never>;
			"/home/trash": Record<string, never>;
			"/login": Record<string, never>;
			"/login/two-factor": Record<string, never>;
			"/reset-password": Record<string, never>;
			"/settings": Record<string, never>;
			"/settings/account": Record<string, never>;
			"/settings/appearance": Record<string, never>;
			"/settings/import": Record<string, never>;
			"/[username]": { username: string };
			"/[username]/edit": { username: string }
		};
		Pathname(): "/" | "/api/attachments" | "/api/notes" | "/api/notes/embed" | "/api/notes/import" | "/api/notes/resolve-link" | "/api/notes/suggestions" | `/api/notes/${string}` & {} | `/api/notes/${string}/links` & {} | `/api/notes/${string}/pin` & {} | `/api/notes/${string}/status` & {} | "/home" | "/home/archive" | "/home/box" | "/home/box/archived" | "/home/box/deleted" | "/home/media" | "/home/note/new" | `/home/note/${string}` & {} | "/home/search" | "/home/tasklist" | "/home/trash" | "/login" | "/login/two-factor" | "/reset-password" | "/settings/account" | "/settings/appearance" | "/settings/import" | `/${string}` & {} | `/${string}/edit` & {};
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/favicon.png" | "/manifest.json" | "/sazanami-icon-H185-dark-192x192.png" | "/sazanami-icon-H185-dark-48x48.png" | "/sazanami-icon-H185-dark-512x512.png" | "/sazanami-loop.mp3" | string & {};
	}
}