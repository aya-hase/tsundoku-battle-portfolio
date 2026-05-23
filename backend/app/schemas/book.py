# API返却型定義
from pydantic import BaseModel


class Book(BaseModel):
    title: str
    author: str | None = None
    itemUrl: str
    largeImageUrl: str | None = None
