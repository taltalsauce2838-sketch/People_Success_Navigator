# 画面仕様書

## 概要

People Success Navigator の現状実装ベースの画面一覧と、各画面から利用している API を整理した資料です。  
開発途中のため、本書では **静的 HTML / JavaScript から確認できる実装内容** を優先して記載します。

- 画面配置: `backend/app/static/`
- フロント共通スクリプト: `backend/app/static/js/`
- API Base URL: `http://127.0.0.1:8000/api/v1`

補足:

- `app-shell.js` を利用する画面は、共通で `/users/me` を呼び出してログインユーザー情報・権限制御・サイドバー表示を行います。
- 一部画面は UI モック段階であり、専用 API 未接続です。
- `index.html` は現状空ファイルです。

---

## 画面一覧サマリ

| 画面 | ファイル | 想定ロール | 状態 | 主な利用API |
|---|---|---|---|---|
| ログイン | `login.html` | 未ログイン | 実装済み | `POST /auth/login`, `GET /users/me` |
| 権限別ダッシュボード振り分け | `dashboard.html` | 全ロール | 簡易実装 | `POST /auth/login`, `GET /users/me` |
| ユーザーダッシュボード | `dashboard-user.html` | user | 実装済み | `GET /users/me`, `GET /pulse/` |
| マネージャーダッシュボード | `dashboard-manager.html` | manager | 実装済み | `GET /analytics/team-status`, `GET /analytics/team-health`, `GET /alerts/team-risk`, `POST /judge/generate`, `POST /alerts/{alert_id}/resolve`, `GET /pulse/` |
| 管理者ダッシュボード | `dashboard-admin.html` | admin | 実装済み | `GET /users/`, `GET /departments/` |
| Pulse Survey | `pulse.html` | 全ロール | 実装済み | `GET /users/me`, `GET /pulse/`, `GET /pulse/by-user-date`, `POST /pulse/` |
| チーム状況 | `team-overview.html` | manager / admin | 実装済み | `GET /users/me`, `GET /analytics/team-status`, `GET /analytics/team-health`, `GET /alerts/team-risk`, `POST /alerts/{alert_id}/resolve`, `GET /pulse/` |
| 社員管理 | `employee-management.html` | admin | 実装済み | `GET /users/`, `POST /users/`, `DELETE /users/{id}`, `PUT /users/{id}/role`, `PUT /users/{id}/department`, `PUT /users/{id}/manager`, `GET /departments/`, `GET /pulse/` |
| メンバー詳細 | `member-detail.html` | manager / admin | 実装済み | `GET /pulse/` |
| 全社分析 | `company-analytics.html` | admin | UIモック | 共通 `/users/me` のみ |
| AI相談 | `ai-chat.html` | 全ロール | UIモック | 共通 `/users/me` のみ |
| スキル成長 | `skills.html` | 全ロール | UIモック | 共通 `/users/me` のみ |
| リファラル | `referral.html` | 全ロール | UIモック | 共通 `/users/me` のみ |
| 入口/未使用 | `index.html` | - | 空ファイル | なし |

---

## 共通仕様

### 認証

- ログイン成功後、JWT を `localStorage.access_token` に保存
- API 呼び出し時は `Authorization: Bearer <token>` を付与
- 未認証または権限不一致時はログイン画面または各ロールのダッシュボードへ遷移

### 共通レイアウト制御

対象: `app-shell.js` 利用画面

実施内容:

- `GET /users/me` でログインユーザー情報取得
- ロールごとにアクセス可能画面を判定
- サイドバー / 上部バー / 表示名 / 部署名を動的描画
- ログアウト時はトークン削除後 `login.html` へ遷移

### ロール別アクセス可能画面（現状実装）

- `user`
  - `dashboard-user.html`
  - `pulse.html`
  - `skills.html`
  - `ai-chat.html`
  - `referral.html`
- `manager`
  - 上記に加えて `dashboard-manager.html`, `team-overview.html`, `member-detail.html`
- `admin`
  - 上記に加えて `dashboard-admin.html`, `employee-management.html`, `company-analytics.html`, `member-detail.html`

---

## 画面別仕様

## 1. ログイン画面

- ファイル: `backend/app/static/login.html`
- スクリプト: `backend/app/static/js/auth.js`
- 想定ロール: 未ログインユーザー

### 目的

- メールアドレス / パスワードでログインし、ユーザーのロールに応じたダッシュボードへ遷移する

### 主な UI 要素

- ユーザーID入力
- パスワード入力
- ログインボタン
- エラーメッセージ表示エリア

### 利用 API

