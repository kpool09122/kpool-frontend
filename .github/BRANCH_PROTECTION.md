# ブランチ保護ルールの設定方法

このドキュメントでは、GitHub でブランチ保護ルールを設定して、CI が成功するまで `main` ブランチへのマージを禁止する方法を説明します。

## 設定手順

### 1. GitHub リポジトリの設定画面にアクセス

1. GitHub リポジトリのページに移動
2. `Settings` タブをクリック
3. 左サイドバーの `Branches` をクリック

### 2. ブランチ保護ルールを追加

1. `Add rule` ボタンをクリック
2. `Branch name pattern` に `main` と入力
3. 以下の設定を有効にする

#### 必須の設定

- ✅ **Require a pull request before merging**
  - `Require approvals` を有効にし、必要な承認者数を設定（推奨: 1 以上）
  - `Dismiss stale PR approvals when new commits are pushed` を有効にする

- ✅ **Require status checks to pass before merging**
  - `Require branches to be up to date before merging` を有効にする
  - `Status checks that are required` で以下を選択する
    - `check` (`.github/workflows/ci.yml` の集約ジョブ。`unit` と E2E の全分割が成功した場合のみ成功)

#### 推奨の設定

- ✅ **Require conversation resolution before merging**
- ✅ **Require signed commits**
- ✅ **Require linear history**
- ✅ **Include administrators**

### 3. 設定を保存

1. 設定が完了したら `Create` ボタンをクリック
2. 設定が反映されるまで数分待つ

## 設定後の動作

### 機能ブランチから `main` へのマージ時

1. プルリクエストを作成
2. CI が自動実行される
3. **`check` ジョブが成功するまでマージボタンが無効化される**
4. CI 成功後、承認者による承認が必要
5. 承認後にマージ可能になる

### 保護される内容

- ❌ CI が失敗している状態でのマージ
- ❌ 承認なしでのマージ
- ❌ ベースブランチが古い状態でのマージ
- ❌ 未解決の会話が残った状態でのマージ

## トラブルシューティング

### CI が失敗する場合

1. ローカルで `task check` を実行して問題を確認
2. ESLint やユニットテストの失敗を修正
3. `pnpm build` を実行してビルドエラーがないことを確認
4. 修正後に再 push して CI を実行

### 緊急時の対応

1. リポジトリ管理者に連絡
2. 一時的にブランチ保護ルールを無効化
3. マージ完了後に保護ルールを再度有効化

## 注意事項

- ブランチ保護ルールは管理者を含む全ユーザーに適用されます
- ステータスチェック名を変更した場合は、このドキュメントと GitHub 設定を合わせて更新してください
- CI の前提は `Node.js 26.10.0` と `pnpm 12.4.2` です

## E2E の並列実行

- `unit`（ESLint・単体テスト・通常ビルド）と `e2e` は並列に実行します。
- `e2e` は Chromium のテストを2分割し、各ジョブで2ワーカーを使用します。
- 各ジョブがモックを有効にしたアプリをビルド・起動します。外部APIの接続先は空にして、開発用の環境変数に依存しないようにしています。
- HTMLレポートは `playwright-report-1` / `playwright-report-2` として7日間保存します。リトライ時のトレースもレポートから確認できます。
- ローカルでは `pnpm exec playwright install chromium` の後に `pnpm test:e2e --workers=2` で実行できます。片方だけ実行する場合は `--shard=1/2` または `--shard=2/2` を指定します。
