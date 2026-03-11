# People_Success_Navigator
20260319_最終成果物

・ディレクトリ構成
project-root/
│  .env.example             # 環境変数のサンプルファイル [cite: 1, 11]
│  .gitignore               # Git管理除外設定 [cite: 1, 11, 12]
│  README.md                # プロジェクト説明書 [cite: 1, 11]
│
├─backend/                  # バックエンド（FastAPI）ソースコード [cite: 1, 12]
│  │  requirements.txt      # Pythonパッケージ依存リスト [cite: 1, 12]
│  │
│  ├─alembic/               # DBマイグレーション管理 [cite: 1, 12]
│  └─app/                   # アプリケーションメインロジック [cite: 1, 12]
│      │  main.py           # FastAPIエントリーポイント [cite: 1, 12]
│      │
│      ├─api/               # APIルート定義 [cite: 1, 12]
│      │  │  deps.py        # 共通依存性（認証など） [cite: 1, 12]
│      │  │
│      │  └─v1/             # API バージョン1 [cite: 1, 12]
│      │      │  api.py     # ルーター統合 [cite: 1, 12]
│      │      │
│      │      └─endpoints/  # 各リソースのエンドポイント [cite: 2, 13]
│      │              ai_bridge.py
│      │              analytics.py
│      │              auth.py
│      │              skills.py
│      │              surveys.py
│      │              users.py
│      │
│      ├─core/              # システム設定・セキュリティ [cite: 3, 14]
│      │      config.py     # 環境変数設定
│      │      security.py   # JWT/パスワード関連
│      │
│      ├─crud/              # データベース操作（CRUD） [cite: 3, 15]
│      │      crud_ai_consultation.py
│      │      crud_base.py
│      │      crud_department.py
│      │      crud_intervention_note.py
│      │      crud_pulse_survey.py
│      │      crud_risk_alert.py
│      │      crud_skill.py
│      │      crud_skill_category.py
│      │      crud_skill_history.py
│      │      crud_survey_analysis.py
│      │      crud_user.py
│      │
│      ├─db/                # データベース接続管理 [cite: 4, 16]
│      │      base.py       # Baseモデル
│      │      session.py    # セッション管理
│      │
│      ├─models/            # SQLAlchemyモデル（DBテーブル定義） [cite: 5, 16]
│      │      ai_consultation.py
│      │      base.py
│      │      department.py
│      │      intervention_note.py
│      │      pulse_survey.py
│      │      risk_alert.py
│      │      skill.py
│      │      skill_category.py
│      │      skill_history.py
│      │      survey_analysis.py
│      │      user.py
│      │
│      ├─schemas/           # Pydanticモデル（データバリデーション） [cite: 6, 18]
│      │      ai_consultation.py
│      │      base.py
│      │      department.py
│      │      intervention_note.py
│      │      pulse_survey.py
│      │      risk_alert.py
│      │      skill.py
│      │      skill_category.py
│      │      skill_history.py
│      │      user.py
│      │
│      ├─services/          # 外部API連携・ロジック [cite: 7, 19]
│      │      ai_service.py # AI関連ビジネスロジック
│      │      calculator.py # 計算処理
│      │      dify_client.py # Dify APIクライアント
│      │
│      └─static/            # フロントエンド静的ファイル [cite: 7, 20]
│          │  admin_dashboard.html
│          │  ai_consult.html
│          │  dashboard.html
│          │  employee_management.html
│          │  index.html
│          │  member_detail.html
│          │  team_dashboard.html
│          │
│          ├─css/
│          │      style.css [cite: 9, 20]
│          │
│          └─js/            # JavaScriptロジック [cite: 9, 21]
│                  admin.js
│                  ai_chat.js
│                  api.js
│                  skill_chart.js
│                  survey.js
│                  team.js
│
├─dify/                     # Dify ワークフロー設定 [cite: 10, 21]
│      prompts.md           # プロンプト管理
│      workflow.yml         # ワークフローエクスポート
│
└─docs/                     # プロジェクトドキュメント [cite: 11, 22]
        api_spec.md         # API仕様書
        architecture.md     # アーキテクチャ図
        db_design.md        # DB設計書
