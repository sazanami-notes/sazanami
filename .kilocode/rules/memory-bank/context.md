# コンテキスト (Context)

## 現在のフォーカス

SazanamiアプリケーションのWikiリンク機能の実装と最適化に取り組んでいます。特に、[[Wikiリンク]]表記のサポートと、リンク解決APIの精度向上に注力しています。

## 最近の変更

- **`src/routes/api/notes/resolve-link/+server.ts`**: Wikiリンク解決APIの実装。タイトルの完全一致→部分一致→最新更新順の優先順位でノートを検索するロジックを実装
- **`src/lib/milkdown/wiki-link-plugin.ts`**: MilkdownエディタにWikiリンク機能を追加。remark-wiki-linkプラグインを統合
- **`tests/integration/resolve-link.test.ts`**: Wikiリンク解決APIの統合テストを追加。日本語タイトルや重複タイトルのケースをカバー
- **`src/lib/utils/slug.ts`**: スラッグ生成ロジックを改善し、Unicode文字や特殊文字に対応

## 次のステップ

- Wikiリンクのクリック時に適切なノートページに遷移するフロントエンド実装
- リンク先ノートが存在しない場合の新規作成フローの実装
- Wikiリンクのグラフビュー表示機能の検討
- モバイルデバイスでのWikiリンク操作の最適化
