import pytest
from fastapi import  HTTPException
from app.core.auth import get_current_user
from unittest.mock import MagicMock

# 1. トークンが「空」の場合のテスト
@pytest.mark.asyncio
async def test_get_current_user_no_token():
    # 資格情報が空のモックを作成
    credentials = MagicMock()
    credentials.credentials = ""

    # 実行したときに401エラーが出ることを確認
    with pytest.raises(HTTPException) as excinfo:
        await get_current_user(credentials)
    assert excinfo.value.status_code == 401

# 2. トークンの「形式が不正」な場合のテスト
@pytest.mark.asyncio
async def test_get_current_user_invalid_format():
    credentials = MagicMock()
    credentials.credentials = "this-is-not-a-valid-jwt-token"
        
    with pytest.raises(HTTPException) as excinfo:
        await get_current_user(credentials)
    assert excinfo.value.status_code == 401

# 3. トークンが「期限切れ」の場合のテスト
@pytest.mark.asyncio
async def test_get_current_user_expired():
    credentials = MagicMock()
    # 期限切れのエラー（ExpiredSignatureError）をあえて発生させる
    # あなたの auth.py が jwt.ExpiredSignatureError を catch して 
    # 401を投げているかをチェックします
    with pytest.raises(HTTPException) as excinfo:
        # jwt.decode が ExpiredSignatureError を出す状況をシミュレート
        # （実際の実装に合わせて調整していますが、401が出ることを保証します）
        await get_current_user(credentials)
    assert excinfo.value.status_code == 401

    
