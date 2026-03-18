# アーキテクチャ概要

## 1. システム概要

People Success Navigator は、社員コンディションの可視化とマネジメント支援を目的にした Web アプリケーションです。  
現状は FastAPI バックエンド + 静的 HTML/JavaScript フロントエンド + SQLite を中心に構成されています。

主な機能領域:

- ログイン認証
- ユーザー / 部署管理
- パルスサーベイ登録・閲覧
- チーム状態の可視化
- 離職リスク判定
- Dify を用いた AI 分析連携

---

## 2. 全体構成

```text
[Browser]
   │
   │ HTTP / Bearer Token
   ▼
[Static Frontend]
  backend/app/static/*.html
  backend/app/static/js/*.js
   │
   │ fetch('/api/v1/...')
   ▼
[FastAPI Backend]
  app/main.py
  app/api/v1/endpoints/*
   │
   ├─ CRUD Layer
   │   app/crud/*
   │
   ├─ Service Layer
   │   - dify_client.py
   │   - risk_judge_service.py
   │
   ├─ Security Layer
   │   - JWT
   │   - password hash
   │
   ▼
[Database]
  SQLite (default: backend/app.db)

[External AI]
   Dify API
```

---

## 3. レイヤ構成

### 3.1 Frontend

配置先: `backend/app/static/`

特徴:

- HTML / CSS / JavaScript による静的構成
- API 呼び出しは `fetch` ベース
- API のベース URL は JS 内で `http://127.0.0.1:8000/api/v1` を参照
- ローカルでは Live Server 等で `5500` ポート起動を想定

主な画面:

- `login.html`
- `dashboard-admin.html`
- `dashboard-manager.html`
- `dashboard-user.html`
- `employee-management.html`
- `team-overview.html`
- `pulse.html`
- `member-detail.html`
- `ai-chat.html`

### 3.2 API Layer

配置先: `backend/app/api/v1/endpoints/`

役割:

- HTTP リクエスト受付
- 認可 / 認証チェック
- CRUD / Service 呼び出し
- レスポンス整形

主なエンドポイント単位:

- `auth.py`: ログイン
- `users.py`: ユーザー管理
- `departments.py`: 部署管理
- `surveys.py`: パルスサーベイ
- `analytics.py`: チーム分析
- `alerts.py`: リスクアラート
- `risk_judge.py`: 離職リスク再判定

### 3.3 CRUD Layer

配置先: `backend/app/crud/`

役割:

- SQLAlchemy を通じた DB 操作の集約
- 単純な取得・更新・削除ロジック
- API Layer から直接 SQL を散らさないための分離

### 3.4 Service Layer

配置先: `backend/app/services/`

役割:

- 外部 API 連携
- ドメインロジックの集約
- 複数エンティティをまたぐ処理の実装

主なサービス:

- `dify_client.py`
  - Dify Workflow API の呼び出し
  - パルスサーベイメモ分析
  - 離職リスク判定
- `risk_judge_service.py`
  - 指定期間のサーベイ集計
  - Dify 判定結果をもとに `risk_alerts` を生成 / 更新

### 3.5 Data Layer

構成:

- SQLAlchemy Model: `backend/app/models/`
- Session/Engine: `backend/app/db/session.py`
- デフォルト接続先: `.env` の `DATABASE_URL`

現状のローカル運用では SQLite を前提にしており、`sqlite:///./app.db` を利用する形が主です。

---

## 4. 認証・認可

### 認証

- ログインは `/api/v1/auth/login`
- JWT を発行し、各 API へ `Authorization: Bearer <token>` を付与
- `OAuth2PasswordBearer` を利用

### 認可

`get_current_user` と `get_admin_user` を使って API ごとに制御しています。

基本方針:

- `admin`: 全権限
- `manager`: チームデータへのアクセス
- `user`: 自分のデータのみ

注意点:

- manager の可視範囲は「直属配下」を前提にした実装です
- 多段階組織や厳密な RBAC は現時点では未実装です

---

## 5. 主要ユースケース別フロー

### 5.1 ログイン

```text
Browser
  → POST /api/v1/auth/login
  → FastAPI が users を検索
  → パスワード照合
  → JWT 発行
  → Frontend が token 保存
```