| メソッド | パス | 用途 |
|---|---|---|
| POST | `/auth/login` | ログイン認証、JWT取得 |
| GET | `/users/me` | ログイン後のロール判定と遷移先決定 |

### 遷移先

- `admin` → `dashboard-admin.html`
- `manager` → `dashboard-manager.html`
- `user` → `dashboard-user.html`

---

## 2. 権限別ダッシュボード振り分け画面

- ファイル: `backend/app/static/dashboard.html`
- スクリプト: `backend/app/static/js/auth.js`
- 想定ロール: 全ロール

### 目的

- 中継ページとして、保存済みトークンがある場合に `/users/me` からロールを判定して適切なダッシュボードへ移動する

### 備考

- 実質的には遷移用ページ
- 画面固有の業務 UI は持たない

---

## 3. ユーザーダッシュボード

- ファイル: `backend/app/static/dashboard-user.html`
- スクリプト: `backend/app/static/js/dashboard-user.js`, `app-shell.js`
- 想定ロール: `user`

### 目的

- 本人の直近の Pulse 状況を確認する
- 本日回答済みか、最新スコア、平均、連続回答日数を可視化する

### 主な表示内容

- 本日回答済み / 未回答ステータス
- 最新スコア
- 直近 2 週間平均
- 連続回答日数
- 直近 2 週間の推移グラフ
- 直近回答のタイムライン

### 利用 API

| メソッド | パス | 用途 |
|---|---|---|
| GET | `/users/me` | 本人情報取得 |
| GET | `/pulse/?user_id={me.id}` | 本人の Pulse 履歴取得 |

### 備考

- 画面内部では最新履歴や 14 日ウィンドウをフロント側で集計して表示
- 本日回答有無は `survey_date` と当日日付（Asia/Tokyo）で判定

---

## 4. マネージャーダッシュボード

- ファイル: `backend/app/static/dashboard-manager.html`
- スクリプト: `backend/app/static/js/dashboard-manager.js`, `app-shell.js`
- 想定ロール: `manager`

### 目的

- 自チームの健康状態・離職リスク・最新アラートを一覧把握する
- 必要に応じて離職リスク再判定を手動実行する

### 主な表示内容

- チーム人数 / 平均スコア等のサマリ
- チーム状態の推移グラフ
- リスク分布
- 高リスク / 要対応メンバー一覧
- アラート解消操作
- 期間指定付きの再判定実行ボタン

### 利用 API

| メソッド | パス | 用途 |
|---|---|---|
| GET | `/analytics/team-status` | チームメンバー一覧と最新状態取得 |
| GET | `/analytics/team-health?days=14` | チーム推移グラフ用データ取得 |
| GET | `/alerts/team-risk?days=14` | チームのリスクアラート一覧取得 |
| POST | `/judge/generate?days={n}` | 指定日数で離職リスク再判定を実行 |
| POST | `/alerts/{alert_id}/resolve` | アラート解消 / 未解消の更新 |
| GET | `/pulse/?user_id={member_id}` | 個別メンバーの直近 Pulse 補足取得 |
| GET | `/users/me` | 共通シェル表示・権限制御 |

### 備考

- `manager` は自チームのみ対象、`admin` で同画面に入った場合は全体対象として扱える実装になっている
- アラートは `is_resolved` の更新のみ実施
- 離職リスク判定期間は画面上の選択値をクエリパラメータに変換して送信

---

## 5. 管理者ダッシュボード

- ファイル: `backend/app/static/dashboard-admin.html`
- スクリプト: `backend/app/static/js/dashboard-admin.js`, `app-shell.js`
- 想定ロール: `admin`

### 目的

- ユーザー総数・ロール内訳・部署数など、管理者向けの全体サマリを確認する

### 主な表示内容

- 総ユーザー数
- Manager 数
- User 数
- 部署数
- 最近追加されたユーザー一覧

### 利用 API

| メソッド | パス | 用途 |
|---|---|---|
| GET | `/users/` | 全ユーザー一覧取得 |
| GET | `/departments/` | 全部署一覧取得 |
| GET | `/users/me` | 共通シェル表示・権限制御 |

### 備考

- 最近追加されたユーザーは `joined_at` 降順でフロント側ソートして上位表示

---

## 6. Pulse Survey 画面

- ファイル: `backend/app/static/pulse.html`
- スクリプト: `backend/app/static/js/pulse.js`, `app-shell.js`
- 想定ロール: 全ロール

### 目的

- 日次の Pulse Survey を登録する
- 当日回答済みかどうかの確認と、過去履歴の閲覧を行う

