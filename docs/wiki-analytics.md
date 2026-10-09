# 公開Wikiの閲覧・回遊計測

公開Wikiの閲覧成立とWiki間のリンク操作を `dataLayer` に送り、GTMからGA4へ転送する。事務所が対象・地域・期間別の関心を調べるための計測であり、閲覧数を来場・購入の見込み人数とは扱わない。

## 現在の準備状況

- GTMのWebコンテナ: `GTM-T958HN6F`（ユーザーが作成済み）。
- GA4: アカウント・プロパティ作成済み。レポートのタイムゾーンは固定UTCを使用する方針。
- 本番URLが未定のため、Webストリームは未作成。`G-...` の測定IDは未発行。
- この変更でGTM・GA4の管理設定や公開を実施したわけではない。実GA4への到達確認も未実施。

## アプリの設定

計測する環境だけ、ビルド時に以下を設定する。

```dotenv
NEXT_PUBLIC_ANALYTICS_ENABLED=true
NEXT_PUBLIC_GTM_ID=GTM-T958HN6F
```

`.env.example` は無効（`false`）が既定。有効値が厳密に `true` で、IDが `GTM-` と英大文字・数字からなる場合のみGTMを読み込み、イベントを送る。未設定・不正なIDでは無効になる。公開環境変数なので秘密情報は設定しない。値を変えた本番環境は再ビルド・再デプロイする。

計測処理は `src/gateways/analytics/wikiAnalytics.ts`、GTM読み込みと画面の接続は `src/components/Analytics/` にある。送信がブロックされてもWiki操作を継続する。

## イベント契約（v1）

| dataLayerのevent | GA4イベント名 | 発火条件 |
| --- | --- | --- |
| `wiki_page_view` | `page_view` | 公開Wikiのデータ表示が成立したとき |
| `wiki_link_click` | `wiki_link_click` | 公開Wiki内の対象リンクを操作したとき |

閲覧は初回表示、別パスへの遷移、戻る・進むによる再訪で記録する。同じパスでの再描画・データ再取得は追加の閲覧にしない。編集・プレビュー・エラー表示では閲覧イベントを出さない。クエリやハッシュだけの変更は新しい閲覧にしない。

共通パラメーターはフラットなキーで送る。クリックでは `wiki_*` が遷移元を表す。

| キー | 内容 |
| --- | --- |
| `analytics_schema_version` | 数値 `1` |
| `wiki_id` | 表示中のWikiページID |
| `wiki_translation_set_id` | 翻訳を束ねるID。同一対象を言語横断で集計する軸 |
| `wiki_type` | Wikiのリソース種別 |
| `wiki_language` | コンテンツの言語。ブラウザー言語・居住地とは別 |
| `page_location` | 表示中の完全なURL（クエリを含む） |
| `page_referrer` | 初回は `document.referrer`、アプリ内遷移では直前のURL |
| `page_title` | Wikiタイトル。未設定時は基本情報の名称 |

初回の外部参照元と流入URLのキャンペーン情報を保持し、GTMでもこれらの値を渡す。外部流入の分析にはGA4のセッションの参照元・メディアなどを使い、内部回遊は次のクリック情報で調べる。

| クリック専用キー | 内容 |
| --- | --- |
| `target_wiki_id` | リンクから取得できる遷移先ID。取得不能なら `null` |
| `target_wiki_type` | 関連情報が持つ種別を優先し、なければ遷移先slugから判別する。判別不能なら `null` |
| `target_wiki_language` | 遷移先パスの言語 |
| `link_path` | 同一オリジンの遷移先パス（クエリ・ハッシュを除く） |
| `link_placement` | `basic_info` / `related_profile` / `body` |

基本情報・関連プロフィール・本文のWikiリンクを対象とする。通常クリック、修飾キー付きクリック、中ボタンの別タブ操作を記録し、リンク本来の動作を妨げない。右クリックメニューからの操作は記録できない。外部URLは対象外。クリック数は遷移先の表示成功数とは別の指標であり、操作後に遷移が中断される場合もある。

閲覧イベントではクリック専用キーをすべて `null` に戻す。これはGTMのデータモデルに前のクリック情報を残さないためで、GA4の閲覧タグにはクリック専用パラメーターを設定しない。

## GTM・GA4の設定手順

