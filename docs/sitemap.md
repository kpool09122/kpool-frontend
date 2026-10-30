# 公開サイトマップの運用

## 設定と掲載対象

- サーバー専用の `KPOOL_PUBLIC_SITE_URL`（既定値 `https://k-pool.app`）を本番公開originに設定する。HTTPSのoriginのみを許可し、パス・認証情報・query・fragmentは拒否する。Hostヘッダーからは生成しない。
- `KPOOL_WIKI_PRIVATE_API_BASE_URL` は既存と同じバックエンドoriginを設定する。バックエンド #819 / PR #823 の `GET /api/v1/wiki/sitemap/wikis` が必要。
- `/{ja,en,ko}` と各言語の `/terms`、`/privacy` の9固定ページを掲載する。`/` は言語選択リダイレクトのため含めない。
- WikiはAPIに存在する言語・slugのみ、`/{language}/wiki/{slug}` を掲載する。翻訳を補完せず、旧 `/wiki/{language}/{slug}`、管理・認証・編集・検索URLは含めない。新旧詳細ルートのcanonicalも同じ正規URLを使用する。
- `lastmod` はAPIの `lastModifiedAt`（公開・再公開時の `published_at`）を使う。nullおよび固定ページでは省略し、生成日時や一般的なDBの `updated_at` に置き換えない。

## 再生成・キャッシュ・障害

- App Routerの通常のRoute HandlerでXML（インデックスを含む）を配信する。インストール済みNext.jsのsitemap/robotsガイドを確認した上で、動的分割のインデックスと厳密なサイズ制限を扱うためsitemapは明示的なRoute Handler、robotsはメタデータルートを採用した。
- `force-dynamic` とAPI fetchの `cache: no-store` により、ビルド時のデータ取得やISR/R2の永続スナップショットは作らない。Workersで受信する各リクエストでcursorの全ページを取得する。
- 成功レスポンスのみ `Cache-Control: public, max-age=300, must-revalidate`。HTTPキャッシュを利用するクローラーでも鮮度上限は5分。stale-while-revalidate / stale-if-errorを指定しない。Cloudflare Cache APIや独自のCDN Cache Ruleは不要で、キャッシュが適用されないプレビューでは毎回再生成する。独自Cache RuleでこのTTLを延長しないこと。
- 公開・更新・削除は次のキャッシュミスに反映される（HTTPキャッシュを尊重する場合も5分以内）。デプロイ・cron・R2削除等は不要。
- APIの未設定、通信/JSON/スキーマ/ページングエラー、ループするcursor、不整合なslug種別、無効な公開origin、生成上限の異常は `503` + `Cache-Control: no-store` + `Retry-After: 60`。空/部分Wiki一覧を200として返さず、バックエンドの詳細エラーも公開しない。正規の0件だけは9固定ページを正常配信する。
- APIは認証不要。リクエストのCookie等は転送しない。各ページは最大1,000件で、ページごとの通信タイムアウトは15秒。画面/query系のIPレート制限（バックエンド既定300req/分、global制限もあり）に注意する。大規模化/頻繁な巡回で429が発生する場合は監視し、別途キャッシュ設計を検討する。
- バックエンドはcursor全体のスナップショットを保証しない。同時公開がcursor境界より前に入った場合は次回の全件取得で反映する。

## URL数・サイズ

- 各XMLは最大50,000 URLかつ非圧縮50MiB（52,428,800 bytes）。UTF-8でXML宣言・タグ・エスケープ後の全バイトを計測し、先に達する制限で分割する。
- 単一ファイルなら `/sitemap.xml` はurlset。分割時は同じURLをsitemapindexにし、`/sitemaps/0.xml`、`/sitemaps/1.xml`…を列挙する。インデックス自身も50,000件/50MiB以下を検査する。
- 同一正規URLを重複排除し、既知の公開日時が複数なら最新値を採用する。1URLが2,048文字を超える場合は黙って除外せず503とする。
- 子XMLもキャッシュミスごとに全件を読み取る。境界付近の追加・削除でキャッシュ済みインデックスと一時的にずれる可能性はあるが、5分以内の期限切れ後は現在の構成に一致する。存在しない/不正な子番号は404/no-store。
- 生成はWorkersメモリ上で行うため、極大データでの本番CPU/メモリ上限は別途負荷検証が必要。ファイル上限の分割テストは大量fixtureによるユニットテストで実施する。

## 検証

```sh
pnpm lint
pnpm test:unit --maxWorkers=4
pnpm workers:build
pnpm workers:sitemap-smoke
# 任意: 起動済みバックエンドを読み取り専用で確認（DB更新は行わない）
KPOOL_SITEMAP_SMOKE_LIVE_API_URL=http://127.0.0.1:8080 pnpm workers:sitemap-smoke
```

スモークはissue所有のWorkersプレビュー/fixture HTTPサーバーを起動・終了する（既定ポート8793、`KPOOL_SITEMAP_SMOKE_PORT`で変更可能）。XML/Content-Type、robots、複数ページ、HTTP TTL、更新・削除・再公開、途中失敗の503と復旧、Cookie非転送を検証する。fixtureでの変更テストは本番バックエンド書き込みの証拠ではない。任意のlive検証は実APIの全ページとWorkers出力URLを比較する読み取り検証。
