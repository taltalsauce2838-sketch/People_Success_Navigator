from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from ..core.config import settings

# 設定ファイルからURLを取得
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

# SQLite特有の設定を動的に切り替え
connect_args = (
    {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}
)

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()