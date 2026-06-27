---
name: test-review
description: kpool-frontend のテスト品質とカバレッジをレビューする。Vitest、Testing Library、Playwright、Storybook、Next.js Route Handler、React Query hooks、Zodios生成型のアダプタ、packages/wiki の純粋モデルに関するテスト追加・修正・不足確認で使う。
---

# Test Review

## 目的

変更内容に対して、テストがユーザー価値と失敗しやすい境界を押さえているかをレビューする。単に行数やカバレッジを見るのではなく、壊れたときに実害が出る振る舞いを検出できるかを優先する。

## 進め方

1. 差分を `src/app`, `src/components`, `src/gateways`, `packages/wiki`, `tests/e2e` のどこに属するか分類する。
2. 既存の近いテストを `rg` で探し、テスト粒度と命名を合わせる。
3. 変更が既存テストのどの期待値を変えるべきか、または新規テストが必要かを判断する。
4. テスト不足を指摘するときは、具体的な入力、操作、期待結果を書く。

## テスト粒度の目安

- `packages/wiki`: URL生成、slug正規化、Wikiモデル変換、画像バリデーション、編集コード変換などは純粋関数のVitestを優先する。
- `src/gateways`: Zodios生成スキーマ、API prefix、レスポンス正規化、fetch失敗、Zodエラー、認証Cookie有無をVitestで見る。
- `src/app/api`: Route Handler は `NextRequest` と `fetch` mock で、転送headers、status、schema error、backend errorの秘匿、Set-Cookie転送を確認する。
- `src/components`: Testing Library でユーザーに見えるrole/label/text、操作イベント、フォーム更新、エラー表示を確認する。
- `src/app` client hooks: React Query の queryKey、mutation後の invalidate/setQueryData、initial data、戻る操作後の再利用を確認する。
- `tests/e2e`: 複数ページをまたぐ主要フロー、ログイン/登録、Wiki編集、mypage権限分岐、ブラウザバックやモバイルメニューを確認する。

## 重点観点

- 正常系だけでなく、未設定env、401/403/404/422/5xx、空レスポンス、不正JSON、不正schemaを確認しているか。
- BFF Route Handler がbackendの詳細エラーやリクエスト本文をクライアントへ漏らさないことを検証しているか。
- Cookie と `Accept-Language` の転送、`credentials: "include"`、`set-cookie` の維持がテストされているか。
- Zodは `safeParse` / `parseWithSchemaLog` の方針に沿い、失敗時の扱いが期待通りか。
- i18nは辞書キーと表示文言を全ロケールで確認しているか。固定文言のテストがロケール変更で脆くなっていないか。
- Playwright は実装詳細ではなく、ユーザー操作と画面結果で検証しているか。
- テストがmockに寄りすぎて、重要な接続部や権限分岐を検出できなくなっていないか。

## 検証コマンド

- 全体確認: `pnpm test:unit`
- E2E確認: `pnpm test:e2e`
- 影響範囲が狭い場合: `pnpm test:unit -- path/to/test`
- lint境界や禁止構文の確認: `pnpm lint`

## 出力

テストレビューの指摘は「不足している振る舞い」「なぜ壊れうるか」「追加すべきテストの形」をセットで書く。テスト追加不要と判断した場合は、既存テストで担保されている理由を明示する。
