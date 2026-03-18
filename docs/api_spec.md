# API仕様書

## 概要

People Success Navigator の現状実装ベースの API 一覧です。  
開発途中のため、ここでは「現時点で FastAPI に実装されているエンドポイント」を優先して整理しています。

- Base URL: `http://127.0.0.1:8000/api/v1`
- 認証方式: Bearer Token（JWT）
- ログイン API 以外は基本的に認証が必要
- Swagger UI: `http://127.0.0.1:8000/docs`

---

## 認証・権限

### ロール

- `user`: 一般社員
- `manager`: マネージャー
- `admin`: 管理者

### 権限制御の基本

- `admin`
  - 全ユーザー・全サーベイ・全部署にアクセス可能
- `manager`
  - 自分配下のメンバーに関する情報へアクセス可能
  - 一部 API では自分自身の情報も参照対象に含む
- `user`
  - 原則として自分自身の情報のみアクセス可能

---

## Auth

### POST `/auth/login`

ログインしてアクセストークンを取得します。  
`OAuth2PasswordRequestForm` を使用しているため、`application/x-www-form-urlencoded` 形式で送信します。

#### Request

| 項目 | 型 | 必須 | 説明 |
|---|---|---:|---|
| `username` | string | ✓ | メールアドレス |
| `password` | string | ✓ | パスワード |

#### Response

```json
{
  "access_token": "<jwt>",
  "token_type": "bearer"
}
```

#### エラー

- `401 Unauthorized`: メールアドレスまたはパスワード不正

---

## Users

### GET `/users/me`

ログイン中ユーザーのプロフィールを取得します。

#### Response

```json
{
  "id": 1,
  "name": "Initial Admin",
  "email": "admin@example.com",
  "role": "admin",
  "department_id": null,
  "manager_id": null,
  "joined_at": null
}
```

---

### POST `/users/`

ユーザーを新規作成します。`admin` のみ実行可能です。

#### Request

```json
{
  "name": "山田 太郎",
  "email": "yamada@example.com",
  "password": "Password123!",
  "role": "user",
  "department_id": 1,
  "manager_id": 2,
  "joined_at": "2026-03-01"
}
```

#### 備考

- `role` は `user / manager / admin`
- `department_id` は任意
- `manager_id` は任意

#### 主なエラー

- `400 Bad Request`: メールアドレス重複、role 不正
- `404 Not Found`: 部署または manager が存在しない

---

### GET `/users/`

ユーザー一覧を取得します。`admin` のみ実行可能です。

#### Response

```json
[
  {
    "id": 1,
    "name": "Initial Admin",
    "email": "admin@example.com",
    "role": "admin",
    "department_id": null,
    "manager_id": null,
    "joined_at": null
  }
]
```

---

### DELETE `/users/{user_id}`

ユーザーを削除します。`admin` のみ実行可能です。

#### 備考

- 削除対象ユーザーが manager の場合、その配下ユーザーの `manager_id` は `null` に更新されます

#### Response

```json
{ "message": "user deleted" }
```

---

### PUT `/users/{user_id}/role`

ユーザーのロールを更新します。`admin` のみ実行可能です。

#### Request

```json
{ "role": "manager" }
```

---

### PUT `/users/{user_id}/department`

ユーザーの所属部署を更新します。`admin` のみ実行可能です。

#### Request

```json
{ "department_id": 3 }
```

---

### PUT `/users/{user_id}/manager`

ユーザーの上司を更新します。`admin` のみ実行可能です。

#### Request

```json
{ "manager_id": 5 }
```

#### 備考

- `null` を指定すると manager 解除
- 自分自身を manager に設定することは不可

---

## Departments

### GET `/departments/`

部署一覧を取得します。`admin` のみ実行可能です。

### GET `/departments/{department_id}`

部署詳細を取得します。`admin` のみ実行可能です。

### POST `/departments/`

部署を新規作成します。`admin` のみ実行可能です。

#### Request

```json
{ "name": "開発3部" }
```

### PUT `/departments/{department_id}`

部署名を更新します。`admin` のみ実行可能です。

#### Request

```json
{ "name": "開発本部" }
```

### DELETE `/departments/{department_id}`

部署を削除します。`admin` のみ実行可能です。

#### 備考

- 所属ユーザーが残っている部署は削除不可

#### Response

```json
{
  "message": "部署を削除しました",
  "deleted_department_id": 3,
  "deleted_department_name": "開発3部"
}
```

---

## Pulse Survey

### GET `/pulse/`

パルスサーベイ一覧を取得します。

#### Query Parameters

| 項目 | 型 | 必須 | 説明 |
|---|---|---:|---|
| `user_id` | integer |  | 対象ユーザーID |

#### 権限仕様

- `admin`
  - `user_id` 未指定: 全件取得
  - `user_id` 指定: 指定ユーザー分を取得
- `user`
  - 自分自身のサーベイのみ取得可能
- `manager`
  - 自分配下メンバー + 自分自身の範囲のみ取得可能

---

### GET `/pulse/by-user-date`

指定ユーザー・指定日のサーベイを取得します。

#### Query Parameters

| 項目 | 型 | 必須 | 説明 |
|---|---|---:|---|
| `user_id` | integer | ✓ | 対象ユーザーID |
| `survey_date` | date | ✓ | 対象日 |

#### 主なエラー

- `403 Forbidden`: 権限対象外ユーザー
- `404 Not Found`: 対象サーベイが存在しない

---

### POST `/pulse/`

ログインユーザー自身のパルスサーベイを登録します。

#### Request

