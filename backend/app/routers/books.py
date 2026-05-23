# 検索・登録・一覧API

from fastapi import APIRouter, Query
from app.services.rakuten_books import search_books

router = APIRouter(prefix="/api/books", tags=["books"])


@router.get("/search")
async def search(
    q: str = Query(..., description="検索キーワード"),
    page: int = Query(1, ge=1, description="ページ番号"),
):
    data = await search_books(q, page)
    return data
