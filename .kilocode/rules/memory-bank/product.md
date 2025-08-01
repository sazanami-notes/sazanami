# プロダクト: Sazanami

## 基本コンセプト

Sazanamiは「Markdownで書けるScrapbox」を基本コンセプトとしたノートテイキングアプリです。現在はVer.0.1.0ラインの開発中で、まずはおひとり様で使えるScrapboxのようなツールを作ることを目標としています。

## 解決したい課題

このプロジェクトは、Obsidian、Notion、Scrapboxといった人気のアプリケーションがそれぞれ抱える問題を解決し、単一の優れたソリューションを創造しようとするものです。

- **Obsidian:** カジュアルなユーザーには複雑すぎることがあり、グラフビューが乱雑になりがち。また同期が有料で価格が高い。
- **Notion:** 素早いメモ取りには動作が遅く、構造化されすぎていることがある。
- **Scrapbox:** 自由なリンク作成には優れているが、他のツールのような構造や機能が不足しており、独自のフォーマットが懸念点。

Sazanamiは、ScrapboxをMarkdownベースにした上で、Google KeepやThinoのような高速な思考を補助するツールも結合することを目的とします。

## 主要機能

- **Markdownファースト:** すべてのノートはMarkdownで記述され、ポータビリティと使い慣れた編集体験を保証します。
- **SNSライクなメモ機能:** ObsidianのThinoプラグインに触発された、タイムライン形式で素早くアイデアを書き留める機能。
- **ビジュアルな整理:** Google Keepのようにノートを視覚的に整理し、より直感的なアイデアの配置を可能にします。
- **双方向リンク:** ノート間に簡単にリンクを作成し、パーソナルな知識グラフを構築します。
- **タグシステム:** タグを使ってノートを整理し、フィルタリングや発見を容易にします。
- **リマインダー機能:** 特定のノートにリマインダーを設定します。
- **添付ファイル:** ノートにファイルや画像を追加します。

## ユーザー体験の目標

- **シンプルさ:** インターフェースはクリーンで直感的であり、ユーザーが思考に集中できるようなデザイン。
- **スピード:** アプリケーションは、特に素早いメモをキャプチャする際に、高速で応答性が高いこと。
- **柔軟性:** ユーザーがリンク、タグ、または視覚的なレイアウトを通じて、自分にとって意味のある方法でノートを整理できること。
- **所有権:** Markdownファイルを使用することで、ユーザーは常に自分のデータを管理できます。
- **モバイルファースト:** UIはモバイルデバイスでの利用を最優先に設計・実装すること。

## 現在の実装状況 (v0.1.0時点)
- **ノート一覧表示:** 検索、タグフィルター、ページネーションを含むノート一覧機能。UIには`MemoCard.svelte`コンポーネントを利用。
- **新規ノート作成:** Milkdownエディタを使用したノート作成機能。
- **ノート詳細表示:** 指定されたIDのノートの内容をMarkdownからHTMLに変換して表示。
- **ノート削除:** ノート詳細表示ページからノートを削除。
- **API:** ノートの取得、作成、詳細取得、更新、削除を行う基本的なAPIエンドポイント。
- **データベース:** ノート、タグ、ユーザー認証などを含む基本的なスキーマ。