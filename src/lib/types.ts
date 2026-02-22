export interface Note {
	id: string;
	userId: string;
	title: string;
	content: string;
	createdAt: Date;
	updatedAt: Date;
	isPublic: boolean;
	isPinned: boolean;
	status: string; // 'inbox' | 'box' | 'archived' | 'trash'
	tags: string[];
	slug: string;
}

export interface User {
	id: string;
	email: string;
	name: string;
	username?: string; // Optional or deprecated in favor of name
	image?: string | null;
	emailVerified: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface Session {
	id: string;
	userId: string;
	expiresAt: Date;
	createdAt: Date;
	updatedAt: Date;
	token: string;
	ipAddress?: string | null;
	userAgent?: string | null;
}
