import type { RequestHandler } from '@sveltejs/kit';

export interface Params {
	id: string;
}

export type GET = RequestHandler;
export type POST = RequestHandler;
export type PUT = RequestHandler;
export type DELETE = RequestHandler;