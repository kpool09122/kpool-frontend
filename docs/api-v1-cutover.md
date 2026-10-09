# バックエンドAPI v1への一斉切り替え

対象: [frontend #433](https://github.com/kpool09122/kpool-frontend/issues/433)、[backend #698](https://github.com/kpool09122/kpool-backend/issues/698) / [backend PR #699](https://github.com/kpool09122/kpool-backend/pull/699)。PRのマージと環境への配備は別であり、バックエンドのマージ済み状態だけで接続可能と判断しない。

## 接続経路の棚卸し

| 実行面 | ブラウザ側の契約 | Laravel向けの接続先・責務 |
| --- | --- | --- |
| Identity BFF、SSRの認証取得 | `/api/identity`、`/api/identity/auth/*` を維持 | `identityApi.ts` の `getIdentityApiBaseUrl` が `/api/v1/identity` を設定。CSRF、OAuth開始、passkey、認証情報取得も同じ接続先 |
| Account BFF | `/api/account/*` を維持 | `accountApi.ts` が `/api/v1/account` を設定。書類のバイナリ中継も対象 |
| Wiki BFF、SSRの一覧・詳細・編集初期値 | `/api/wiki/*` と画面URLを維持 | `withWikiApiPrefix` を既存のサーバーgateway / `wikiPrivateServerApi.ts` で利用し `/api/v1/wiki` へ接続 |
| お問い合わせ BFF | `POST /api/contact`、入力/応答を維持 | `contactApi.ts` が `/api/v1/site-management` を設定し、`/contact/submit` へPOST。末尾の `/v1` は廃止 |
| OAuth外部プロバイダーからの戻り | Next.jsにcallback中継routeはない | バックエンドの `/api/v1/identity/auth/social/{provider}/callback` へ戻る。ログイン後の `return_to` は従来のフロント画面URL |

ブラウザgatewayは同一originのNext.js中継APIを使う。`KPOOL_*_API_BASE_URL` はサーバー専用で、`NEXT_PUBLIC_*` や `next.config.env` に公開しない。Wikiの同一moduleにあるSSR用の関数もこのサーバー設定を使用する。利用中のブラウザからLaravelへの直接fetchはなく、OAuthの外部リダイレクト/バックエンドcallbackは意図した別経路。

Monetizationは生成型のみ存在し、現在のフロントに通信gatewayはない。Webhookは `/webhook` のまま。利用開始時はサーバーgatewayで接続先を明示する。

## 環境設定

`.env.example` の4変数にはバックエンドoriginを設定する（推奨）。対応する完全な `/api/v1/{context}` prefix付きURLも利用可能。末尾のスラッシュは除去し、prefixを二重付与しない。

- `KPOOL_IDENTITY_API_BASE_URL`: origin または `/api/v1/identity`
- `KPOOL_ACCOUNT_API_BASE_URL`: origin または `/api/v1/account`
- `KPOOL_WIKI_PRIVATE_API_BASE_URL`: origin または `/api/v1/wiki`
- `KPOOL_SITE_MANAGEMENT_API_BASE_URL`: origin または `/api/v1/site-management`

移行前のローカル設定に一致する `/api/{context}` が付いている場合、URLビルダーは設定文字列をv1へ正規化するだけであり、旧URLへの通信・リトライ・フォールバックはしない。配備設定はoriginまたは完全なv1 prefixへ更新する。Workersの配備ゲートは旧prefix、他context、未実装v2、不完全なprefix、endpointを含むbase URLを拒否する。query/fragment/userinfoを含めない。

将来、機能単位でv2へ移行する場合は、対象のサーバーgateway/BFFの接続先と必要な入出力変換のみ変更する。ブラウザURLは別契約として維持する。今回v2ルートや汎用的なバージョン切り替え基盤は追加しない。

## 生成型・クライアント

バックエンド `doc/openapi/KPool.*.openapi.yaml` のserver URLは各contextの `/api/v1/...`、お問い合わせは `/contact/submit` でpath version parameterなし。既存のバックエンド生成手順と同じ `openapi-zod-client@1.18.3 --export-schemas --with-docs --api-client-name ...` でAccount / Identity / Monetization / Webhook / Wikiを再生成する。

生成クライアントのendpointはcontext相対パスで、server URL変更は生成コードへ埋め込まれない。変更差分はIdentityのCSRF説明文のみ（自動生成PR #434と同内容）。実際のbase URLはgateway側で指定する。SiteManagementは既存の手書きZod契約を利用し、送信入力・201応答の契約変更はない。

## 切り替え手順（環境管理者が実施）

1. バックエンドPR #699と本フロント変更の配備artifactを準備する。ステージングで両方を同時に切り替える。旧URL併存は行わないので、切り替え中のアクセスを抑止する保守時間/トラフィック制御を用意する。
2. 上記4環境変数とWorkers runtime varsを確認する。originが同じなら変更不要だが、パス付き値はv1へ明示更新する。TLS/DNS、CookieのDomain/Secure/SameSite、CSRF/CORS設定は従来の方針を維持する。
3. バックエンド `config/oauth.php` の `GOOGLE_REDIRECT_URI`、`LINE_REDIRECT_URI`、`KAKAO_REDIRECT_URI` と各プロバイダー管理画面の登録URLを、実際のバックエンドorigin + `/api/v1/identity/auth/social/{provider}/callback` へ揃える。Next.jsの `/api/identity/...` を登録しない。既存のログイン後画面URL/return_toやWebAuthnのRP ID/allowed originsはAPIのpath変更だけでは変更しない。
4. トラフィック抑止中にバックエンドとフロントを配備し、Laravelのroute/config cacheを配備手順に従って更新する。公開Wikiのキャッシュはv1 URLで別keyになるため、配備環境で旧キャッシュの残存/失効と実際の新URLへの到達を確認する。
5. 下記実接続ゲートを確認してからトラフィックを再開する。アクセスログで旧業務APIへの通信・prefix重複がないことを確認する。
6. 失敗時はフロント・バックエンド・4変数・OAuth設定/プロバイダー登録を同じ旧構成へ戻す。一方のみのrollbackは禁止。旧APIへの自動フォールバックは設けない。

## 検証と実接続ゲート

コード検証: `pnpm lint`、`pnpm test:unit`、`pnpm build`、関連Playwright (`account-setup.spec.ts`、`home.spec.ts`、`wiki-detail.spec.ts`)。URLビルダーはorigin/フルv1 prefix/末尾スラッシュ/旧設定正規化をテストする。BFFの成功・入力エラー・401/403/419/422/5xx・Cookie/Accept-Language/Set-Cookie・エラー秘匿は既存routeテストで維持する。

Workers fixture検証: `pnpm workers:build && pnpm workers:smoke`。4系統のupstream prefixとお問い合わせendpoint、Cookie/Set-Cookie、CSRF、OAuth return_to、SSR/cacheを確認する。これはLaravelへの実接続や外部OAuth成功の証明ではない。

本番/ステージングのテストアカウントとOAuth登録の変更はこの自動実行に含めない。配備前に担当者が新バックエンドへ接続して、以下の証跡を残すこと:

- [ ] CSRF token取得とCookie更新、token付き成功/tokenなし419
- [ ] ログイン、登録、ログアウト、passkey（RP ID/origin含む）
- [ ] Google / LINE / Kakao のOAuth開始とcallback往復
- [ ] アカウント初期設定・切替・メンバー/書類閲覧・権限エラー
- [ ] 公開Wiki一覧/詳細、編集初期値、保存/レビュー、画像
- [ ] お問い合わせ201、入力422、未認証時/認証時の既存契約
- [ ] 旧 `/api/{context}` と未実装 `/api/v2` 未提供、新URLへだけ接続

実接続ゲート未実施の状態を「本番切り替え検証済み」と扱わない。
