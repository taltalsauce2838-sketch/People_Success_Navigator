from sqlalchemy.orm import DeclarativeBase, declared_attr

class Base(DeclarativeBase):
    """
    全てのSQLAlchemyモデルが継承するベースクラス。
    """
    # クラス名からテーブル名を自動生成 (例: PulseSurvey -> pulse_survey)
    @declared_attr.directive
    def __tablename__(cls) -> str:
        return cls.__name__.lower()