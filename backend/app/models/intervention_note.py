from sqlalchemy import Column, Integer, ForeignKey, Text, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

from .base import Base


class InterventionNote(Base):
    __tablename__ = "intervention_notes"

    id = Column(Integer, primary_key=True)

    target_user_id = Column(Integer, ForeignKey("users.id"))

    author_id = Column(Integer, ForeignKey("users.id"))

    content = Column(Text)

    contact_type = Column(String)

    created_at = Column(DateTime, default=datetime.utcnow)

    target_user = relationship("User", foreign_keys=[target_user_id])

    author = relationship("User", foreign_keys=[author_id])