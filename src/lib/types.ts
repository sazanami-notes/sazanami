export interface Note {
	id: string;
	userId: string;
	title: string;
	slug: string;
	content: string | null;
	createdAt: Date;
	updatedAt: Date;
	isPublic: boolean;
	tags: string[];
}

export interface Pagination {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

export interface NotesResponse {
	notes: Note[];
	pagination: Pagination;
}

export interface ResolvedLink {
	id: string;
	title: string;
	slug: string;
}