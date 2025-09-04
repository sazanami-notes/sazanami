import type { User, Session, Note as GlobalNote } from '$lib/types';

export type Note = GlobalNote & {
	isPinned: boolean | null;
};

export type PageData = {
	notes: Note[];
	user: User;
	session: Session;
};
