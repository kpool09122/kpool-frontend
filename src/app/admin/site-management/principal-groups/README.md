# SiteManagement ユーザー権限管理UI（#447）

`SiteManagementPrincipalGroupManagementPanel` は通信を持たない、Client Component から使う画面。
`types.ts` に表示state・操作callbackを定義し、`membershipModel.ts` は純粋な所属編集関数を提供する。
管理ルート・メニュー・gateway・BFF・通信hook・認可・auth/me再取得は #448 の責務。

## #448 の接続

- `users` はAPIの `principals` を変換した独立した一覧。`groups.members` からユーザーを合成しない。
- `groups` はAPIの編集可能グループ一覧を変換する。表示モデルにはWikiのAccount/委譲/default等の必須項目を持ち込まない。
- バック #710 の一覧はOperatorグループを既に除外する。`roles` は任意の既知ロール名メタデータ（UpperCamelCase）。APIの `roleIdentifiers`（UUID）とは異なるため、UUIDを名前として渡さない。ロール名が取得できなければ省略する。既知のOperator混在グループはUIと編集モデルでも除外する。
- `membershipByGroup` は画面全体のdraft。hookが保存済み所属を別に保持し、`areSiteManagementMembershipsEqual(draft, saved)` で比較して `hasUnsavedChanges` を導出する。
- `updateUserGroups(identifier, groupIdentifiers)` は編集可能グループの選択集合（空なら全解除）。hookで `updateSiteManagementUserGroups(draft, groups, identifier, groupIdentifiers)` を適用する。Operator・未知グループや他ユーザーの所属は変更しない。
- `save()` は独立した一括保存操作。保存失敗時にdraftを初期化しない。成功時はサーバーの完全な応答でsavedとdraftを置き換える。送信payloadへの変換と対象グループ検証はhook/gatewayに残す。
- `loadError` と `saveError` は分離したローカライズ済みメッセージ。`t.loadFailed` / `t.saveFailed` / `t.saved` をfallbackに利用できる。例外・backend詳細を直接渡さない。
- 一覧再取得は `load()`、保存再試行は `save()`。未保存のdraftがある間は破壊的な再取得をUIで抑止する。
- `canManage` はSiteManagement専用の認可結果。Account/WikiやPrincipal IDの有無から推定しない。UIの抑止はサーバー認可の代わりにはならない。
- Account/操作主体切替時はhookのdraftを破棄し、画面にもAccount/Principalを識別するReact `key` を与え、古いダイアログ選択を持ち越さない。
- `isLoading` は初回取得だけでなく、一覧再取得中も含める。読み込み/保存中・権限喪失中は選択と確定を抑止する。

## ダイアログ

一時選択のみ画面内部に保持する。確定はdraft更新callbackのみ、キャンセル/Escapeは破棄。
ネイティブ `dialog.showModal()` により背景をinertにし、フォーカスを制約する。閉じたら開いたボタンへフォーカスを戻す。
表示stateでユーザーが消えた場合はそのダイアログを表示しない。小画面では高さを制限してスクロールする。

## 検証

`pnpm test:unit src/app/admin/site-management/principal-groups` で、通信なしのUI操作と編集モデルを検証する。
画面導線と実API・ブラウザE2Eは #448 で接続後に検証する。
