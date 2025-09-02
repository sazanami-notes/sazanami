import type { PageServerLoad as SvelteKitPageServerLoad } from '@sveltejs/kit';
import type { User, Session } from 'lucia-auth';

// From the load function in +page.server.ts
export type TimelineEvent = {
    id: string;
    type: string;
    createdAt: Date;
    metadata: string | null;
    note: {
        id: string | null;
        title: string | null;
        slug: string | null;
    } | null;
};

export type PageData = {
    timelineEvents: TimelineEvent[];
    user: User;
	session: Session;
};

export type PageServerLoad = SvelteKitPageServerLoad<PageData>;
