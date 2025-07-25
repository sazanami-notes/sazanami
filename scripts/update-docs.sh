#!/bin/bash

# ドキュメント更新スクリプト
# このスクリプトは、プロジェクトで使用する各種ドキュメントを最新の状態に保つために使用します。

echo "ドキュメント更新スクリプトを開始します..."

# DaisyUIのドキュメントを更新
echo "DaisyUIのドキュメントを更新中..."
curl -o docs/daisyui.md https://daisyui.com/llms.txt

# Svelteのドキュメントを更新
echo "Svelteのドキュメントを更新中..."
curl -o docs/svelte.md https://svelte.dev/llms-full.txt

# Better Authのドキュメントを更新
echo "Better Authのドキュメントを更新中..."
curl -o docs/better-auth.md https://www.better-auth.com/llms.txt

echo "ドキュメント更新が完了しました。"
