---
name: update-issue
description: 既存のGitHub Issueを取得し、要件ヒアリング→詳細分析→更新の3ステップでAIファーストなIssue品質に引き上げる。kpool-frontendのNext.js / React / テスト構成を踏まえて既存Issueを改善するときに使う。
---

# GitHub Issue 更新スキル

あなたは既存の GitHub Issue をAIファースト品質に引き上げるファシリテーターです。
以下の3フェーズを順番に実行し、各フェーズの完了時に要点を確認してから次に進みます。

## プロジェクト情報

- リポジトリ: `kpool09122/kpool-frontend`
- GitHub Projects: `#1` (owner: `kpool09122`)
- 言語/FW: TypeScript / Next.js / React
- パッケージマネージャ: `pnpm`
- 主な確認コマンド: `task check`, `pnpm build`, `task test:unit`, `task test:e2e`
- 主なパス:
  - `src/app/`
  - `src/types/`
  - `src/test/`
  - `tests/e2e/`

## フェーズ1: 既存Issueの取得と要件ヒアリング

### Step 1: 既存Issueの取得

`gh issue view <Issue番号> --repo kpool09122/kpool-frontend --json title,body,labels,assignees,milestone,projectItems`

### Step 2: 現状の分析

取得したIssueから以下を整理します。

- 現在のタイトル
- 現在の本文
- 既存ラベル
- AIファーストなIssueとして不足している情報

### Step 3: 差分ヒアリング

既存Issueから読み取れない不足分だけをユーザーに確認します。

- 何をしたいか
- 関係する領域
- 期待する振る舞い
- 受け入れ条件
- 必要に応じて関連Issue、依存関係、UI変更有無、優先度、サイズ感

## フェーズ2: 詳細分析

コードベースを読んで以下を分析します。

1. 関連ファイルの特定
2. 既存実装パターンとテストパターンの確認
3. 影響範囲の調査
4. 実装方針と検証方針の策定

分析時は以下を重視します。

- App Router の責務分割
- UI変更の有無と確認観点
- API型定義の整合性
- テスト追加先の妥当性

分析結果を提示し、更新方針に問題がないか確認を取ります。

## フェーズ3: Issue更新

確認後、Issue本文を全体置換で更新します。

```markdown
## 概要

## 背景・動機

## AI向け実装指示

### 対象領域
- 領域名: `src/...` / `tests/e2e/...`

### 関連ファイル
- `src/...` - 変更理由
- `tests/e2e/...` - 変更理由

### 参考にすべき既存実装
- `src/...` - このパターンに倣う
- `src/app/...test.tsx` - テストパターンとして参照

### 実装ステップ
1. ...
2. ...
3. ...

### 設計上の制約・注意点
- ...

## 受け入れ条件
- [ ] ...
- [ ] ...

## テスト要件
- [ ] `task check`
- [ ] `pnpm build`
- [ ] 必要に応じて `task test:unit`
- [ ] 必要に応じて `task test:e2e`

## 補足情報
```

### Issue更新手順

1. `gh issue edit <Issue番号> --repo kpool09122/kpool-frontend --body-file <tmpファイル>` で本文更新
2. 必要ならタイトルも更新
3. ラベルを追加・整理
4. Project 未追加なら追加
5. 更新したIssueのURLを報告

### ラベルルール

- 領域:
  - `app-router`
  - `ui`
  - `api-types`
  - `auth`
  - `account`
  - `identity`
  - `monetization`
  - `wiki`
  - `webhook`
  - `test`
- タイプ:
  - `feature`
  - `bug`
  - `refactor`
  - `research`
  - `chore`

## 重要な原則

- 既存Issueの有用な情報は捨てずに引き継ぐ
- ファイルパスは実在するものだけ記載する
- 既存パターンを明示する
- 更新前後の差分が大きい場合は何を変えたか説明する
- UI変更がある場合は確認方法を追記する
