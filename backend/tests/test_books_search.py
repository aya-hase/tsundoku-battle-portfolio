# ============================================
# 書籍検索APIのテスト
# backend/tests/test_books_search.py
#
# 実行方法（プロジェクトルートで）:
#   docker compose exec backend python -m pytest tests/ -v
# ============================================
import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport
from app.main import app


# ============================================
# TC-SEARCH-01: 正常検索（タイトル検索）
# 入力: 書籍タイトル → 期待: 検索結果が返る
# ============================================
@pytest.mark.asyncio
async def test_search_by_title():
    """タイトルで検索すると結果が返ること"""
    # 楽天APIのモック（実際のAPIを叩かない）
    mock_response = {
        "count": 1,
        "Items": [
            {
                "Item": {
                    "title": "こころ",
                    "author": "夏目漱石",
                    "isbn": "9784101010137",
                    "largeImageUrl": "https://example.com/image.jpg",
                    "itemCaption": "テスト用の説明",
                    "booksGenreId": "001004008",
                    "size": "文庫",
                    "publisherName": "新潮社",
                }
            }
        ],
        "has_next": False,
        "page": 1,
    }

    with patch(
        "app.routers.books.search_books",
        new_callable=AsyncMock,
        return_value=mock_response,
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get("/api/books/search", params={"q": "こころ"})

    assert res.status_code == 200
    data = res.json()
    assert data["count"] >= 1
    assert len(data["Items"]) >= 1
    assert data["Items"][0]["Item"]["title"] == "こころ"


# ============================================
# TC-SEARCH-02: 著者名検索
# 入力: 著者名 → 期待: 結果が返る
# ============================================
@pytest.mark.asyncio
async def test_search_by_author():
    """著者名で検索すると結果が返ること"""
    mock_response = {
        "count": 1,
        "Items": [
            {
                "Item": {
                    "title": "こころ",
                    "author": "夏目漱石",
                    "isbn": "9784101010137",
                    "largeImageUrl": "https://example.com/image.jpg",
                    "itemCaption": "テスト用の説明",
                    "booksGenreId": "001004008",
                    "size": "文庫",
                    "publisherName": "新潮社",
                }
            }
        ],
        "has_next": False,
        "page": 1,
    }

    with patch(
        "app.routers.books.search_books",
        new_callable=AsyncMock,
        return_value=mock_response,
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get("/api/books/search", params={"q": "夏目漱石"})

    assert res.status_code == 200
    data = res.json()
    assert data["count"] >= 1
    assert data["Items"][0]["Item"]["author"] == "夏目漱石"


# ============================================
# TC-SEARCH-03: 空検索
# 入力: "" → 期待: 422エラー（バリデーションエラー）
# ============================================
@pytest.mark.asyncio
async def test_search_empty_query():
    """空文字で検索するとバリデーションエラーになること"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # qパラメータなし → FastAPIが422を返す
        res = await client.get("/api/books/search")

    assert res.status_code == 422


# ============================================
# TC-SEARCH-04: 長文検索
# 入力: 200文字 → 期待: エラーまたは空結果
# ============================================
@pytest.mark.asyncio
async def test_search_long_query():
    """200文字の長文で検索してもエラーにならないこと"""
    mock_response = {
        "count": 0,
        "Items": [],
        "has_next": False,
        "page": 1,
    }

    long_query = "あ" * 200

    with patch(
        "app.routers.books.search_books",
        new_callable=AsyncMock,
        return_value=mock_response,
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get("/api/books/search", params={"q": long_query})

    # サーバーエラーにならないこと（200 or 422）
    assert res.status_code in [200, 422]


# ============================================
# TC-SEARCH-05: 該当なし
# 入力: 存在しない文字列 → 期待: 0件の結果
# ============================================
@pytest.mark.asyncio
async def test_search_no_results():
    """存在しない文字列で検索すると0件が返ること"""
    mock_response = {
        "count": 0,
        "Items": [],
        "has_next": False,
        "page": 1,
    }

    with patch(
        "app.routers.books.search_books",
        new_callable=AsyncMock,
        return_value=mock_response,
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get(
                "/api/books/search", params={"q": "zzzzxxxxxyyyyy999"}
            )

    assert res.status_code == 200
    data = res.json()
    assert data["count"] == 0
    assert len(data["Items"]) == 0
