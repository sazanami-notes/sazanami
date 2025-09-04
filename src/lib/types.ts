export interface BoxNote {
	id: string;
	userId: string;
	title: string;
	slug: string;
	content: string | null;
	createdAt: Date;
	updatedAt: Date;
	tags?: string[];
}

export interface TimelinePost {
	id: string;
	userId: string;
	content: string;
	createdAt: Date;
	updatedAt: Date;
	isPinned: boolean;
	status: string;
}

export interface User {
	id: string;
	email: string;
	username: string;
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