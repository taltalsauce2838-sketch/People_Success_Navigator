# DB設計書

## 概要

本書は現状の SQLAlchemy モデルおよび `backend/app.db` の実テーブル定義をもとに整理した DB 設計です。  
開発途中のため、将来変更される可能性がありますが、少なくとも現時点のローカル実装とは整合する内容でまとめています。

想定 DB:

- ローカル開発: SQLite
- 接続設定: `DATABASE_URL`

---

## ER 概要

```text
departments 1 --- n users
users 1 --- n pulse_surveys
users 1 --- n skills
users 1 --- n skill_history
users 1 --- n risk_alerts
users 1 --- n ai_consultations
users 1 --- n intervention_notes (author_id)
users 1 --- n intervention_notes (target_user_id)
users 1 --- n users (manager_id 自己参照)

skill_categories 1 --- n skills
skill_categories 1 --- n skill_history

pulse_surveys 1 --- n survey_analysis
```

---

## 1. departments

### テーブル概要

部署マスタ。ユーザーの所属先を管理します。

### カラム定義

| カラム名 | 型 | NULL | PK | UK | FK | 説明 |
|---|---|---|---|---|---|---|
| `id` | INTEGER | NO | ✓ |  |  | 部署ID |
| `name` | VARCHAR | NO |  | ✓ |  | 部署名 |
| `created_at` | DATETIME | YES |  |  |  | 作成日時 |

### 制約・備考

- `name` は一意
- ユーザーが所属している部署は API 上削除不可

---

## 2. users

### テーブル概要

システム利用ユーザーを管理します。社員・manager・admin を同一テーブルで保持します。

### カラム定義

| カラム名 | 型 | NULL | PK | UK | FK | 説明 |
|---|---|---|---|---|---|---|
| `id` | INTEGER | NO | ✓ |  |  | ユーザーID |
| `name` | VARCHAR | NO |  |  |  | 氏名 |
| `email` | VARCHAR | NO |  | ✓ |  | ログインメールアドレス |
| `hashed_password` | VARCHAR | NO |  |  |  | ハッシュ化済みパスワード |
| `role` | VARCHAR(7) | YES |  |  |  | `user / manager / admin` |
| `department_id` | INTEGER | YES |  |  | ✓ | 所属部署ID |
| `manager_id` | INTEGER | YES |  |  | ✓ | 上司ユーザーID（自己参照） |
| `joined_at` | DATE | YES |  |  |  | 入社日 |
| `created_at` | DATETIME | YES |  |  |  | 作成日時 |

### リレーション

- `department_id` → `departments.id`
- `manager_id` → `users.id`

### 制約・備考

- `email` は一意
- manager 階層は自己参照で表現
- 削除時、配下ユーザーの `manager_id` は `null` に更新される実装

---

## 3. pulse_surveys

### テーブル概要

日次のパルスサーベイ回答を保存します。

### カラム定義

| カラム名 | 型 | NULL | PK | UK | FK | 説明 |
|---|---|---|---|---|---|---|
| `id` | INTEGER | NO | ✓ |  |  | サーベイID |
| `user_id` | INTEGER | NO |  |  | ✓ | 回答者ユーザーID |
| `score` | FLOAT | NO |  |  |  | コンディションスコア |
| `memo` | TEXT | YES |  |  |  | 自由記述メモ |
| `survey_date` | DATE | NO |  |  |  | 回答対象日 |
| `created_at` | DATETIME | YES |  |  |  | 登録日時 |

### 制約・備考

- `user_id + survey_date` に一意制約あり
- `score` は `1 <= score <= 5` のチェック制約あり
- 登録後、メモがあれば AI 分析を実施し、スコア補正がかかる実装

---

## 4. survey_analysis

### テーブル概要

パルスサーベイに対する AI 分析結果を保持します。

### カラム定義