1. 本番URL決定後、GA4でWebストリームを作成し、測定ID `G-...` を取得する。
2. GTMで「Googleタグ」を作成し、タグIDに測定IDを指定する。設定パラメーター `send_page_view` をブール値 `false` にし、初期化（Initialization - All Pages）で発火させる。
3. GA4のWebストリームにある拡張計測機能で、ページビューの自動計測（特にブラウザー履歴変更によるページビュー）を無効にする。GTMにも履歴変更・All Pagesで `page_view` を送る別タグを作らない。`send_page_view=false` だけでは拡張計測の履歴イベントを止められない。[公式の手動ページビュー設定](https://developers.google.com/analytics/devguides/collection/ga4/views?hl=ja)
4. 上表の各キーを、GTMのデータレイヤー変数（バージョン2）として作成する。例: 変数名 `DLV - wiki_id`、データレイヤーの変数名 `wiki_id`。
5. カスタムイベントトリガーを2つ作り、イベント名をそれぞれ `wiki_page_view` と `wiki_link_click` に完全一致させる。正規表現は不要。[カスタムイベントトリガー](https://support.google.com/tagmanager/answer/7679219?hl=ja)
6. 「Googleアナリティクス: GA4イベント」タグを2つ作る。同じ測定IDを使い、閲覧タグはイベント名 `page_view`、クリックタグは `wiki_link_click` とする。それぞれ対応するカスタムイベントトリガーで発火させる。
7. 両タグのイベントパラメーターに共通キーと対応する `{{DLV - ...}}` を指定する。クリックタグにだけクリック専用キーも指定する。`event` 自体をGA4パラメーターとして追加しない。[dataLayerの扱い](https://developers.google.com/tag-platform/devguides/datalayer)
8. GA4の「カスタム定義」で、下記のカスタムディメンションをイベントスコープで登録する。
9. GTM Preview・GA4 DebugViewで下記の確認を行い、確認できたコンテナバージョンを公開する。

登録するカスタムディメンションは `wiki_id`、`wiki_translation_set_id`、`wiki_type`、`wiki_language`、`target_wiki_id`、`target_wiki_type`、`target_wiki_language`、`link_path`、`link_placement`。表示名は任意だが、イベントパラメーター名は契約と一致させる。

`page_location`、`page_referrer`、`page_title`、国・地域・参照元などはGA4の標準項目を利用し、重複するカスタム定義を作らない。スキーマバージョンは送信するが、通常の分析用ディメンション登録は不要。ID・パスは値の種類が多くなるため、件数が増えるとレポートの `(other)` 行などの制約に注意する。カスタム定義のレポート反映には時間がかかる。[カスタム定義の公式説明](https://support.google.com/analytics/answer/14240153?hl=ja)

Googleタグは共通レイアウトで初期化するため、GA4の自動イベントがWiki以外で生じる可能性がある。Wiki分析では必ず `page_view` とWiki識別子で範囲を絞り、プロパティ全体のユーザー数をWiki閲覧者数として使わない。

## 分析の単位

- 閲覧数: `eventName = page_view` かつ対象の `wiki_id` または `wiki_translation_set_id` に絞ったイベント数。
- 閲覧者数: 同じ範囲・期間に対する総ユーザー数（Data APIでは `totalUsers`）。GA4の識別方法による人数であり、実在する個人の確定人数ではない。
- 同一対象の全言語: 翻訳セットで絞り、言語軸を外して人数を再集計する。言語別・ページ別・日別のユーザー数は重複するので足し合わせない。
- 地域・流入: 国・地域、セッションの参照元／メディアと、Wikiのコンテンツ言語を組み合わせる。GA4標準の言語項目を `wiki_language` の代わりにしない。
- 回遊: `wiki_link_click` に絞り、遷移元・先の種別と配置箇所を比較する。ID不明のリンクは `link_path` で確認する。

指標・ディメンションの組み合わせは実際の探索またはData APIで互換性を確認する。[GA4の標準指標・ディメンション](https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema)

UTCの日別集計は日本時間の09:00から翌09:00に相当する。将来、任意の現地時間の1日へ組み替える際は、UTCの日別合計に時差を加えるだけでは不十分。期間内でユーザーの重複を除ける元データと時刻の保存設計を別途行う。BigQuery連携やアプリ内集計テーブルは今回の実装範囲に含めない。

将来のアプリ内地域集計は、バックエンドの `CountryCode` と `AdministrativeAreaCode` に合わせる。国別を基本に、日本の47都道府県など定義済みの地域だけを対応づける。GA4の地域名・IDをバックエンドの州コードとして直接保存しない。国が分かり地域が未対応なら国別に残し、国も不明なら不明として残す。GA4の推定地域は居住地の保証ではない。

## 検証と残作業

実GA4への到達確認と自動テストは別に扱う。Playwrightはテスト用コンテナIDを使い、Googleへの通信を遮断した状態で `dataLayer` の内容と画面操作を確認する。

```sh
pnpm exec playwright test tests/e2e/wiki-analytics.spec.ts --workers=1
```

- [x] 自動テスト・型チェック・lintの結果を記録する。
- [ ] Webストリームを作り、測定IDを取得する。
- [ ] 認証済みの管理画面またはAPIでGTM・GA4を設定する。
- [ ] PreviewでWikiの初回表示、別Wikiへの移動、戻る・進むで閲覧タグが各1回発火する。
- [ ] 再描画、編集・プレビュー、読み込み失敗でWiki閲覧タグが増えない。
- [ ] 基本情報・関連プロフィール・本文からのリンク操作で正しい遷移元と遷移先が届く。クリック後の閲覧に古いクリック情報が混ざらない。
- [ ] 外部からの流入で初回の参照元とキャンペーン付きURLを維持し、Wikiへ内部遷移した際の直前URLも確認する。
- [ ] DebugViewで `page_view` と `wiki_link_click` のパラメーターを確認し、自動ページビューとの二重計上がない。
- [ ] 計測無効・GTMブロック時もWikiを閲覧・操作できる。
- [ ] 対象・言語・地域・期間・流入元の探索を確認し、検証日時・環境・結果を記録する。
- [ ] 確認済みGTMバージョンを公開し、本番環境の設定を反映する。

実測の記録: **未実施**（Webストリーム未作成）。

2026-10-10のローカル検証:

- `pnpm test:unit`: 164ファイル・1,041テスト成功。地域言語のパス判定を補強後、計測関連12テストも再実行して成功。
- `pnpm exec tsc --noEmit`: 成功。
- `pnpm lint`: エラー0。変更対象外の既存未使用変数に関する警告4件。
- `pnpm exec playwright test tests/e2e/wiki-analytics.spec.ts --workers=1`: 本番ビルド成功、Chromiumの2シナリオ成功（公開／編集画面の往復・履歴移動、本文リンクの別タブ操作）。GTM通信は遮断。
- `git diff --check`: 成功。
