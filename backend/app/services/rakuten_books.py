# ============================================
# 楽天BooksAPI処理・楽天と通信する責任ファイル
# ============================================
import httpx
from app.core.config import settings

RAKUTEN_BOOKS_URL = (
    "https://openapi.rakuten.co.jp/services/api/BooksBook/Search/20170404"
)


async def search_books(keyword: str, page: int = 1):
    base_params = {
        "applicationId": settings.RAKUTEN_APP_ID,
        "accessKey": settings.RAKUTEN_ACCESS_KEY,
        "format": "json",
        "hits": 30,
        "page": page,
    }
    if settings.RAKUTEN_AFFILIATE_ID:
        base_params["affiliateId"] = settings.RAKUTEN_AFFILIATE_ID

    headers = {
        "Authorization": f"Bearer {settings.RAKUTEN_ACCESS_KEY}",
        "Referer": "https://rakuten.co.jp/",
        "Origin": "https://rakuten.co.jp",
    }

    all_items = []
    seen_isbns = set()

    async with httpx.AsyncClient() as client:
        # スペースで分割（全角スペースにも対応）
        words = keyword.replace("　", " ").split()

        if len(words) >= 2:
            # --- 2キーワード以上: title×author の組み合わせで検索 ---
            word1 = words[0]
            word2 = " ".join(words[1:])

            # パターン1: word1=title, word2=author
            params = {**base_params, "title": word1, "author": word2}
            res = await client.get(RAKUTEN_BOOKS_URL, params=params, headers=headers)
            if res.status_code == 200:
                data = res.json()
                for item in data.get("Items", []):
                    isbn = item["Item"]["isbn"]
                    if isbn not in seen_isbns:
                        seen_isbns.add(isbn)
                        all_items.append(item)

            # パターン2: word2=title, word1=author
            params = {**base_params, "title": word2, "author": word1}
            res = await client.get(RAKUTEN_BOOKS_URL, params=params, headers=headers)
            if res.status_code == 200:
                data = res.json()
                for item in data.get("Items", []):
                    isbn = item["Item"]["isbn"]
                    if isbn not in seen_isbns:
                        seen_isbns.add(isbn)
                        all_items.append(item)

        else:
            # --- 1キーワード: 従来通り title検索 + author検索 ---
            # 1. タイトルで検索
            params = {**base_params, "title": keyword}
            res = await client.get(RAKUTEN_BOOKS_URL, params=params, headers=headers)
            if res.status_code == 200:
                data = res.json()
                for item in data.get("Items", []):
                    isbn = item["Item"]["isbn"]
                    if isbn not in seen_isbns:
                        seen_isbns.add(isbn)
                        all_items.append(item)

            # 2. 著者名でも検索
            params = {**base_params, "author": keyword}
            res = await client.get(RAKUTEN_BOOKS_URL, params=params, headers=headers)
            if res.status_code == 200:
                data = res.json()
                for item in data.get("Items", []):
                    isbn = item["Item"]["isbn"]
                    if isbn not in seen_isbns:
                        seen_isbns.add(isbn)
                        all_items.append(item)

        if len(all_items) == 0:
            return {"count": 0, "Items": [], "has_next": False, "page": page}

        return {
            "count": len(all_items),
            "Items": all_items,
            "has_next": len(all_items) >= 30,
            "page": page,
        }