| カラム名 | 型 | NULL | PK | UK | FK | 説明 |
|---|---|---|---|---|---|---|
| `id` | INTEGER | NO | ✓ |  |  | 分析ID |
| `pulse_survey_id` | INTEGER | NO |  |  | ✓ | 対象サーベイID |
| `sentiment_score` | FLOAT | NO |  |  |  | 感情分析スコア |
| `reason` | VARCHAR | NO |  |  |  | 分析理由 |
| `created_at` | DATETIME | YES |  |  |  | 作成日時 |

### リレーション

- `pulse_survey_id` → `pulse_surveys.id`

### 備考

- 1件のサーベイに対して複数分析レコードを保持できる構造です
- 実運用上は再分析戦略を別途定める余地があります

---

## 5. risk_alerts

### テーブル概要

一定期間のサーベイ系列から生成された離職リスク判定結果を保存します。

### カラム定義

| カラム名 | 型 | NULL | PK | UK | FK | 説明 |
|---|---|---|---|---|---|---|
| `id` | INTEGER | NO | ✓ |  |  | アラートID |
| `user_id` | INTEGER | NO |  |  | ✓ | 対象ユーザーID |
| `status` | VARCHAR(6) | NO |  |  |  | `low / medium / high` |
| `reason` | TEXT | YES |  |  |  | 判定理由 |
| `confidence` | FLOAT | YES |  |  |  | 確信度 |
| `is_resolved` | BOOLEAN | NO |  |  |  | 対応済みフラグ |
| `evaluation_start_date` | DATE | NO |  |  |  | 評価期間開始日 |
| `evaluation_end_date` | DATE | NO |  |  |  | 評価期間終了日 |
| `judged_at` | DATETIME | NO |  |  |  | 判定日時 |
| `execution_type` | VARCHAR(6) | NO |  |  |  | `manual / batch` |
| `created_at` | DATETIME | NO |  |  |  | 作成日時 |
| `updated_at` | DATETIME | NO |  |  |  | 更新日時 |

### 制約・備考

- 一意制約: `user_id + evaluation_start_date + evaluation_end_date`
- 同じ評価期間で再判定した場合は update 扱い
- `status=high` の場合は未対応フラグのまま残す想定
- `status=low / medium` は新規作成時に自動で `is_resolved=true` となる実装

---

## 6. skill_categories

### テーブル概要

スキルカテゴリのマスタです。

### カラム定義

| カラム名 | 型 | NULL | PK | UK | 説明 |
|---|---|---|---|---|---|
| `id` | INTEGER | NO | ✓ |  | カテゴリID |
| `name` | VARCHAR | YES |  | ✓ | カテゴリ名 |
| `created_at` | DATETIME | YES |  |  | 作成日時 |

### 備考

- `name` は一意
- 現時点では公開 API 未整備だが、画面・将来機能向けの土台として存在

---

## 7. skills

### テーブル概要

ユーザーごとの最新スキルレベルを保持します。

### カラム定義

| カラム名 | 型 | NULL | PK | FK | 説明 |
|---|---|---|---|---|---|
| `id` | INTEGER | NO | ✓ |  | スキルレコードID |
| `user_id` | INTEGER | YES |  | ✓ | ユーザーID |
| `category_id` | INTEGER | YES |  | ✓ | スキルカテゴリID |
| `level` | INTEGER | YES |  |  | 現在レベル |
| `updated_at` | DATETIME | YES |  |  | 更新日時 |

### 備考

- 最新値テーブルとして使う想定
- `skill_history` と組み合わせて推移表示可能

---

## 8. skill_history

### テーブル概要

スキルレベルの履歴を保持します。

### カラム定義

| カラム名 | 型 | NULL | PK | FK | 説明 |
|---|---|---|---|---|---|
| `id` | INTEGER | NO | ✓ |  | 履歴ID |
| `user_id` | INTEGER | NO |  | ✓ | ユーザーID |
| `category_id` | INTEGER | NO |  | ✓ | スキルカテゴリID |
| `level` | INTEGER | YES |  |  | 記録時点のレベル |
| `created_at` | DATETIME | YES |  |  | 記録日時 |

