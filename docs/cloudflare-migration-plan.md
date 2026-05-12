# Sazanami Cloudflare移行計画

> **このドキュメントは過去の移行計画の記録です。**
> 実際の移行は完了していますが、その後リポジトリ構造はモノレポからフラット構造に変更され、
> WebSocket サーバーは削除され Hocuspocus に置き換えられました。
> 最新の構成については [README.md](../README.md) を参照してください。

## 概要

SazanamiプロジェクトをVercelからCloudflare Workersへ移行する計画です。

## 移行の理由

1. **WebSocketサーバーの統合**: Cloudflare Durable Objectsを使用してYjs同時編集用のWebSocketサーバーを同一インフラで運用可能
2. **コスト効率**: Cloudflare Workersの方がVercelより低コスト（特にWebSocket使用時）
3. **エッジ配信**: グローバルエッジネットワークでの低レイテンシー配信
4. **技術的負債の削減**: モノレポ構成でフロントエンドとバックエンドを統合管理

## 現状構成

```
sazanami/ (mainブランチ)
├── src/                    # SvelteKitソース
├── drizzle/               # DBマイグレーション
├── package.json           # 単一パッケージ
├── svelte.config.js       # adapter-auto
└── ...
```

## 目標構成

```
sazanami/ (mono-repo)
├── apps/
│   ├── web/               # SvelteKit (Cloudflare Workers)
│   │   ├── src/
│   │   ├── drizzle/
│   │   ├── wrangler.toml
│   │   └── package.json
│   └── websocket/         # Yjs WebSocketサーバー
│       ├── src/
│       ├── wrangler.toml
│       └── package.json
├── package.json           # workspaces設定
└── ...
```

## 移行ステップ

### Phase 1: 準備 (1-2日)

#### 1.1 ブランチ確認
- [ ] `mono-repo`ブランチの最新状態を確認
- [ ] mainブランチとの差分を整理
- [ ] コンフリクト解決

#### 1.2 依存関係の確認
- [ ] Cloudflare Workers対応の依存パッケージ確認
- [ ] `@sveltejs/adapter-cloudflare`の動作確認
- [ ] Better AuthのCloudflare対応確認

### Phase 2: モノレポ構成への移行 (2-3日)

#### 2.1 ディレクトリ構造変更
```bash
# 現在のmono-repoブランチをベースに
git checkout mono-repo
git rebase main

# または新しく作り直す
git checkout -b feature/cloudflare-migration
```

#### 2.2 Webアプリ移行
- [ ] `apps/web/`へのファイル移動
- [ ] `svelte.config.js`: `adapter-auto` → `adapter-cloudflare`
- [ ] `wrangler.toml`作成
- [ ] 環境変数の整理

#### 2.3 データベース設定
- [ ] Turso設定の確認（Cloudflare Workersから接続可能か）
- [ ] Drizzle設定のパス修正
- [ ] マイグレーションスクリプトの移動

### Phase 3: WebSocketサーバー設定 (1-2日)

#### 3.1 Hocuspocus設定
- [ ] `@hocuspocus/server`のCloudflare Durable Objects対応確認
- [ ] `apps/websocket/src/index.ts`の実装
- [ ] Yjsドキュメント永続化設定（optional）

#### 3.2 wrangler.toml設定
```toml
name = "sazanami-websocket"
main = "src/index.ts"
compatibility_date = "2025-01-01"

[durable_objects]
bindings = [
  { name = "ROOM_SYNC", class_name = "RealtimeRoom" }
]

[[migrations]]
tag = "v1"
new_classes = ["RealtimeRoom"]
```

### Phase 4: 統合・テスト (2-3日)

#### 4.1 ルートパッケージ設定
- [ ] `package.json` workspaces設定
- [ ] 共通スクリプトの設定（dev, build, deploy）
- [ ] concurrentlyでの並行開発設定

#### 4.2 テスト
- [ ] Playwright E2Eテストの移行
- [ ] ローカル開発環境での動作確認
- [ ] Cloudflareデプロイテスト

### Phase 5: デプロイ・移行 (1日)

#### 5.1 Cloudflare設定
- [ ] Cloudflareアカウント設定
- [ ] Workersデプロイ
- [ ] カスタムドメイン設定
- [ ] SSL/TLS設定

#### 5.2 データ移行
- [ ] 本番DBのバックアップ
- [ ] 必要に応じてデータ移行

#### 5.3 DNS切り替え
- [ ] ドメインのDNS設定変更
- [ ] 動作確認

## 技術的な注意点

### Adapter変更による影響

| 項目 | adapter-auto | adapter-cloudflare |
|------|--------------|-------------------|
| **Node.js API** | 利用可能 | 制限あり |
| **ファイルシステム** | 利用可能 | 利用不可 |
| **環境変数** | 標準的 | `platform.env`経由 |
| **ストレージ** | ローカル/S3 | R2/S3のみ |

### 対応が必要な箇所

1. **ファイルアップロード**
   - 現在: ローカルファイルシステム
   - 変更: Cloudflare R2またはS3必須

2. **環境変数アクセス**
   - 現在: `process.env.VAR_NAME`
   - 変更: `platform.env.VAR_NAME`

3. **Better Auth設定**
   - 現在: Vercel前提の設定
   - 変更: Cloudflare Workers対応設定

## リスクと対策

### リスク1: WebSocketサーバーの不安定性
- **対策**: 段階的ロールアウト、まずはフロントエンドのみ移行

### リスク2: Better Authの互換性
- **対策**: 事前にCloudflare Workers対応を確認、代替案の検討

### リスク3: パフォーマンス低下
- **対策**: 移行前にベンチマーク計測、問題があればロールバック

## タイムライン

| Phase | 期間 | 作業内容 |
|-------|------|----------|
| 1 | 1-2日 | 準備、調査 |
| 2 | 2-3日 | モノレポ移行 |
| 3 | 1-2日 | WebSocket設定 |
| 4 | 2-3日 | 統合・テスト |
| 5 | 1日 | デプロイ |
| **合計** | **7-11日** | |

## 次のアクション

1. **mono-repoブランチの確認**: 現在の状態を確認し、mainとの差分を整理
2. **Better AuthのCloudflare対応確認**: 認証フローがWorkersで動作するか検証
3. **小規模テスト**: 検証用ブランチでデプロイテスト

## 備考

- 現状の`mono-repo`ブランチはコミットメッセージが「一旦コミット」で管理が雑になっているため、整理が必要
- WebSocketサーバーは将来的な同時編集機能のための準備（現段階では必須ではない）
- Playwright E2Eテストは移行前に整備済み
