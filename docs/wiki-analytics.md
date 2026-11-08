# App全体・公開WikiのGA4計測

公開・ログイン・mypage・管理・編集・プレビューを同一GA4プロパティに送る。App利用者数とWiki閲覧者数は別の指標であり、来場・購入の見込み人数ではない。

## 設定と責務

計測環境のビルド時だけ以下を設定する。未設定・`false`・不正なIDではGTMもイベントも無効。タグ遮断・dataLayer書き込み拒否でも画面操作を継続する。

```dotenv
NEXT_PUBLIC_ANALYTICS_ENABLED=true
NEXT_PUBLIC_GTM_ID=GTM-T958HN6F
```

- `src/gateways/analytics/wikiAnalytics.ts`: マウント単位のページ状態・送信境界。永続的な利用者状態を持たない。
- `src/components/Analytics/AnalyticsProvider.tsx`: 共通レイアウトのGTM読み込み、ルート・visibilitychange・pagehide/pageshow接続。
- `PublicWikiAnalytics`: 公開データの表示成立とWikiリンク操作だけを通知。共有プレビューに置かない。
- `docs/gtm-production.json`: **インポート候補**。ユーザー提供の既存コンテナ設定を基にAppイベントとGoogleタグのコンテキスト更新を追加したもので、公開済みコンテナを取得した証拠ではない。測定IDは同じ定数 `G-C9ZP7VT7TN`、コンテナは `GTM-T958HN6F`。管理画面で所有先・対象ストリームを再確認する。

## イベント契約（analytics_schema_version = 1）

| dataLayer event | GTM/GA4の動作 | 条件 |
| --- | --- | --- |
| `analytics_context` | Googleタグのページ設定を更新後、`app_screen` | 各パスの確定時、公開Wikiの表示成立時 |
| `app_page_view` | `page_view` | 非公開Wikiルート以外の全App画面（管理・編集・プレビュー・非Wikiの失敗画面も含む） |
| `wiki_page_view` | `page_view` | 公開Wikiのデータ表示成立時だけ |
| `analytics_page_end` | `app_page_end` | 前画面を離れる直前、Wikiデータ適用前、背景化・離脱 |
| `wiki_link_click` | `wiki_link_click` | 公開Wikiの基本情報・関連プロフィール・本文のWikiリンク操作 |

`app_screen` はApp利用の観測用で、`page_view` ではない。公開パスで読み込み失敗・空状態ならWiki page_viewを作らず、Wiki属性なしのApp利用だけを観測する。読み込み中の時間もWiki時間には含めない。

公開パスは `^/(ja|en|ko)/wiki/[^/]+/?$` または `^/wiki/(ja|en|ko)/[^/]+/?$` だけ。編集・管理・プレビュー・言語なしの旧URLはWiki分析対象ではない。リダイレクト後は最終パスで判定する。初回、別パス、戻る・進むで閲覧を記録し、同一パスの再描画・クエリ・ハッシュ変更では増やさない。公開Wikiには追加のApp page_viewを送らない。

### パラメーターと個人情報

共通キーは `analytics_schema_version`、`wiki_id`、`wiki_translation_set_id`、`wiki_type`、`wiki_language`、`page_location`、`page_referrer`、`page_title`。

- Wiki識別子は公開データ由来。非Wiki・失敗・読み込み中の画面では4つの `wiki_*` を**明示的なnull**に戻す。
- URL・参照元はoriginとpathnameだけ。クエリ、ハッシュ、URL資格情報を除去する。キャンペーンクエリも保持しない。非Wikiのタイトルは固定の `k-pool` とし、編集中のタイトルや入力を読まない。
- token、メール、Cookie、Identity/Principal情報、フォーム入力・本文を送らない。GTMでもフォーム自動計測・ユーザー提供データ収集・ユーザーID設定は有効にしない。
- GoogleタグをInitialization/All Pagesで先行発火させず、最初のサニタイズ済みコンテキストで初期化する。拡張計測の履歴・フォーム・クリック等も管理画面で無効にする。自動収集が元URL/入力を拾わないことは実Previewで確認する。

クリック専用キーは `target_wiki_id`、`target_wiki_type`、`target_wiki_language`、`link_path`、`link_placement`（`basic_info` / `related_profile` / `body`）。遷移元のWiki属性を使用し、不明な対象IDはnull。同一オリジンの公開Wikiリンクだけが対象。通常・修飾・中ボタン操作を記録し、preventDefaultしない。右クリックメニューは対象外。閲覧とコンテキスト更新はクリックキーを全てnullに戻す。

