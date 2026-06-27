---
name: architecture-review
description: kpool-frontend のフロントエンド設計・依存境界・責務分割をレビューする。Next.js App Router、src/app と src/components と src/gateways と packages/* の境界、React Server/Client Component、BFF Route Handler、React Query、Zodios生成型、eslint-plugin-boundaries に関する設計レビューで使う。
---

# Architecture Review

## 目的

kpool-frontend の変更が既存の設計境界と責務分担に合っているかをレビューする。フロントではバックエンドのDDD構造をそのまま持ち込まず、画面、BFF、ゲートウェイ、共有モデル、UI部品の分離を重視する。

## 現在の構造

- `src/app`: Next.js App Router のページ、レイアウト、Route Handler、ページ固有hook。
- `src/components`: ルート非依存のUIコンポーネント。`src/app` へ依存してはいけない。
- `src/gateways`: backend/API/BFF との接続、schema parse、fetch、認証やWiki APIの境界処理。
- `packages/wiki`: Wikiドメインのフロント共有モデル、URL生成、表示用変換、編集コード変換、画像モデル。`src/*` に依存してはいけない。
- `packages/types`: backend OpenAPI/Zodios由来の型とクライアント定義。
- `tests/e2e`: ユーザーフローの結合確認。

## 進め方

1. 差分の責務を分類し、置き場所が妥当か確認する。
2. `eslint.config.mjs` の境界ルールを前提に、逆依存やpackageからsrcへの依存がないか見る。
3. Server Component、Client Component、Route Handler、browser API利用の境界が混ざっていないか確認する。
4. 共有化の判断は、重複量ではなく責務の安定性で行う。ページ固有の都合を早すぎて共通化しない。

## 重点観点

- `packages/*` から `src/app`, `src/components`, `src/i18n` に依存していないか。
- `src/components` が `src/app` のroute/page/moduleに依存していないか。
- `use client` は必要な最小単位に閉じているか。Server Componentで扱えるfetch、cookies、headersまでClient化していないか。
- browser API、Zustand、React Query hooks、イベントハンドラがServer Componentへ混入していないか。
- BFF Route Handler はbackend URL、Cookie転送、Set-Cookie転送、エラー秘匿、schema parseを担当し、UIロジックを持ち込んでいないか。
- `src/gateways` は外部I/Oと変換を扱い、コンポーネント表示状態やDOM操作を持たないか。
- `packages/wiki` は純粋なモデル/変換/URL構築を中心にし、Next.jsやReact Queryに依存していないか。
- Zodios生成型はpackage rootからimportし、subpath importを増やしていないか。
- `throw`, `try/catch`, 明示的 `Promise<T>`, class, enum, 動的importの禁止方針と例外範囲に合っているか。
- React Query の queryKey が安定し、mutation後のキャッシュ更新が影響範囲に対して過不足ないか。
- 不要な状態管理を追加していないか。props、URL params、Server Componentの取得結果、React Query cache、既存のform stateで表現できるものを別の`useState`やstoreに複製していないか。
- 同じ事実を二重に保持していないか。例: 選択中IDと選択中オブジェクト、query dataとローカル配列、form入力値と派生プレビュー、権限判定結果と元のprincipal stateを別々に更新していないか。
- 階層データや編集データの正規構造が複数に分かれていないか。子要素一覧、flatten済み一覧、表示用ツリー、保存payload用ツリーをそれぞれstateとして持つと、編集画面、プレビュー、コード表示、保存処理が別々の正とするデータを参照してズレやすい。原則として更新対象の正規データは1つにし、他の形は導出する。
- 更新処理が一部の表現だけを書き換えていないか。追加、削除、並び替え、インライン編集、コード編集、保存payload生成が同じデータ源を通っているか確認する。
- 派生値を状態として保存していないか。filter/sort済みリスト、canReview/canPublish、表示ラベル、エラー文言、URLから復元できるタブ状態は、必要性がない限り計算で扱う。
- Zustandなどのグローバル状態は、複数の離れた画面が同じクライアント状態を共有する場合に限る。ページ内の一時状態やサーバーデータの置き場として使わない。
- mutation後にローカル状態だけを更新し、React Query cacheやサーバー由来の初期状態とズレる構造になっていないか。

## 判断基準

- ページ固有: `src/app/...` に置く。URL params、cookies、headers、初期SSR状態に密接なもの。
- 複数ページで再利用するUI: `src/components/...` に置く。ただしappのroute知識を渡さない。
- backend契約・fetch・schema変換: `src/gateways/...` に置く。
- Wikiの表示/編集/ルーティングに関する純粋処理: `packages/wiki` に置く。
- backend OpenAPI由来の契約: `packages/types` を更新元として扱い、手書きで重複型を作らない。
- 状態管理: server stateはReact QueryまたはServer Componentの取得結果に寄せ、URLで共有すべき状態はURLへ置き、コンポーネント内の一時的なUI操作だけをローカルstateに置く。

## 出力

設計指摘は、境界違反、責務の混在、将来の変更コスト、既存方針とのズレを中心に書く。代替案は「どこへ移すか」「何を引数で渡すか」「どの層に責務を残すか」まで具体化する。
