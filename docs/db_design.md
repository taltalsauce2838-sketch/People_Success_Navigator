1. departments テーブル
•	テーブル概要:
o	テーブル名: departments 
o	概要: 社員が所属する部署情報を管理するマスターテーブル 
o	目的: usersテーブルで部署を参照するための部署マスタ 
o	関連テーブル: users 
•	カラム定義:
o	id: Integer (PK), 部署の一意識別ID 
o	name: String, 部署名（Unique, Not Null） 
o	created_at: DateTime, 部署レコード作成日時 
2. users テーブル
•	テーブル概要:
o	テーブル名: users 
o	概要: システムを利用する社員の基本情報および権限を管理する 
o	目的: 社員管理・ログイン認証・各種データの紐付け 
o	関連テーブル: departments / pulse_surveys / skills / skill_history / risk_alerts / ai_consultations / intervention_notes 
•	カラム定義:
o	id: Integer (PK), 社員ID 
o	name: String, 社員名 
o	email: String (Unique), ログイン用メールアドレス 
o	hashed_password: String, ハッシュ化されたパスワード 
o	role: Enum, ユーザー権限（user / manager / admin） 
o	department_id: Integer (FK), 所属部署ID 
o	manager_id: Integer (FK), 上司ユーザーID（users自己参照） 
o	joined_at: Date, 入社日 
o	created_at: DateTime, レコード作成日時 
3. pulse_surveys テーブル
•	テーブル概要:
o	テーブル名: pulse_surveys 
o	概要: 社員の日次コンディションを収集するパルスサーベイデータ 
o	目的: 従業員コンディションの可視化および離職リスク分析。1日1回の投稿制限を含む 
o	関連テーブル: users / risk_alerts / survey_analysis 
•	カラム定義:
o	id: Integer (PK), サーベイID 
o	user_id: Integer (FK), 回答した社員ID 
o	score: Integer, コンディション評価（1〜5） 
o	memo: Text, コメント・メモ 
o	survey_date: Date, 回答対象日（1日1回制御用） 
o	created_at: DateTime, 回答日時 
•	制約: user_id と survey_date の組み合わせによる一意性制約（uq_user_survey_date） 
4. skill_categories テーブル
•	テーブル概要:
o	テーブル名: skill_categories 
o	概要: スキルカテゴリを管理するマスターテーブル 
o	目的: skills / skill_historyテーブルで参照されるスキル名称を統一管理 
o	関連テーブル: skills / skill_history 
•	カラム定義:
o	id: Integer (PK), スキルカテゴリID 
o	name: String (Unique), スキル名称 
o	created_at: DateTime, 作成日時 
5. skills テーブル
•	テーブル概要:
o	テーブル名: skills 
o	概要: 社員ごとの最新のスキルレベルを管理する 
o	目的: スキル成長の可視化やグラフ表示 
o	関連テーブル: users / skill_categories 
•	カラム定義:
o	id: Integer (PK), スキルレコードID 
o	user_id: Integer (FK), 社員ID 
o	category_id: Integer (FK), スキルカテゴリID 
o	level: Integer, スキル習熟度 
o	updated_at: DateTime, 最終更新日時 
6. risk_alerts テーブル
•	テーブル概要:
o	テーブル名: risk_alerts 
o	概要: AIによる離職リスク判定結果を保存する 
o	目的: マネージャーへのアラート表示や対応判断。判定元サーベイとの紐付けを保持 
o	関連テーブル: users / pulse_surveys 
•	カラム定義:
o	id: Integer (PK), アラートID 
o	user_id: Integer (FK), 対象社員ID 
o	status: Enum, リスクレベル（low / medium / high） 
o	reason: Text, AI判定理由 
o	ai_model: String, 使用AIモデル 
o	confidence: Float, 判定確信度 
o	is_resolved: Boolean, 対応済みフラグ 
o	pulse_survey_id: Integer (FK), 判定元となったパルスサーベイのID 
o	created_at: DateTime, 判定日時 
7. ai_consultations テーブル
•	テーブル概要:
o	テーブル名: ai_consultations 
o	概要: 社員がAIに相談した内容と回答ログ 
o	目的: AI相談履歴管理および感情分析 
o	関連テーブル: users 
•	カラム定義:
o	id: Integer (PK), 相談ログID 
o	user_id: Integer (FK), 相談者ID 
o	query_text: Text, ユーザーの相談内容 
o	sentiment_score: Float, 感情分析スコア 
o	response_text: Text, AI回答内容 
o	ai_model: String, 使用AIモデル 
o	token_usage: Integer, 使用トークン数 
o	created_at: DateTime, 相談日時 
8. intervention_notes テーブル
•	テーブル概要:
o	テーブル名: intervention_notes 
o	概要: マネージャーによる社員フォロー記録 
o	目的: 面談や対応履歴の記録 
o	関連テーブル: users（対象者および記録者） 
•	カラム定義:
o	id: Integer (PK), 記録ID 
o	target_user_id: Integer (FK), 対象社員ID 
o	author_id: Integer (FK), 記録したマネージャーID 
o	content: Text, 面談内容・対応記録 
o	contact_type: String, 接触方法（面談 / チャット / 電話等） 
o	created_at: DateTime, 記録日時 
9. skill_history テーブル（新規）
•	テーブル概要:
o	テーブル名: skill_history 
o	概要: 社員のスキル習熟度の変遷を記録する履歴テーブル 
o	目的: 成長可視化グラフ等で過去の推移を表示するためのデータ保持 
o	関連テーブル: users / skill_categories 
•	カラム定義:
o	id: Integer (PK), 履歴ID 
o	user_id: Integer (FK), 社員ID 
o	category_id: Integer (FK), スキルカテゴリID 
o	level: Integer, その時点の習熟度 
o	created_at: DateTime, 記録日時 
10. survey_analysis テーブル（新規）
•	テーブル概要:
o	テーブル名: survey_analysis 
o	概要: パルスサーベイのフリーコメント等に対するAI分析結果を保持する 
o	目的: 感情分析スコアなどを個別に管理し、詳細なコンディション分析に活用する 
o	関連テーブル: pulse_surveys 
•	カラム定義:
o	id: Integer (PK), 分析ID 
o	pulse_survey_id: Integer (FK), 対象のサーベイID 
o	sentiment_score: Float, AIによる感情スコア（-1.0〜1.0等） 
o	model_used: String, 使用したAIモデル名やバージョン 
o	created_at: DateTime, 分析レコード作成日時 
