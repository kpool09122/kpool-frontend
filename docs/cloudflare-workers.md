# Cloudflare Workers 実行契約（backend #156 への引き渡し）

## 採用方式・責務

Next.js 16.3.8 / React 19.3.0 を変更せず、`@opennextjs/cloudflare` 1.20.8 と Wrangler 4.125.0 を lockfile と直接依存で固定する。アダプターの peerDependencies は `next >=15.5.27 <16 || >=16.3.8`、Wrangler `^4.125.0`。実際の Turbopack build と workerd preview を検証した。静的 export / next-on-pages では SSR・BFF・proxy を保持できないため採用しない。

作業前に AGENTS.md、インストール版 Next の `dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` と `01-app/02-guides/environment-variables.md` を確認した。backend の既存 `infra/cloudformation/{README.md,contracts.json}`、`doc/infrastructure/{pipeline-handoff.md,backend-release.md}` を直接参照した。AWS 基盤・Actions workflow・本番 Cloudflare resource/DNS は変更しない。

公式仕様: [開始手順](https://opennext.js.org/cloudflare/get-started)、[cache](https://opennext.js.org/cloudflare/caching)、[env](https://opennext.js.org/cloudflare/howtos/env-vars)。Next.js の Node proxy は OpenNext 側で experimental / officially unmaintained の警告が出る。ローカル成功を本番保証とせず、アップグレード時にも smoke と承認済み環境の検証を必須とする。

## コマンド・固定成果物

Node 26.10.0 / pnpm 12.4.2 を使用する。

```sh
pnpm install --frozen-lockfile
pnpm workers:build
pnpm workers:preview --port 8787
# build 済み artifact に対するローカルfixture試験。実backend認証の試験ではない。
pnpm workers:smoke
# 既存の lint + Next build + unit tests
 task check
```

`workers:build` が既存 `build` を呼び、`.open-next/worker.js`、`.open-next/assets/`、cache 初期値とサーバーバンドルを生成する。`workers:preview` と `workers:deploy` は **再buildしない**。build後にsource/lockfile/configを変更しない。#156 は source完全SHA、lockfile、承認済みconfigの識別子/checksum、artifact checksum、Worker versionと検証結果を紐付ける。配備用artifactは `.open-next/` 全体とそのbuildで使用した設定・実行ツールを同じsource SHAから復元できる形で渡す。preview成功だけで配備成功を記録しない。

public/legal の6 HTMLは build/dev 時に `scripts/generate-legal-documents.mjs` で `src/app/[language]/legal/documents.json` へ生成する。JSONは配備バンドル用の生成物としてversion管理し、HTMLが正本。既存描画を保持したまま runtime の `process.cwd()/public` filesystem依存を除去する。単体テストで正本と完全一致およびfilesystem無しの描画を確認する。

## version管理設定と本番配備ガード

`wrangler.json` は **ローカル専用**。Worker/R2名の `*-local*` は Miniflare用で、実在する本番リソースIDではない。account_id、routes、DNS、KV/D1 ID、本番bucketは推測で登録しない。`workers_dev=false` / `preview_urls=false`。これを本番へ直接 `wrangler deploy` しない。

管理者が承認・準備した既存Worker/R2とrouteを使い、リポジトリルートの無視対象 `wrangler.deploy.json` にローカル設定の完全コピーを作る。少なくとも次を確定する:

- `name`: 承認済みWorker名。
- `services[WORKER_SELF_REFERENCE].service`: 同じWorker名。
- `r2_buckets[NEXT_INC_CACHE_R2_BUCKET].bucket_name`: 管理者が作成・確認したcache専用bucket。
- `vars`: 下記4 API URL（非秘密）。`IMAGES`、DO binding/migration、Node互換flagを維持。
- custom domain / route / workers.dev方針とaccountは管理者台帳から明示設定。Cloudflare resourceの作成・変更は別途承認。

```sh
# 承認済み設定でbuildし、同じ設定でpreviewする（本番APIへのアクセスも承認対象）。
pnpm workers:build --config wrangler.deploy.json
pnpm workers:preview --config wrangler.deploy.json --port 8787
# 本番への実行は別途承認がある場合のみ。tokenは環境から注入し引数へ渡さない。
KPOOL_WORKERS_DEPLOY_CONFIG=wrangler.deploy.json pnpm workers:deploy
```

配備入口は明示configを要求し、local設定・self reference不一致・cache/DO/image/Node binding不足・未設定/非HTTPS/資格情報付きAPI URLを拒否する。構造検査はリソース実在・権限・配備承認の検証ではない。Wranglerの自動provisionに依存せず、管理者は既存resourceとtoken権限を事前確認する。wrangler.deploy.json/.dev.vars/.open-next/.wrangler はgit対象外。秘密値を設定ファイルや成果物に保存しない。

## bindings とキャッシュ

| Binding | 用途 / 管理 |
| --- | --- |
| ASSETS | `.open-next/assets` の静的配信。`public/_headers`でハッシュ付き `_next/static/*` のみ1年immutable |
| WORKER_SELF_REFERENCE | 同じWorkerへの内部参照。Worker名を必ず一致させる |
| NEXT_INC_CACHE_R2_BUCKET | Next fetch/ISRの共有incremental cache。画像S3やprivate書類bucketとは別 |
| NEXT_CACHE_DO_QUEUE / DOQueueHandler | 時間ベース再検証用Durable Object。migration `v1` / `new_sqlite_classes` を初回適用。既存Workerなら過去migrationとの整合を管理者確認 |
| IMAGES | Next image最適化。既存remotePatternsを広げない |

`open-next.config.ts` は R2 cache とDO queueを選択。公開Wikiの `next.revalidate=60` を維持し、認証APIの `no-store` を変更しない。現在 `revalidateTag/revalidatePath` は使っていないためD1/tag cache/purge tokenは導入しない。将来導入時はtag cacheを別途設計する。deploy/preview はOpenNextのcache初期値投入も行うため、raw Wrangler deployへ置き換えない。

## 4 API URLの注入契約

| 非秘密変数 | 既存アプリのprefix |
| --- | --- |
| KPOOL_WIKI_PRIVATE_API_BASE_URL | `/api/wiki` |
| KPOOL_IDENTITY_API_BASE_URL | `/api/identity` |
| KPOOL_ACCOUNT_API_BASE_URL | `/api/account` |
| KPOOL_SITE_MANAGEMENT_API_BASE_URL | `/api/site-management` |

runtime `ApiUrl` を管理者/Pipelineが解決し、各base URLへ渡す。originまたは対応prefix付きURLを既存gatewayが扱う。URLにtoken/userinfo/query/fragmentを含めない。4変数は `NEXT_PUBLIC_*` や next.config.env にせずブラウザへの埋め込みを避ける。

- build: shell環境 / Next .env.production 等で注入可能。ただし現行全ページはdynamicで、4変数未設定でもbuild成功。今回の証跡は未設定buildに別のruntime値を注入して検証した。将来SSGへ変更する場合はbuild時にも同値が必要。
- runtime: 承認済みWrangler configの `vars` に4値を設定する。OpenNextがWorkers envをprocess.envへ初期化し、既存gatewayを使う。値変更で再buildは不要だが、古いcacheの扱いを確認し、origin切替と配備を明示管理する。
- local: `.dev.vars` / .env ファイルはgit対象外。通常の `next dev` は既存 .env を使用。Cloudflare bindingをnext dev中に直接扱うアプリコードはないためinitOpenNextCloudflareForDevを追加しない。smokeは非秘密のlocal fixture URLだけを一時configへ書き、finallyで削除する。

Secret名: 配備jobに `CLOUDFLARE_API_TOKEN`（backend production Environment Secret）、`CLOUDFLARE_ACCOUNT_ID` は非秘密の対象account識別子。tokenはアプリruntimeへ渡さない。現frontendにはWorkers runtime secretは不要。AWS APP_KEY/DB/Redis認証、GitHub App秘密鍵をWorkersへ持ち込まない。#156は必要なsource取得tokenのみ分離する。

## 認証・画像・実環境ゲート

ローカルfixtureで Cookie/複数Set-Cookie/Accept-Language、CSRFの419保持、OAuth return_toの外部URL拒否、passkey一覧のschema処理を確認。これは実OAuth callback、WebAuthn署名・origin/RP ID、ブラウザのCookieポリシーを証明しない。

本番配備前に管理者/実環境検証担当が次を記録する:

- API TLS/Host/DNS/到達性。Cloudflare proxy利用時はFull(strict)と認証API cache bypass。
- frontend/APIのsite関係、SESSION_DOMAIN、Secure/SameSite、CSRF/CORS、Cookie送信・更新・拒否。
- OAuth callback exact matchと外部provider往復、passkey RP ID/allowed originsで成功・拒否。
- backend `ImageBaseUrl`（CloudFront/OAC）とfrontendの既存画像URL許可ポリシー/remotePatterns。未知の本番hostを一括許可しない。承認済みhostが既存許可にない場合は別の明示変更と拒否テストが必要。
- 公開Wiki詳細・編集・管理画面、実cache expiry/revalidation/DO動作、複数isolate、デプロイ切替・rollback、Workersサイズ/CPU制限と本番accountの課金・binding権限。

固定SHAでのローカル結果は [Workers検証記録](workers-validation.md) を参照。本番deploy・resource作成・AWS操作は本Issueの実行証跡に含めない。
