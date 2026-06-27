---
name: security-review
description: kpool-frontend のセキュリティ観点をレビューする。Next.js Route Handler のBFF、認証Cookie、Set-Cookie転送、SSO return_to、CSRF相当のレビュー操作ヘッダー、画像アップロード、外部URL/埋め込み、Zod schema検証、エラー秘匿、依存ライブラリ更新に関する差分レビューで使う。
---

# Security Review

## 目的

kpool-frontend の変更が、認証情報、backendエラー、ユーザー入力、外部URL、アップロードデータを安全に扱っているかをレビューする。backendで防ぐべき問題とfrontend/BFFで防ぐべき問題を分け、フロント側で実害を増やす変更を優先して指摘する。

## 進め方

1. 差分が browser、Server Component、Route Handler、gateway、packages のどこで動くかを確認する。
2. ユーザー入力、URL parameter、query、request body、Cookie、外部API応答、画像/埋め込みURLの入口を洗い出す。
3. 認証/権限、データ検証、エラー秘匿、外部リソース、ログ出力、依存関係の観点で確認する。
4. 指摘は攻撃可能性、漏えいする情報、影響範囲、修正方向を具体的に書く。

## 重点観点

- BFF Route Handler はbackend詳細エラー、例外message、stack、request body、token、Cookieをクライアントやログへ漏らしていないか。
- Cookie転送は必要なRoute Handlerに限定されているか。`Cookie` と `Accept-Language` の転送、`Set-Cookie` のappend処理が意図通りか。
- `credentials: "include"` が必要なbrowser fetchに付いているか。不要な外部originへ資格情報を送っていないか。
- SSOやログイン後の `return_to` は相対パスに制限され、`//evil.example` や絶対URLへリダイレクトできないか。
- Wiki draft approve/reject/publish/translate や画像reviewなどの副作用Routeは、想定したレビュー操作ヘッダーや認証Cookieを要求しているか。
- Zod schema検証は `safeParse` / `parseWithSchemaLog` の方針に沿い、不正payloadを成功扱いにしていないか。
- 画像アップロードはContent-Length、base64サイズ、mime type、拡張子、source URL schemeを確認しているか。
- 外部URLは `http:` / `https:` 以外を拒否しているか。`javascript:`, `data:`, `file:` を通していないか。
- iframe/embed は許可providerに限定し、YouTubeは `youtube-nocookie.com` など既存方針を崩していないか。
- `dangerouslySetInnerHTML`、HTML文字列連結、Markdown/namuwiki変換結果のDOM挿入が増えていないか。
- `next.config.ts` の画像remotePatternsが過度に広くなっていないか。
- client bundle に server-only env、backend secret、内部URLが露出していないか。
- localStorage/sessionStorage に認証情報や長期秘密情報を保存していないか。

## 依存関係

依存追加・更新では、ライブラリの実行面を確認する。エディタ、Markdown/HTML処理、画像処理、認証、fetch wrapper、ビルドプラグインは特に注意する。既存の `pnpm` / lockfile 変更がある場合は、不要な依存追加や供給網リスクも見る。

## 出力

セキュリティ指摘は重大度順にする。各指摘には、入力経路、悪用例、影響、修正方針、追加すべきテストを含める。問題が推測止まりの場合は、確認すべき追加情報を明示する。