```json
{
  "score": 4,
  "memo": "少し忙しいですが順調です",
  "survey_date": "2026-03-18"
}
```

#### 挙動

- 同一ユーザー・同一日の重複登録は禁止
- 登録後、`memo` がある場合はバックグラウンドタスクで Dify 連携を実行
- AI 分析結果は `survey_analysis` に保存され、`score` が補正される実装です

#### 主なエラー

- `400 Bad Request`: 同日のサーベイが既に存在

---

### DELETE `/pulse/`

指定ユーザー・指定日のサーベイを削除します。`admin` のみ実行可能です。

#### Query Parameters

| 項目 | 型 | 必須 | 説明 |
|---|---|---:|---|
| `user_id` | integer | ✓ | 削除対象ユーザーID |
| `survey_date` | date | ✓ | 削除対象日 |

#### Response

```json
{
  "message": "Pulse Surveyを削除しました",
  "deleted_user_id": 10,
  "deleted_survey_date": "2026-03-18"
}
```

---

## Team Analytics

### GET `/analytics/team-status`

チーム一覧の最新状態を取得します。`manager / admin` のみ実行可能です。

#### 概要

各メンバーについて、以下の最新値を返します。

- 最新のリスク判定結果
- 最新のサーベイスコア

#### Response

```json
{
  "team_summary": {
    "member_count": 5,
    "avg_survey_score": 3.6
  },
  "members": [
    {
      "user_id": 12,
      "name": "山田 健太",
      "risk_level": "medium",
      "latest_survey_score": 3
    }
  ]
}
```

---

### GET `/analytics/team-health`

チーム全体のコンディション推移グラフ用データを取得します。`manager / admin` のみ実行可能です。

#### Query Parameters

| 項目 | 型 | 必須 | 説明 |
|---|---|---:|---|
| `days` | integer |  | 取得日数（1〜90、デフォルト30） |

#### Response

```json
{
  "labels": ["03/05", "03/06", "03/07"],
  "datasets": [
    {
      "user_id": 12,
      "label": "山田 健太",
      "data": [4, 3, null]
    }
  ]
}
```

---

## Risk Alerts

### GET `/alerts/team-risk`

チームの最新リスクアラート一覧を取得します。`manager / admin` のみ実行可能です。

#### Query Parameters

| 項目 | 型 | 必須 | 説明 |
|---|---|---:|---|
| `days` | integer |  | 直近何日分の評価期間を対象にするか（1〜90） |

#### Response

```json
{
  "member_count": 5,
  "unresolved_count": 2,
  "high_count": 1,
  "members": [
    {
      "alert_id": 8,
      "user_id": 12,
      "name": "山田 健太",
      "risk_level": "high",
      "confidence": 0.86,
      "is_resolved": false,
      "reason": "スコア低下が連続しているため",
      "last_alert_date": "2026-03-17",
      "evaluation_start_date": "2026-03-11",
      "evaluation_end_date": "2026-03-17",
      "judged_at": "2026-03-18T09:00:00",
      "updated_at": "2026-03-18T09:00:00",
      "execution_type": "batch"
    }
  ]
}
```

---

### POST `/alerts/{alert_id}/resolve`

アラートの対応済みフラグを更新します。`manager / admin` のみ実行可能です。

#### Request

```json
{ "is_resolved": true }
```

#### Response

```json
{
  "alert_id": 8,
  "user_id": 12,
  "is_resolved": true,
  "updated_at": "2026-03-18T10:00:00"
}
```

---

## Risk Judge

### POST `/judge/generate`

前日までの直近 N 日分のサーベイを対象に離職リスク判定を実行します。  
`manager / admin` のみ実行可能です。

#### Query Parameters

| 項目 | 型 | 必須 | 説明 |
|---|---|---:|---|
| `days` | integer |  | 分析対象日数（1〜15、デフォルト7） |
| `manager_id` | integer |  | `admin` のみ指定可能 |

#### 権限仕様

- `manager`
  - 自チームのみ再判定可能
- `admin`
  - `manager_id` 指定時: 指定 manager 配下のみ実行
  - `manager_id` 未指定時: 全 manager 配下を対象に実行

#### Response イメージ

```json
{
  "generated_count": 3,
  "manager_id": 2,
  "days": 7,
  "survey_start_date": "2026-03-11",
  "survey_end_date": "2026-03-17",
  "execution_type": "manual",
  "results": [
    {
      "user_id": 12,
      "name": "山田 健太",
      "alert_id": 31,
      "action": "created",
      "risk_level": "high",
      "confidence": 0.88,
      "reason": "スコア低下とネガティブメモが継続",
      "survey_count": 6,
      "latest_survey_id": 120,
      "requires_action": true,
      "is_resolved": false,
      "evaluation_start_date": "2026-03-11",
      "evaluation_end_date": "2026-03-17",
      "judged_at": "2026-03-18T08:59:59",
      "execution_type": "manual"
    }
  ]
}
```

---

## 未実装・未公開扱いのもの

現状のコードベースを見る限り、以下はまだ API として確立していないか、ルーター未登録です。

- `skills` 関連エンドポイント
- `ai_bridge` 関連エンドポイント
- `AI consultation` / `intervention_notes` の公開 API

そのため、本資料では「将来拡張予定の領域」として扱っています。

---

## 補足

- `Base.metadata.create_all(bind=engine)` により、起動時にテーブル作成を試みる実装です
- Alembic ディレクトリはありますが、現時点では README / 実装上ともにマイグレーション運用は主経路ではなさそうです
- リクエスト/レスポンスの厳密な型は Swagger UI と `app/schemas/` を正として確認してください
