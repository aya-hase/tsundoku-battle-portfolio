from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 1. 起動
app = FastAPI()

# 2. CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # テスト用に全て許可
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. AI Battle ルーターを読み込む
try:
    # 修正：フォルダ(app.battle)ではなく、ファイル(app.routers.battle)から読み込む
    from app.routers import battle as battle_module
    app.include_router(battle_module.router) 
    print("✅ AI Battleルーターの読み込みに成功しました！")
except Exception as e:
    import traceback
    print(f"❌ AI Battle読み込み失敗: {e}")
    traceback.print_exc()


@app.get("/health")
def health():
    return {"status": "ok", "message": "Cさんのテスト中"}


# ===== 4. Rakuten Books Router 読み込み（奈穂子担当🔥）=====
try:
    from app.routers import books

    app.include_router(books.router)
    print("✅ Books API ルーター読み込み成功")
except Exception as e:
    import traceback

    print(f"❌ Books router 読み込み失敗: {e}")
    traceback.print_exc()

# ===== 5. User Books Router 読み込み（奈穂子担当🔥本棚API）=====
try:
    from app.routers import user_books
    app.include_router(user_books.router)
    print("✅ User Books API ルーター読み込み成功")
except Exception as e:
    import traceback
    print(f"❌ User Books router 読み込み失敗: {e}")
    traceback.print_exc()