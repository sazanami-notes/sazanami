# sazanami-mcp

Sazanami（個人用メモアプリ）の公開 REST API **v1** を [MCP](https://modelcontextprotocol.io) ツールとして公開する stdio サーバーです。
Claude Desktop / Hermes Agent などの MCP クライアントから、ノートの一覧・検索・取得・作成・更新・リンク取得ができます。

- API 契約: [`../docs/api-v1.md`](../docs/api-v1.md)
- ベースURL: `https://sazanami-dev.kaedesato.work`（`/api/v1` 配下）
- 認証: `Authorization: Bearer sznm_...`（個人アクセストークン）

## セットアップ

```bash
cd mcp
npm install
```

Sazanami の **設定 → APIトークン** でトークンを発行してください（スコープ `read` / `write`）。
読み取りだけなら `read`、作成・更新まで使うなら `write` が必要です。

### 環境変数

| 変数 | 必須 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `SAZANAMI_TOKEN` | **必須** | — | 個人アクセストークン（`sznm_...`）。未設定なら起動時に stderr へエラーを出して終了します |
| `SAZANAMI_BASE_URL` | 任意 | `https://sazanami-dev.kaedesato.work` | API のベースURL（末尾スラッシュ不要） |

```bash
export SAZANAMI_TOKEN="sznm_xxxxxxxxxxxx"
export SAZANAMI_BASE_URL="https://sazanami-dev.kaedesato.work"   # 省略可

node index.mjs        # または npm start
```

stdio サーバーなので単体起動してもプロンプトは出ません（クライアントがパイプで繋ぐ想定）。
ログはすべて stderr に出ます。

## MCP クライアント設定例

### Hermes Agent（`~/.hermes/config.yaml`）

```yaml
mcp_servers:
  sazanami:
    command: node
    args:
      - /home/mizuki/workspace/sazanami/mcp/index.mjs
    env:
      SAZANAMI_TOKEN: sznm_xxxxxxxxxxxx
      SAZANAMI_BASE_URL: https://sazanami-dev.kaedesato.work
```

### Claude Desktop（`claude_desktop_config.json`）

```json
{
  "mcpServers": {
    "sazanami": {
      "command": "node",
      "args": ["/home/mizuki/workspace/sazanami/mcp/index.mjs"],
      "env": {
        "SAZANAMI_TOKEN": "sznm_xxxxxxxxxxxx",
        "SAZANAMI_BASE_URL": "https://sazanami-dev.kaedesato.work"
      }
    }
  }
}
```

`npm link`（または `npm install -g .`）すれば `command: "sazanami-mcp"` だけでも起動できます。

## ツール一覧

| ツール | 引数 | 説明 |
| --- | --- | --- |
| `list_notes` | `status?` `q?` `limit?` `offset?` | ノートを更新順に一覧する（`status` はカンマ区切り可、既定は `box-deleted` 以外すべて） |
| `get_note` | `id` | ノート1件を本文・タグ込みで取得する |
| `search_notes` | `q`, `limit?` | キーワードで全文検索し、要約一覧を返す |
| `create_note` | `title?` `content?` `status?` `tags?` | ノートを新規作成する（結果に `id` とタイトルを含む） |
| `update_note` | `id`, `title?` `content?` `status?` `isPublic?` | ノートを部分更新する（結果に `id` とタイトルを含む） |
| `get_links` | `id` | 1ホップ / 2ホップリンクとバックリンクを取得する |

- `status` の値: `inbox` / `box` / `archived` / `trash` / `box-archived` / `box-deleted`
- 成功時は API の JSON をそのまま整形して返します。
- HTTP エラーは例外で落とさず、`Sazanami API エラー: HTTP 404 / error.code=not_found / <message>` の形式で `isError: true` として返します。

## 動作確認（stdio スモークテスト）

```bash
SAZANAMI_TOKEN=dummy node -e '
const { spawn } = require("node:child_process");
const p = spawn("node", ["index.mjs"], { stdio: ["pipe", "pipe", "inherit"] });
let buf = "";
p.stdout.on("data", (d) => {
  buf += d;
  for (const line of buf.split("\n").slice(0, -1)) {
    const msg = JSON.parse(line);
    if (msg.id === 2) { console.log(msg.result.tools.map((t) => t.name).join(",")); p.kill(); }
  }
});
p.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "smoke", version: "0" } } }) + "\n");
setTimeout(() => p.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }) + "\n"), 300);
'
```