### 備考

- スキル成長グラフや履歴表示に使う想定

---

## 9. ai_consultations

### テーブル概要

AI 相談ログを保持します。

### カラム定義

| カラム名 | 型 | NULL | PK | FK | 説明 |
|---|---|---|---|---|---|
| `id` | INTEGER | NO | ✓ |  | 相談ID |
| `user_id` | INTEGER | YES |  | ✓ | 相談者ユーザーID |
| `query_text` | TEXT | YES |  |  | ユーザー入力 |
| `sentiment_score` | FLOAT | YES |  |  | 感情分析スコア |
| `response_text` | TEXT | YES |  |  | AI 応答 |
| `ai_model` | VARCHAR | YES |  |  | 利用モデル名 |
| `token_usage` | INTEGER | YES |  |  | トークン使用量 |
| `created_at` | DATETIME | YES |  |  | 作成日時 |

### 備考

- テーブルは存在するが、現時点では公開 API は未整備

---

## 10. intervention_notes

### テーブル概要

manager によるフォロー・対応記録を保持します。

### カラム定義

| カラム名 | 型 | NULL | PK | FK | 説明 |
|---|---|---|---|---|---|
| `id` | INTEGER | NO | ✓ |  | 記録ID |
| `target_user_id` | INTEGER | YES |  | ✓ | 対象ユーザーID |
| `author_id` | INTEGER | YES |  | ✓ | 記録者ユーザーID |
| `content` | TEXT | YES |  |  | 記録内容 |
| `contact_type` | VARCHAR | YES |  |  | 接触方法 |
| `created_at` | DATETIME | YES |  |  | 作成日時 |

### 備考

- `users` に対して 2 本の FK を持つテーブル
- フォロー履歴管理のための拡張ポイント

---

## インデックス・一意制約の整理

主要なもの:

- `departments.name`: UNIQUE
- `users.email`: UNIQUE
- `pulse_surveys(user_id, survey_date)`: UNIQUE
- `risk_alerts(user_id, evaluation_start_date, evaluation_end_date)`: UNIQUE

補足:

- `users.id`, `departments.id` は主キー
- `users.id`, `users.email` はモデル定義上 index 対象

---

## データ上の設計ポイント

### 1. サーベイは「1日1件」

パルスサーベイはユーザー単位・日付単位で一意にしています。  
日次運用を前提とした分かりやすいモデルです。

### 2. リスク判定は「期間単位」

離職リスクは日単位ではなく期間単位で管理しています。  
これにより、7日・14日など複数日の傾向を 1 レコードとして持てます。

### 3. スキルは「最新値 + 履歴」

- `skills`: 現在値
- `skill_history`: 過去履歴

という分離になっており、参照系と履歴系の責務が明確です。

### 4. AI分析は補助テーブルで保持

サーベイ本体に AI カラムを混在させず、`survey_analysis` として分けているため、将来の分析手法差し替えや再分析にも対応しやすい構造です。

---

## 今後見直し候補

- `role` や `status` を DB 方言に依存しにくい形で明示整理する
- `skills` に `(user_id, category_id)` の一意制約を追加する
- `survey_analysis` の 1 survey あたり最新1件保証が必要なら一意制約追加を検討
- `intervention_notes` / `ai_consultations` の公開 API と監査要件を整理する
- PostgreSQL / MySQL 移行を見据えた型・制約の再検討

---

## テーブル一覧

| テーブル名 | 用途 |
|---|---|
| `departments` | 部署マスタ |
| `users` | ユーザー管理 |
| `pulse_surveys` | 日次サーベイ |
| `survey_analysis` | サーベイAI分析 |
| `risk_alerts` | 離職リスク判定 |
| `skill_categories` | スキルカテゴリマスタ |
| `skills` | 現在スキル |
| `skill_history` | スキル履歴 |
| `ai_consultations` | AI相談ログ |
| `intervention_notes` | フォロー記録 |
