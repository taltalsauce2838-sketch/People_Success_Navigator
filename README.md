# 🚀 People Success Navigator
> **20260319 最終成果物**
> 組織のコンディションを可視化し、AIで改善を支援するオペレーショナル・インプロブメント・アプリ

---

## 📂 ディレクトリ構成

プロジェクトの全体像です。`app/` 内の各ディレクトリには、役割ごとにファイルを整理しています。

```text
project-root/
├── 📄 .env.example
├── 📄 .gitignore
├── 📄 README.md
│
├── 📁 backend/
│   ├── 🐍 main.py             # FastAPIエントリーポイント
│   ├── 📋 requirements.txt
│   ├── 📦 alembic/            # DBマイグレーション
│   └── 📂 app/
│       ├── 🌐 api/v1/         # APIエンドポイント
│       │   ├── 📄 ai_bridge.py
│       │   ├── 📄 auth.py
│       │   └── ...（各リソースのエンドポイント）
│       ├── ⚙️ core/            # config, security
│       ├── 💾 db/              # session, base
│       ├── 🏗️ crud/            # DB操作 (crud_user.py, etc.)
│       ├── 🔍 models/          # SQLAlchemyモデル
│       ├── 🛡️ schemas/         # Pydanticモデル
│       ├── 🛠️ services/        # 外部連携 (dify_client.py, etc.)
│       └── 🎨 static/          # フロントエンド (HTML/CSS/JS)
│           ├── 📄 index.html
│           ├── 📁 css/
│           └── 📁 js/
│
├── 📁 dify/                   # Difyワークフロー設定
└── 📁 docs/                   # 仕様書・設計書
