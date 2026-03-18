# People Success Navigator

組織コンディションの可視化、パルスサーベイ運用、離職リスク判定、AI相談機能をまとめたアプリケーションです。  
バックエンドは FastAPI、フロントエンドは `backend/app/static/` 配下の静的ファイルで構成されています。

開発途中の成果物を前提に、現時点のディレクトリ構成と起動方法が分かるように整理しています。

---

## ディレクトリ構成

```text
People_Success_Navigator/
├── .env.example                  # 環境変数サンプル
├── README.md
├── backend/
│   ├── .env                      # ローカル実行用環境変数（実ファイル）
│   ├── app.db                    # SQLite DB（ローカル開発用）
│   ├── requirements.txt          # Python依存関係
│   ├── alembic/                  # マイグレーション関連
│   ├── app/
│   │   ├── main.py               # FastAPI エントリーポイント
│   │   ├── api/                  # API ルーター
│   │   │   └── v1/
│   │   │       ├── api.py
│   │   │       └── endpoints/    # auth / users / alerts / analytics など
│   │   ├── core/                 # 設定・認証・セキュリティ
│   │   ├── crud/                 # DBアクセス処理
│   │   ├── db/                   # DBセッション・ベース定義
│   │   ├── models/               # SQLAlchemy モデル
│   │   ├── schemas/              # Pydantic スキーマ
│   │   ├── services/             # Dify 連携・リスク判定などのサービス層
│   │   └── static/               # 静的フロントエンド（HTML/CSS/JS）
│   └── scripts/
│       ├── create_initial_admin.py
│       ├── create_initial_departments.py
│       ├── seed_team_overview_data.py
│       └── run_daily_risk_judge.py
├── dify/                         # Dify ワークフロー定義
│   ├── pulse_surveyコメントAI評価.yml
│   └── 離職リスクアラートAI判定.yml
└── docs/
    ├── api_spec.md               # API仕様
    ├── architecture.md           # アーキテクチャ概要
    ├── db_design.md              # DB設計
    ├── faq.md                    # FAQ一覧
    ├── operation_manual.md       # 運用手順書
    ├── screen_flow.md            # 画面遷移
    ├── screen_spec.md            # 画面一覧
    └── usecase.md                # 業務フロー単位の操作手順書

```

---

## 技術スタック

- Backend: FastAPI
- ORM: SQLAlchemy
- DB: SQLite（ローカル実行時）
- Frontend: HTML / CSS / JavaScript
- AI連携: Dify API

---

## 前提

ローカル起動は Python ベースです。  
現時点では `backend/requirements.txt` を使って依存関係を導入する構成になっています。

推奨事項:

- Python 3.11 以上での実行を想定
- 仮想環境を作成して利用
- 開発時は `backend/` を作業ディレクトリにして起動

※ Python の正式な固定バージョンは、この成果物からは断定しきれないため目安として記載しています。

---

## セットアップ

### 1. リポジトリ展開

```bash
cd People_Success_Navigator
```

### 2. 仮想環境作成

Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

macOS / Linux:

```bash
python -m venv .venv
source .venv/bin/activate
```

### 3. 依存関係インストール

```bash
cd backend
pip install -r requirements.txt
```

`requirements.txt` が文字コードの影響を受ける環境では、UTF-8 へ変換してから利用する運用も検討してください。

### 4. 環境変数設定

`backend/.env.example` をコピーして `backend/.env` を作成します。

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS / Linux:

```bash
cp .env.example .env
```

必要に応じて、DB接続先や Dify API Key を設定してください。

---

## 起動方法

### バックエンド起動

`backend/` ディレクトリで実行します。

```bash
uvicorn app.main:app --reload
```

起動後の想定:

- API: `http://127.0.0.1:8000`
- Swagger UI: `http://127.0.0.1:8000/docs`

### フロントエンド確認

フロントは静的HTMLで構成されています。  
API 側の CORS 設定には以下が含まれています。

- `http://127.0.0.1:5500`
- `http://localhost:5500`

そのため、たとえば VS Code の Live Server などで `backend/app/static/` 配下を 5500 番ポートで開く運用が想定されます。

例:

- `backend/app/static/index.html`
- `backend/app/static/dashboard-admin.html`
- `backend/app/static/dashboard-manager.html`
- `backend/app/static/dashboard-user.html`

---

## 初期データ投入・補助スクリプト

`backend/scripts/` に初期化・検証用スクリプトがあります。

### 初期管理者作成

```bash
python scripts/create_initial_admin.py
```

スクリプト内に初期値として以下が定義されています。

- email: `admin@example.com`
- password: `Admin1234!`

### サンプル部署作成

```bash
python scripts/create_initial_departments.py
```

### チーム表示用サンプルデータ投入

```bash
python scripts/seed_team_overview_data.py
```

### 離職リスク日次判定バッチ実行

```bash
python scripts/run_daily_risk_judge.py
```

オプション例:

```bash
python scripts/run_daily_risk_judge.py --days 7 --target-date 2026-03-17
```

`--target-date` 未指定時は前日基準で実行される実装になっています。

---

## 環境変数

主に利用されている環境変数は以下です。

| 変数名 | 用途 |
|---|---|
| `PROJECT_NAME` | アプリケーション名 |
| `DATABASE_URL` | DB接続文字列 |
| `DIFY_API_KEY` | Dify 連携用 API Key (pulse_surveyコメントAI評価用)|
| `DIFY_API_KEY2` | Dify 連携用 API Key（離職リスクアラートAI判定用） |

ローカルの SQLite を使う場合の例:

```env
DATABASE_URL=sqlite:///./app.db
```

---

## ドキュメント

AI連携まわりの素材は `dify/` 配下にあります。

- `dify/pulse_surveyコメントAI評価.yml`
- `dify/離職リスクアラートAI判定.yml`

---

## 注意事項

- 開発途中の成果物のため、本番デプロイ手順は未整理です。
- `.env` の実値はリポジトリへ含めず、ローカル環境ごとに設定してください。
- APIキーや認証情報はサンプル値で管理し、実運用値は安全な方法で配布してください。
- ローカル実行前提では SQLite を利用できますが、本番利用時は別DBへの切り替えを検討してください。

---

## 今後追加するとよさそうな項目

- 本番環境向けデプロイ手順
- `.env` の運用ルール
- テスト実行方法
- マイグレーション手順
- Dify ワークフロー更新手順
