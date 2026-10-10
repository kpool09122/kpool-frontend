# Workers ローカル検証記録 (#427)

## 固定sourceと環境

- 実装source SHA: `46340f9406fd5aae5d5ab68acaf5d6cc8a540efd`
- base main SHA: `8822097`（取得済み origin/main）
- 直接参照したbackend checkout SHA: `44697fc66217ae017efe05a85cd3da2d43d6c5b2`
- Node 26.10.0 / pnpm 12.4.2 / Next 16.3.8 / React 19.3.0
- OpenNext Cloudflare 1.20.8 / OpenNext AWS 4.1.7（アダプター内部依存。AWS操作は未実施）/ Wrangler 4.147.0
- workerd 1.20261001.1 / compatibility_date 2026-08-20
- buildとsmokeの前後でgit statusがcleanであることを確認。後続commitはこの検証記録のみ。
- `.open-next/worker.js` SHA256: `d05223bf4d44c84108a102ab62aa3bc9c5568f0c3ac2064c37be5cc65c64bc45`（単一entry fileの確認値。artifact全体のchecksumの代用ではない）

## 実行結果

| コマンド | 実結果 |
| --- | --- |
| `pnpm install --frozen-lockfile` | 成功。pnpm供給網policy確認成功。workerd postinstallは明示allowBuildsで許可 |
| `pnpm exec vitest run src/config/workersDeployment.test.ts 'src/app/[language]/legal/LegalDocument.test.tsx'` | 2ファイル・18件成功 |
| `task check`（最初のWrangler 4.125.0版） | lint + Next build + 全unit成功。161ファイル・974件 |
| `task check`（最終固定SHA） | lint/Next build成功（0 error / 4 warning）。unitは既定並列で9件timeout / 965件成功。全PASSとは記録しない |
| `pnpm exec vitest run --maxWorkers=2`（最終固定SHA） | 全161ファイル・974件成功。上記timeout後に並列数だけ変更し再実行、source変更なし |
| 固定SHAで `pnpm workers:build` | 成功。Turbopack build、TypeScript、68静的page生成、全dynamic app routeとproxyのバンドル作成。`OpenNext build complete.` |
| 固定SHAのbuild成果物で `pnpm workers:smoke` | 成功。実workerdローカルpreview起動・fixture APIとの通信 |
| `pnpm workers:deploy`（明示配備config無し） | 意図通りexit 1。Cloudflareへの配備を呼ばず停止 |
| `git diff --check` / staged diff check | 成功 |

固定SHAのbuildログ `/tmp/kpool-427-final-build.log`、smokeログ `/tmp/kpool-427-final-smoke.log`、全checkログ `/tmp/kpool-427-final-check.log` と `/tmp/kpool-427-final-unit.log` は実行ホスト上の一時証跡。恒久CI artifactではない。#156では同じコマンドの結果を固定source SHAとともに保存する。

## runtimeで確認した範囲

`workers:smoke` はローカルNode HTTP fixtureとworkerdを起動し、4 URLをbuild時とは別にruntime varsで注入する。秘密値・実ユーザーは使わない。

- SSR: `/ko` が200、Accept-Languageがjaでもproxy経由のroute localeでHTML lang=ko。
- 規約: ja/en/ko × terms/privacy が200。runtime filesystem不要。
- 画像: static faviconのbyte長一致、`/_next/image?url=/auth/google.png&w=32&q=75` が200/imageレスポンス。既存remotePatternsは不変。
- Identity: CSRF 204/no-store、fixture Cookie/Accept-Languageの上流転送と複数Set-Cookieの保持。
- CSRF拒否: site-management contact fixtureの419を保持。
- OAuth: google redirect fixtureレスポンス、外部`return_to=//evil.example`を`/admin`へ制限。
- passkey: 一覧schemaとBFF接続（空一覧正常応答）。WebAuthn ceremonyではない。
- Account: membersのfixture 401を維持。
- Wiki: 公開一覧のfixture空応答、同一リクエスト2回目は上流呼出数が増えずR2 fetch cache hit。
- 4 API prefixすべての上流到達をfixture側リクエスト記録でassert。単にfrontend HTTP 200だけでURL注入を成功扱いしない。