### 主な UI 要素

- 回答日
- スコア入力
- メモ入力
- 送信 / リセット
- 回答ステータス
- 回答結果サマリ
- 回答履歴一覧

### 利用 API

| メソッド | パス | 用途 |
|---|---|---|
| GET | `/users/me` | ログインユーザー情報取得 |
| GET | `/pulse/?user_id={me.id}` | 本人の履歴一覧取得 |
| GET | `/pulse/by-user-date?user_id={me.id}&survey_date={date}` | 特定日の回答有無確認 |
| POST | `/pulse/` | 当日の Pulse Survey 登録 |

### 備考

- 登録時の `user_id` はフロントから渡さず、API 側で `current_user.id` を採用
- 同日重複回答は API 側でエラーになる
- サーベイ登録後の AI 分析はバックグラウンド処理

---

## 7. チーム状況画面

- ファイル: `backend/app/static/team-overview.html`
- スクリプト: `backend/app/static/js/team-overview-chart.js`, `app-shell.js`
- 想定ロール: `manager`, `admin`

### 目的

- チーム全体の Pulse 推移とメンバー状態を一覧で確認する
- 注目メンバーの抽出やアラート解消を行う

### 主な表示内容

- チームサマリ
- チーム推移チャート
- 高リスク / 変動大 / 未回答継続 / 安定メンバーの抽出
- メンバー一覧の絞り込み・並び替え
- 詳細画面への導線

### 利用 API

| メソッド | パス | 用途 |
|---|---|---|
| GET | `/users/me` | 共通シェル表示・権限制御 |
| GET | `/analytics/team-status` | メンバー一覧と最新状態取得 |
| GET | `/analytics/team-health?days=14` | チーム推移取得 |
| GET | `/alerts/team-risk?days=14` | リスクアラート取得 |
| POST | `/alerts/{alert_id}/resolve` | アラート解消 |
| GET | `/pulse/?user_id={member_id}` | 個別メンバーの履歴補足取得 |

### 備考

- 実装内容はマネージャーダッシュボードと近く、より分析・一覧確認に寄せた画面
- メンバー詳細への遷移時にクエリパラメータで氏名・所属などの表示情報を引き継いでいる

---

## 8. 社員管理画面

- ファイル: `backend/app/static/employee-management.html`
- スクリプト: `backend/app/static/js/employee-management.js`, `app-shell.js`
- 想定ロール: `admin`

### 目的

- ユーザーの一覧確認、絞り込み、作成、更新、削除を行う
- 部署 / 上司 / ロールの管理を行う

### 主な UI 要素

- ユーザー一覧カード
- キーワード、ロール、部署、上司、離職リスクの絞り込み
- 並び替え
- 新規作成モーダル
- 編集モーダル
- 削除ボタン

### 利用 API

| メソッド | パス | 用途 |
|---|---|---|
| GET | `/users/` | 全ユーザー一覧取得 |
| POST | `/users/` | ユーザー新規作成 |
| DELETE | `/users/{user_id}` | ユーザー削除 |
| PUT | `/users/{user_id}/role` | ロール更新 |
| PUT | `/users/{user_id}/department` | 所属部署更新 |
| PUT | `/users/{user_id}/manager` | 上司更新 |
| GET | `/departments/` | 部署一覧取得 |
| GET | `/pulse/?user_id={user_id}` | 各ユーザーの最新 Pulse 補足取得 |
| GET | `/users/me` | 共通シェル表示・権限制御 |

### 備考

- 離職リスクの絞り込みは、最新 Pulse の `score` をもとにフロント側で `high / medium / low` 判定している
- 上司候補は `role != user` のユーザーをフロント側で抽出
- 部署マスタ自体の新規作成・編集・削除 UI はこの画面には未実装

---

## 9. メンバー詳細画面

- ファイル: `backend/app/static/member-detail.html`
- スクリプト: `backend/app/static/js/member-detail.js`, `app-shell.js`
- 想定ロール: `manager`, `admin`

### 目的

- 対象メンバーの Pulse 履歴詳細を時系列で確認する
- 将来的な介入メモ入力領域の UI を提供する

### 主な表示内容

- 基本情報サマリ
- 最新回答情報
- 履歴件数
- Pulse のタイムライン
- 戻る導線（社員管理 / チーム状況）

### 利用 API

| メソッド | パス | 用途 |
|---|---|---|
| GET | `/pulse/?user_id={user_id}` | 指定メンバーの Pulse 履歴取得 |
| GET | `/users/me` | 共通シェル表示・権限制御 |

### 備考