### 5.2 パルスサーベイ登録

```text
User
  → POST /api/v1/pulse/
  → DB に pulse_surveys 登録
  → BackgroundTasks で Dify 分析実行
  → survey_analysis 登録
  → 必要に応じて score 補正
```

ポイント:

- サーベイ自体の保存は同期処理
- AI 分析はバックグラウンド処理
- Dify 障害時でもサーベイ保存自体は成立する設計

### 5.3 離職リスク判定（手動）

```text
Manager/Admin
  → POST /api/v1/judge/generate
  → 対象期間の pulse_surveys を収集
  → Dify へ scores / memos を送信
  → risk_alerts を生成または更新
  → 一覧画面が /alerts/team-risk で表示
```

### 5.4 離職リスク判定（日次バッチ）

```text
Scheduler / Manual Script
  → python scripts/run_daily_risk_judge.py
  → manager 一覧を取得
  → 各 manager 配下を順次判定
  → risk_alerts を batch 実行として保存
```

---

## 6. 離職リスク判定の設計意図

現状の実装では、離職リスクは「単一サーベイ」ではなく「一定期間のサーベイ系列」を対象に判定します。

入力データ:

- scores の配列
- memos の配列
- 対象期間（開始日・終了日）

保存単位:

- `user_id`
- `evaluation_start_date`
- `evaluation_end_date`

このため、同一期間で再実行した場合は新規作成ではなく update 扱いになります。  
手動実行とバッチ実行は `execution_type` で区別されています。

---

## 7. 外部連携

### Dify

利用箇所は主に 2 つです。

1. サーベイメモの分析
2. 離職リスク判定

環境変数:

- `DIFY_API_KEY`
- `DIFY_API_KEY2`

実装上の特徴:

- Dify の Workflow API を `response_mode=blocking` で呼び出し
- タイムアウトは 30 秒
- `DifyClient` と `DifyClient2` が用途別に分かれている

課題候補:

- API キー管理の整理
- エラーハンドリングの標準化
- リトライや監視の仕組み追加

---

## 8. 現状の強み

- レイヤ分離が比較的分かりやすい
- SQLite でローカル起動しやすい
- 静的フロントのため画面確認が容易
- リスク判定を service 化しており、手動・バッチの共通化ができている

---

## 9. 現状の制約・今後の改善ポイント

### 9.1 設定管理

- `SECRET_KEY` がコード直書き
- 環境別設定の切り分けが弱い
- `PROJECT_NAME` は設定されているが FastAPI インスタンスに未反映

### 9.2 DB 運用

- 起動時 `create_all` に依存しており、厳密なマイグレーション運用はまだ弱い
- Alembic ディレクトリはあるが、本格運用の痕跡はまだ薄い

### 9.3 API / ドメイン整備

- skill / intervention / ai consultation まわりはモデル先行で、公開 API はこれから
- 一部 import が残っているが実際には未使用のものがある
- manager の可視範囲は直属配下ベース

### 9.4 フロントエンド

- API ベース URL が固定値
- ビルド不要で扱いやすい反面、環境差し替えにはやや弱い
- 画面数増加に対して JS 分割規約は今後整備余地あり

---

## 10. 将来拡張の方向性

- `.env` へ `SECRET_KEY` を移行
- Alembic を正規のマイグレーション経路に統一
- スキル管理 API、AI相談 API、介入記録 API の追加
- manager 階層を考慮した可視範囲設計
- バッチ実行の cron / job runner 化
- フロントエンドの API URL・環境切替対応

---

## 11. ディレクトリごとの責務

```text
backend/app/api/        HTTP入口
backend/app/core/       設定・認証・セキュリティ
backend/app/crud/       DBアクセス
backend/app/models/     ORMモデル
backend/app/schemas/    入出力スキーマ
backend/app/services/   業務ロジック・外部連携
backend/app/static/     画面資産
backend/scripts/        初期化・バッチ・検証
backend/alembic/        将来/一部のマイグレーション資産
```

この構成は、今後サービス層や API の拡張を進めても比較的保守しやすい土台になっています。
