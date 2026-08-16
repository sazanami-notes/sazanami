// src/lib/server/db/note-list.ts
// ノート一覧（タイムライン・検索・タスクリスト・アーカイブ・ゴミ箱）で共通の
// select列定義。カラム追加時はここを更新すれば全一覧に反映される
// （resolvedLinks欠落のように、一覧でWikiLinkが解決されない事故を防ぐ）。

import { sql } from 'drizzle-orm';
import { notes, tags } from './schema';

export const noteListSelect = {
	id: notes.id,
	title: notes.title,
	content: notes.content,
	updatedAt: notes.updatedAt,
	isPinned: notes.isPinned,
	userId: notes.userId,
	createdAt: notes.createdAt,
	isPublic: notes.isPublic,
	slug: notes.slug,
	status: notes.status,
	resolvedLinks: notes.resolvedLinks,
	tags: sql<string>`GROUP_CONCAT(${tags.name})`.as('tags')
} as const;
