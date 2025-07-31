import { error } from '@sveltejs/kit';
import { getNoteById } from '$lib/server/db';
import { auth } from '$lib/server/auth'; // 'auth' をインポート

/** @type {import('./$types').PageServerLoad} */
export async function load({ params, request }) { // request を追加
  const noteId = params.id;

  const session = await auth.api.getSession({ headers: request.headers }); // セッションを取得
  if (!session) {
    error(401, 'Unauthorized'); // セッションがない場合は401エラー
  }

  // getNoteById に userId を渡す
  const note = await getNoteById(noteId, session.session.userId);

  if (!note) {
    error(404, 'Note not found');
  }

  return {
    note: {
      ...note,
      content: note.content // Markdown形式のコンテンツをそのまま返す
    },
    // セッション情報全体は渡さない (必要であればAPI経由で取得)
  };
}