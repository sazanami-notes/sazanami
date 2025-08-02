# Sazanami

MarkdownでかけるScrapBoxを基本コンセプトとしたノートテイキングアプリです。

- [Figma](https://www.figma.com/design/GmQwVZtxtMtLhujgtrmGYl/sazanami?node-id=0-1&t=isQ1ILUFBDQy9zg5-1)

> [!WARNING]
> Ver1.0.0までは破壊的変更を頻繁に行います。

## 概要

Sazanamiの思想・構想などなど

kilocodeのMemory Bankに入れてます。
- **[brief.md](.kilocode/rules/memory-bank/brief.md)**

## Getting Started

### 前提条件

- Node.js (推奨: 最新のLTS版)
- npm

### インストール

```bash
npm install
```

### 開発サーバーの起動

```bash
npm run dev
```

開発サーバーが起動したら、ブラウザで `http://localhost:5173` にアクセスしてください。

## 開発

### よく使用するコマンド

```bash
# 開発サーバーの起動
npm run dev

# ビルド
npm run build

# プレビュー
npm run preview

# コードフォーマット
npm run format

# リント
npm run lint

# テスト実行
npm run test

# データベース関連
npm run db:generate  # スキーマ生成
npm run db:migrate   # マイグレーション実行
npm run db:studio    # Drizzle Studio起動
```


## ドキュメント

このプロジェクトに関する詳細な情報は、以下のドキュメントを参照してください。

- **[プロジェクト概要](.kilocode/rules/memory-bank/product.md)**: プロジェクトの目的、技術スタック、実装状況について説明します。
- **[アーキテクチャ](.kilocode/rules/memory-bank/architecture.md)**: プロジェクトの構造、コンポーネント、データフローについて解説します。
- **[開発セットアップ](.kilocode/rules/memory-bank/setup.md)**: ローカルで開発環境を構築するための手順を案内します。
- **[コーディング規約](.kilocode/rules/memory-bank/tech.md)**: コードの一貫性を保つためのルールを定めています。
- **[API仕様](.kilocode/rules/memory-bank/api.md)**: アプリケーションが提供するAPIのエンドポイントについて説明します。
- **[テスト戦略](.kilocode/rules/memory-bank/testing.md)**: ユニットテスト、インテグレーションテスト、E2Eテストの方針について説明します。
- **[デプロイ手順](.kilocode/rules/memory-bank/deployment.md)**: Cloudflare Pagesへのデプロイ方法を解説します。