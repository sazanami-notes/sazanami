import { redirect } from '@sveltejs/kit';

export const load = async ({ parent }: { parent: () => Promise<{ session: any; user: any }> }) => {
	const { session, user } = await parent();
	if (session && user?.name) {
		throw redirect(302, `/${user.name}`);
	}
	// ログインしていないユーザーのために、簡単なランディングページ情報を返す
	return {
		landing: {
			title: 'Sazanami - あなたの知識をつなげるメモアプリ',
			description:
				'Markdownで書けるScrapbox風のメモアプリです。双方向リンク、タグ、SNSライクなメモ機能を備えています。',
			features: ['Markdownで書ける', '双方向リンク', 'タグ管理', 'SNSライクなメモ機能']
		}
	};
};