実出力:

```text
PASS Workers smoke: SSR/proxy, 6 legal pages, static/optimized image, 4 runtime API URLs, Cookie/Set-Cookie, CSRF 419, OAuth return_to, passkey list, R2 cache hit.
NOT VERIFIED: production resources, external image CDN, cache expiry/revalidation, real OAuth callback, WebAuthn ceremony and browser cookies across domains.
```

## 4観点の同期レビュー

project-local `.codex/skills/{qa-review,test-review,security-review,architecture-review}/SKILL.md` を読み、同一セッションで実施。非同期review/delegateは使わない。未入手スキルなし。

- QA: 既存ページ・i18n/proxy・規約表示を確認。workerdで6規約ページとroute localeを検証。実管理画面全操作/外部認証は未検証として契約に明記。
- Test: runtime fs依存で規約6テストが失敗するREDを確認後修正。配備config不足で失敗するREDを確認後binding gate追加。HTML正本一致、18対象テスト、974全unit、実runtime smokeを確認。
- Security: local設定誤配備、資格情報付きURL、binding不足の拒否を追加。Cookie/Set-Cookie/no-store/419とOAuth return_toを検証。runtime secretは導入せず、画像host許可範囲を広げない。本番hostの承認・実認証は残余ゲート。
- Architecture: 既存gateway/env/BFFをそのまま利用、Workers固有設定・CLIはroot config/scriptsへ隔離。規約正本と生成artifactの責務を明記。R2共有cache + DO queue、tag cacheは現行未使用のため追加しない。生成物をlint/gitから除外し、既存依存境界を保持。

追加依存監査では初期Wrangler版にsharp/undiciの新規報告があり、Wrangler 4.147.0へ更新して修正した。最終 `pnpm audit --json` と未変更 origin/main SHA `8822097` の同コマンドを比較し、新規advisory IDは0件。最終残存報告は main と同じ high 22 / moderate 19 / low 1 / critical 0。axios、vite、nanoid、browserslist、baseline-browser-mapping、js-yaml、brace-expansion、braces等の既存依存全体の更新は本Issueの範囲外として未対応。監査全体をPASS/脆弱性なしとは扱わない。

妥当な今回の実装指摘は修正済み。既存依存の監査報告以外に未対応のコード指摘なし。ただし以下はPASSではなく、承認済み実環境の確認事項として引き渡す。

## 未実施・残余リスク

- Node proxyはアダプターがexperimentalと警告。ローカル成功のみで正式本番互換を保証しない。
- Cloudflare本番deploy、account/resource実在・権限、DNS/TLS、本番binding/migration適用は未実施（無承認操作は範囲外）。
- 実backendの公開Wiki詳細/編集/管理フロー、cache期限後の再検証、DOによるqueue処理、複数isolate・切替・rollbackは未検証。
- 外部CloudFront画像、実OAuth callback、WebAuthn署名/登録/ログイン、Secure/SameSite/domain/CORS/CSRFの実ブラウザ成功・拒否は未検証。
- 全Playwright E2Eは未実施。通常next devのE2E結果をWorkers証明の代用にせず、今回のruntime smokeと全unitを記録。
- #156のActions統合・artifact受渡し・Worker version記録は本Issueの範囲外。契約は [cloudflare-workers.md](cloudflare-workers.md) に記載。


## Wiki接続元情報 (#440) の検証

base: origin/main `0f155a6`（Next 16.4.0 / OpenNext 1.20.9 / Wrangler 4.148.0）。Node 26.10.0 / pnpm 12.4.2。backend #700 / merged PR #701の `VisitorLocationVerifier` / `VisitorLocation` / `config/wiki.php` をGitHubから直接確認し、HMAC契約を合わせた。配備・秘密鍵変更は実施していない。