- 対象メンバーの基本情報は URL クエリ文字列から一部受け取り、Pulse 履歴だけ API から取得している
- 介入メモ入力欄はあるが、現状は保存 API に未接続

---

## 10. 全社分析画面

- ファイル: `backend/app/static/company-analytics.html`
- スクリプト: `backend/app/static/js/app-shell.js`
- 想定ロール: `admin`

### 目的

- 全社の離職傾向や組織比較を確認するための UI モック

### 現状

- KPI カードとプレースホルダチャートのみ
- 専用 API 接続なし

### 利用 API

| メソッド | パス | 用途 |
|---|---|---|
| GET | `/users/me` | 共通シェル表示・権限制御 |

---

## 11. AI相談画面

- ファイル: `backend/app/static/ai-chat.html`
- スクリプト: `backend/app/static/js/app-shell.js`
- 想定ロール: 全ロール

### 目的

- AI 一次相談チャット機能の UI モック表示

### 現状

- チャット履歴・入力欄の UI のみ
- 実際のチャット送受信、履歴保存、Dify 連携は未接続

### 利用 API

| メソッド | パス | 用途 |
|---|---|---|
| GET | `/users/me` | 共通シェル表示・権限制御 |

---

## 12. スキル成長画面

- ファイル: `backend/app/static/skills.html`
- スクリプト: `backend/app/static/js/app-shell.js`
- 想定ロール: 全ロール

### 目的

- 個人スキルの成長状況を表示するための UI モック

### 現状

- サマリテーブルとプレースホルダ表示のみ
- スキル API には未接続

### 利用 API

| メソッド | パス | 用途 |
|---|---|---|
| GET | `/users/me` | 共通シェル表示・権限制御 |

---

## 13. リファラル画面

- ファイル: `backend/app/static/referral.html`
- スクリプト: `backend/app/static/js/app-shell.js`
- 想定ロール: 全ロール

### 目的

- リファラル採用制度の案内と紹介フォーム UI の表示

### 現状

- 説明文と簡易フォーム UI のみ
- フォーム送信 API は未接続

### 利用 API

| メソッド | パス | 用途 |
|---|---|---|
| GET | `/users/me` | 共通シェル表示・権限制御 |

---

## 14. index.html

- ファイル: `backend/app/static/index.html`
- 想定ロール: -

### 現状

- 空ファイル
- ルーティング上の利用用途は未定

---

## 画面と API の対応マトリクス

| 画面 | `/auth/login` | `/users/me` | `/users/` | `/departments/` | `/pulse/` | `/pulse/by-user-date` | `/analytics/team-status` | `/analytics/team-health` | `/alerts/team-risk` | `/alerts/{id}/resolve` | `/judge/generate` |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `login.html` | ○ | ○ | - | - | - | - | - | - | - | - | - |
| `dashboard.html` | ○ | ○ | - | - | - | - | - | - | - | - | - |
| `dashboard-user.html` | - | ○ | - | - | ○ | - | - | - | - | - | - |
| `dashboard-manager.html` | - | ○ | - | - | ○ | - | ○ | ○ | ○ | ○ | ○ |
| `dashboard-admin.html` | - | ○ | ○ | ○ | - | - | - | - | - | - | - |
| `pulse.html` | - | ○ | - | - | ○ | ○ | - | - | - | - | - |
| `team-overview.html` | - | ○ | - | - | ○ | - | ○ | ○ | ○ | ○ | - |
| `employee-management.html` | - | ○ | ○ | ○ | ○ | - | - | - | - | - | - |
| `member-detail.html` | - | ○ | - | - | ○ | - | - | - | - | - | - |
| `company-analytics.html` | - | ○ | - | - | - | - | - | - | - | - | - |
| `ai-chat.html` | - | ○ | - | - | - | - | - | - | - | - | - |
| `skills.html` | - | ○ | - | - | - | - | - | - | - | - | - |
| `referral.html` | - | ○ | - | - | - | - | - | - | - | - | - |

---

## 現状のギャップ / 今後の追記候補

### 専用 API 未接続の画面

- `company-analytics.html`
- `ai-chat.html`
- `skills.html`
- `referral.html`

### 画面上は存在するが未保存の機能

- メンバー詳細画面の介入メモ保存
- AI相談画面のチャット送受信 / 履歴保存
- リファラル画面のフォーム送信
- スキル成長画面の実データ表示

### 次に作ると有用な関連資料

- 画面遷移図
- ロール別ユースケース一覧
- UI 項目定義書
- 画面イベント一覧（初期表示、検索、登録、更新、削除）

