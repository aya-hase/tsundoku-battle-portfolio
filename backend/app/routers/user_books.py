# ============================================
# 本棚API（user_books）
# ユーザーの本棚データの取得・登録・更新を行う
# ============================================

from fastapi import APIRouter, Depends, HTTPException
import httpx
from app.core.database import get_headers, get_rest_url
from app.core.auth import get_current_user  # 門番をインポート（パスに注意）

router = APIRouter(prefix="/api/user_books", tags=["user_books"])

# --------------------------------------------
# GET /api/user_books (本棚一覧取得)
# --------------------------------------------
@router.get("")
async def get_user_books(current_user: dict = Depends(get_current_user)):
    """本棚一覧を取得（本人のデータのみ）"""
    user_id = current_user.get("sub")
    url = get_rest_url("user_books")
    params = {
        "select": "*, books(*)",
        "user_id": f"eq.{user_id}",
    }

    async with httpx.AsyncClient() as client:
        res = await client.get(url, headers=get_headers(), params=params)
        if res.status_code != 200:
            return []
        return res.json()

# --------------------------------------------
# 🚀 追加：POST /api/user_books (本の登録)
# --------------------------------------------
@router.post("")
async def add_book(book_data: dict, current_user: dict = Depends(get_current_user)):
    """本棚に本を追加する（booksテーブルとuser_booksテーブルの両方に登録）"""
    user_id = current_user.get("sub")
    
    # 1. まず books テーブルに登録（重複していてもいいようにUpsert）
    books_url = get_rest_url("books")
    book_payload = {
        "isbn": book_data.get("isbn"),
        "title": book_data.get("title"),
        "author": book_data.get("author"),
        "image_url": book_data.get("image_url"),
        "item_caption": book_data.get("item_caption"),
        "genre_id": book_data.get("genre_id", ""),
        "category_id": book_data.get("genre_id", "")[:6] if book_data.get("genre_id") else "",
    }
    
    async with httpx.AsyncClient() as client:
        # 重複があってもエラーにしない設定(prefer=resolution=merge-duplicates)
        headers = get_headers()
        headers["Prefer"] = "resolution=merge-duplicates"
        await client.post(books_url, headers=headers, json=book_payload)

        # 2. 次に user_books テーブルに紐付け登録
        user_books_url = get_rest_url("user_books")
        user_book_payload = {
            "user_id": user_id,
            "isbn": book_data.get("isbn"),
            "status": "unread"
        }
        res = await client.post(user_books_url, headers=get_headers(), json=user_book_payload)
        
        if res.status_code not in [200, 201]:
            raise HTTPException(status_code=res.status_code, detail="登録に失敗しました")
            
        return {"message": "success"}

# --------------------------------------------
# 🚀 追加：DELETE /api/user_books/{id} (本の削除)
# --------------------------------------------
@router.delete("/{user_book_id}")
async def delete_book(user_book_id: str, current_user: dict = Depends(get_current_user)):
    """本棚から本を削除する"""
    user_id = current_user.get("sub")
    url = get_rest_url("user_books")
    
    # 自分のデータであることを保証して削除
    params = {
        "id": f"eq.{user_book_id}",
        "user_id": f"eq.{user_id}"
    }

    async with httpx.AsyncClient() as client:
        res = await client.delete(url, headers=get_headers(), params=params)
        
        if res.status_code not in [200, 204]:
            raise HTTPException(status_code=res.status_code, detail="削除に失敗しました")
            
        return {"message": "deleted"}