### 時間の帰属と送信順

1. 前ページの完全なスナップショット（URL、タイトル、Wiki属性）で `analytics_page_end` → GA4 `app_page_end` を送る。
2. **その後**Googleタグの `config` を `update=true` / `send_page_view=false` と次画面のコンテキストで更新する。dataLayer変数だけの変更ではなくGoogleタグ設定そのものを更新する。
3. 次画面が公開Wikiなら、表示が成立するまでWiki属性はnull。表示成立時も未帰属時間を先に送出してからWiki属性を適用する。
4. 閲覧イベントを送る。Googleタグ更新はGTMの `app_screen` タグのsetup tagに指定し、設定更新より先に次画面のイベントを送らない。

GA4が自動付与する `engagement_time_msec` を使用する。アプリ独自のタイマーで同じ時間を加算しない。背景化→pagehideの連続通知は1回に抑制し、visible/pageshow（bfcacheを含む）で再開する。再開でpage_viewは増やさない。GTMの遅延・ブロック時に送出保証はなく、タブ強制終了時も完全取得は保証しない。

**重要:** 自動テストは上の送信・設定順とスナップショットを検証するが、Googleタグ内部の時計・自動イベントの生成順までは再現しない。GA4が前画面の時間を `app_page_end` に付与し、次画面へ持ち越さないこと、nullで自動イベントの属性が消えることを実Preview/DebugView/Data APIで確認するまで実帰属を検証済みとはしない。

## GTM・GA4管理手順（外部公開は別の承認作業）

1. 本番GA4ストリームのホストがbackend `FRONTEND_URL` のホストと一致すること、プロパティのレポートタイムゾーンがUTCであることを確認する。
2. JSONを未公開ワークスペースへインポートし、差分をレビューする。既存のGoogleタグと二重設置しない。Googleタグは `app_screen` のsetup tagだけで発火。`send_page_view=false`、`update=true`、サニタイズ済みURLと共通Wiki属性を設定する。
3. GA4の拡張計測（特にブラウザー履歴によるページビュー、フォーム、外部リンク）とGTMの別All Pages/History page_viewタグを無効にする。Googleタグ設定だけでは拡張計測を止められない。
4. `wiki_page_view` と `app_page_view` は**1つ**のGA4 `page_view` タグを使う。`analytics_page_end` は旧コンテキストの `app_page_end`、`analytics_context` は設定更新→`app_screen` の順。GTMのデータレイヤー変数はv2。
5. イベントスコープのカスタム定義を登録: `wiki_id`、`wiki_translation_set_id`、`wiki_type`、`wiki_language`、`target_wiki_id`、`target_wiki_type`、`target_wiki_language`、`link_path`、`link_placement`。自動イベントでもWikiキーが使えることを確認する。標準URL・タイトル・国を重複してカスタム定義しない。
6. Previewで初回、Wiki間、ja/en/ko、両公開パス、編集・管理往復、履歴移動、読み込み失敗、背景化・離脱を確認する。旧画面のend→次context→次viewの順、page_view各1回、非Wiki属性null、機微なクエリ・入力なしを調べる。
7. DebugViewで `app_screen`、`app_page_end`、`page_view`、`user_engagement` 等のURL・Wiki属性・時間を確認する。背景・離脱後の自動イベントでも旧画面の時間を次Wikiへ移さないことを照合する。
8. 承認後にのみ公開し、公開コンテナバージョン、公開日時、アプリビルド・ホスト・GA4プロパティ・測定IDを記録する。DebugViewと公開版の実測は別証拠として扱う。