| コマンド | 実結果 |
| --- | --- |
| `pnpm install --frozen-lockfile` | 成功、lockfile変更なし |
| 新規提出ルート署名テスト RED | 期待するJPヘッダーがnullで失敗し、未実装を検出 |
| `pnpm exec vitest run src/app/api/wiki/visitorLocation.test.ts` | 56件成功。5操作×10パターンの201、Cookie/CSRF/言語/no-store、署名一致、未取得/偽装/先頭ゼロ/Enum未登録、鍵不在、署名失敗、リクエスト分離、翻訳への非適用 |
| 最終 `task check` | lint + Next build + 全unit成功。166ファイル・1103件成功。lintは0 error / 4 warning（変更外の未使用変数） |
| 最終 `pnpm workers:build` | 成功、OpenNext build complete。Node proxy experimental警告あり |
| 最終 `pnpm workers:smoke` | **失敗**。Next.js起動時 `Unexpected loadManifest(/.next/server/preview-props.json) call!`、/ja/termsが500。Wikiの追加runtimeシナリオには到達しない |
| 未変更mainを専用baseline worktreeでinstall/build/smoke | build成功、smokeは同じloadManifestエラーで失敗。今回の変更前からの問題と再現確認 |
| `node scripts/workers-visitor-location-smoke.mjs` | **成功**。実workerdで生成OpenNext ALS/context API + Web Cryptoを利用。JP/01、ZZ/NEW9、国のみ、全未取得、受信偽装無視、Nodeの独立HMAC計算との一致 |

全体smokeとcontext smokeのfixture cfは合成値。実Cloudflare接続元推定取得を検証したものではない。追加した全体smokeの5操作×cfあり/なし検証は、既存Next/OpenNextの起動問題が解消した後に改めて実行する。context smokeはNext.jsの起動/ルート/バックエンド実通信成功を証明しない。

4つのproject-local skillを読み、同一セッションで同期レビュー（delegate/background reviewなし、未入手スキルなし）:

- QA (`qa-review`): 5既存操作の201成功、位置情報欠落でも操作継続、既存認証/CSRF/言語/エラー処理を維持。画面・言語解決の変更なし。実管理画面操作と本番履歴保存は未検証。
- Test (`test-review`): 提出だけでなくapprove/reject/withdraw/publishの実ルート→実gateway→fetch mockを網羅。独立Node HMACでURI/実body/Cookieバインドを検証。全体Workersエラーをmainで再現し、context-only成功と区別。全Playwrightは未実施（UI変更なし）。
- Security (`security-review`): 受信ヘッダーやbody/言語国を信頼しない。runtime secretをBFFに隔離し、型importだけのcallback経由でgatewayへ渡す。Web Cryptoでbody/URI/Cookie/時刻へ署名し、鍵不在時は位置情報を省略。生IP/秘密鍵/位置情報ログを追加しない。backendの署名検証・時間窓と一致。本番経路・鍵配備と完全同一リクエストの時間窓内再送は残余確認事項。
- Architecture (`architecture-review`): Cloudflare取得/署名はBFFの協調オブジェクトに集約。gatewayは最終送信bodyとURLだけをcallbackへ渡す。React/client/共有WikiモデルにCloudflare依存・秘密鍵を持ち込まない。proxy/i18nは変更せず責務分離。runtime検証scriptは明示lint例外対象に追加。

妥当な今回のコード指摘は解消し、未対応のコード指摘なし。既存Workers起動障害は基盤互換性の別対応とし、本Issueで生成bundleへの手修正や依存更新は行わない。実配備時のCloudflare取得、secret一致、5操作の実backend履歴・署名改変拒否の確認は [wiki-visitor-location.md](wiki-visitor-location.md) の配備ゲートとして残す。

実行ホストの一時ログ: `/tmp/kpool-440-final-check.log`、`/tmp/kpool-440-final-workers-build.log`、`/tmp/kpool-440-final-smoke.log`、`/tmp/kpool-440-baseline-build.log`、`/tmp/kpool-440-baseline-smoke.log`、`/tmp/kpool-440-visitor-smoke.log`。恒久CI artifactではない。