公式: [手動page_view](https://developers.google.com/analytics/devguides/collection/ga4/views)、[ユーザーエンゲージメント](https://support.google.com/analytics/answer/11109416)、[dataLayer](https://developers.google.com/tag-platform/devguides/datalayer)、[Data API](https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema)。

## backend #840 / #842 と分析単位

- **App利用者**: `FRONTEND_URL` のホスト全体に絞った、独立取得の日別 `totalUsers`。日別人数を期間で延べ加算する。Wiki別・国別ユーザー数からApp人数を作らない。
- **Wiki閲覧回数**: 両公開パス＋Wiki識別子、`eventName=page_view` の `eventCount`。
- **Wiki延べ閲覧者数**: 同じ閲覧条件の **日×Wiki×言語×国** セルの `totalUsers` を延べ加算。翻訳セット・ALL・期間の合計は実人数の重複除外ではない。同一利用者の別日・別Wiki・別言語・別国での重複を含む。
- **Wiki合計時間**: 両公開パス＋イベントスコープのWiki属性に絞った `userEngagementDuration`。**page_view限定にしない**。`app_page_end`・自動 `user_engagement` 等に付いた時間を含める。編集・管理はパスとnull属性で除外する。
- **国**: 標準 `countryId`。国不明とWiki属性欠損は別。GA地域は居住地を保証せず、backendの州コードへ直接保存しない。
- **期間**: UTC日付、開始・終了日を含む最長暦年1年、上限UTC D-3。UTC 1日は日本時間09:00〜翌09:00。任意現地時間への単純な日次値の時差シフトは不可。
- **登録者残高**: Identity単位の選択最終日残高。期間合計ではない。日別推移を併記し、Wiki・言語フィルターを適用しない。
- **提出者・公開者**: 期間内のactor Principalをそれぞれ重複除外（国別人数の加算で全体人数を作らない）。このIssueは分析APIや画面指標を新設しない。
- 保存済み0は `measured`、行なしは `not_collected` / null、指標・定義不足は `missing`、部分欠損は `incomplete`。取込失敗を0にせず最後の成功値を保持する。

Data API実照合ではUTCの少量の日付・Wiki・言語・国に限定し、Appホスト日別人数、Wiki閲覧（page_view限定）と時間（非限定）を別runReportで比較する。`rowCount`、全ページ、`(other)`、しきい値、サンプリング、属性欠損、quotaを記録し、不完全結果を完全値としない。カスタム定義の反映待ち・データ確定待ちも未検証として残す。

## 検証証拠と残作業

ローカル自動テストはGTM/GA通信を遮断する。JSON構造テストもインポート・公開の成功やGoogleタグ内部の動作を保証しない。E2Eのライフサイクルはイベントdispatchで、OSによる実タブ背景化・実beacon到達の証拠ではない。

```sh
pnpm test:unit src/gateways/analytics 'src/app/wiki/[slug]/WikiAnalytics.test.tsx'
task check
pnpm exec tsc --noEmit
pnpm exec playwright test tests/e2e/wiki-analytics.spec.ts tests/e2e/app-analytics.spec.ts --workers=1
pnpm test:e2e --workers=2
```

2026-11-08の検証結果（Node.js 26.12.1 / pnpm 12.4.2）:

- `task check`: 初回はunit中にディスク容量不足（`ENOSPC`）で停止。Issue専用の生成キャッシュだけを削除し、要求どおりNode.js 26.12.1の絶対パスを使用した `VITEST_MAX_WORKERS=2 task check` の最終再実行は成功（lint／本番build／292ファイル・2,636テスト）。
- `pnpm test:unit --maxWorkers=2`: 292ファイル・2,636テスト成功。
- `pnpm exec tsc --noEmit`: build後に成功。
- analytics対象Playwright: 4テスト成功。全E2E: 117成功、無効ビルド専用1テストはスキップ。
- `E2E_ANALYTICS_ENABLED=false pnpm exec playwright test tests/e2e/app-analytics-disabled.spec.ts --workers=1`: 無効ビルド専用1テスト成功。
- 公開コンテナ `https://www.googletagmanager.com/gtm.js?id=GTM-T958HN6F`: HTTP 200、測定ID `G-C9ZP7VT7TN` と既存Wikiイベントを確認。`app_page_view` は見つからず、このインポート候補が公開済みであることは確認していない。
- GTM管理画面はGoogleログインが必要。既存ADCでのGA4 Admin API・GTM APIの読み取り照会はいずれも403 `insufficient authentication scopes`。GA4 Data APIの値は取得していない。

GTMの公開・GA4設定変更は行っていない。次を**未検証**として残す:

- JSONの実GTMインポート、Googleタグsetup/config update、null解除、自動engagementの元ページ帰属。
- GA4実カスタム定義・UTC設定、DebugViewでの全フロー、公開版GTMの到達と二重送信なし。
- Data APIの実値・品質とbackend保存値の照合、D-3の確定データ、Scheduler/実行基盤。

実証時には `日時 / 環境・ビルド / 公開GTM version / GA4 property・stream / 操作 / DebugView値 / runReport条件と値 / backend保存結果 / 未解決差分` を残す。Mockテスト結果でこの欄を埋めない。
