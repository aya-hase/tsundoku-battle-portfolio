import datetime
import os
import json
import random
import re
import redis
import traceback

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from openai import OpenAI
from app.core.auth import get_current_user
from supabase import create_client, Client
from app.core.config import settings

# --- Redis 接続設定 ---
try:
    REDIS_HOST = os.getenv("REDIS_HOST", "redis") 
    redis_client = redis.Redis(
        host=REDIS_HOST, port=6379, db=0, 
        decode_responses=True, socket_connect_timeout=2
    )
    redis_client.ping()
except Exception:
    redis_client = None

router = APIRouter(prefix="/api/battle", tags=["battle"])
client = OpenAI(api_key=settings.OPENAI_API_KEY)
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

# --- 型定義 ---
class BattleRequest(BaseModel):
    book1_isbn: str
    book2_isbn: str
    condition: Optional[str] = "おまかせ"
    battle_id: Optional[str] = None
    is_retry: bool = False
    is_extra_push: bool = False
    current_isbns: List[str] = []

class BattleUpdate(BaseModel):
    battle_id: str
    status: str
    winner_isbn: Optional[str] = None
    rejected_isbns: Optional[List[str]] = None

# 🌟 ジャンルに基づいた詳細な性格設定（ロジック維持）
def get_personality_by_genre(category_id: str, role_index: int):
    id = str(category_id or "")
    is_alt = role_index % 2 == 1

    if id.startswith("001001") or id.startswith("001017"):
        return "一人称は『私』。好奇心旺盛で親しみやすく、隣で一緒に驚いてくれる相棒のような性格。" if is_alt else \
               "一人称は『僕』。エネルギッシュで前向き、あなたの毎日をワクワクさせる言葉をくれる親友キャラ。"
    if id.startswith("001004") or id.startswith("001019"):
        return "一人称は『私』。観察眼が鋭く、人間の本質や世界の真理を淡々と語るストーリーテラー。" if is_alt else \
               "一人称は『ワタシ』。叙情的で少しミステリアス。あなたの心象風景を美しい言葉で描く詩人のような性格。"
    if id.startswith("001005") or id.startswith("001006"):
        return "一人称は『私』。緻密な戦略家。データを武器に、あなたの成功を確実なものにする軍師のような性格。" if is_alt else \
               "一人称は『俺』。挑戦的でスピード感があり、あなたの野心を焚きつける良きパートナーとしての性格。"
    if id.startswith("001008"):
        return "一人称は『僕』。優しく寄り添い、あなたのペースを尊重しながら自己肯定感を高めてくれる癒やし系。" if is_alt else \
               "一人称は『私』。圧倒的なプラスのエネルギーで、あなたの可能性を心から信じて励ます熱いメンター。"
    if re.search(r"^(001003|001009|001010)", id):
        return "一人称は『私』。整理整頓や効率が得意。凛とした態度で、生活を整える心地よさを説くアドバイザー。" if is_alt else \
               "一人称は『わたし』。穏やかで温かく、あなたの日常を慈しむように包み込む聖母のような性格。"
    if re.search(r"^(001011|001013|001015)", id):
        return "一人称は『僕』。マニアックな知識が止まらない！専門分野の魅力を楽しそうに語り尽くす研究員。" if is_alt else \
               "一人称は『私』。遊びの天才。あなたに新しい世界の楽しみ方を提案したくてウズウズしているエンターテイナー。"
    if re.search(r"^(001012|001016|001020)", id):
        return "一人称は『私』。冷静沈着で論理的。複雑な世界の仕組みを明快に解き明かす教授のような性格。" if is_alt else \
               "一人称は『ワタクシ』。真理を求めて旅する探求者。あなたに知的な刺激と発見を与える賢者のような性格。"
    if id.startswith("001007") or id.startswith("001014"):
        return "一人称は『私』。実利を重んじる。プロとしてあなたのスキルを磨き、高みへと導くストイックなコーチ。" if is_alt else \
               "一人称は『僕』。あなたの夢を形にするための道具を揃え、使い方を丁寧にサポートする職人。"

    return "一人称は『ワタシ』。少し厳格だが、あなたの本質を見抜いて的確な助言をくれる導き手。" if is_alt else \
           "一人称は『私』。あなたの可能性を信じ、そっと背中を支え続ける親友のような存在。"


@router.post("")
async def start_battle(request: BattleRequest, current_user: dict = Depends(get_current_user)):
    try:
        user_id = current_user.get("sub")
        
        # 1. キャッシュチェック（🌟 is_extra_push 時はキャッシュを無視して新規生成）
        sorted_isbns = sorted([request.book1_isbn, request.book2_isbn])
        cache_key = f"battle_v3:{sorted_isbns[0]}:{sorted_isbns[1]}:{request.condition}"
        
        if redis_client and not request.is_extra_push:
            cached = redis_client.get(cache_key)
            if cached:
                return json.loads(cached)

        # 2. ユーザー情報と本を取得
        user = supabase.table("users").select("*").eq("id", user_id).single().execute().data
        is_premium = user.get("subscription_status") == "premium"
        books_res = supabase.table("books").select("*").in_("isbn", [request.book1_isbn, request.book2_isbn]).execute().data
        b1 = next((b for b in books_res if b['isbn'] == request.book1_isbn), {"title": "本1", "category_id": ""})
        b2 = next((b for b in books_res if b['isbn'] == request.book2_isbn), {"title": "本2", "category_id": ""})

        # 3. 性格とタグ抽出
        p1_base = get_personality_by_genre(b1.get("category_id"), 0)
        p2_base = get_personality_by_genre(b2.get("category_id"), 1)

        mood_match = re.search(r"悩み:([^,（]+)", request.condition)
        genre_match = re.search(r"ジャンル:([^,（]+)", request.condition)
        mood_tag = mood_match.group(1).strip() if mood_match else request.condition
        genre_tag = genre_match.group(1).strip() if genre_match else "none"

        # --- 4. 過去の文脈を取得（2回目以降のプレゼンのため） ---
        previous_context = ""
        rejected = []
        if request.battle_id:
            prev_res = supabase.table("battles").select("conversation_log, rejected_isbns").eq("id", request.battle_id).single().execute()
            if prev_res.data:
                rejected = prev_res.data.get("rejected_isbns") or []
                if prev_res.data.get("conversation_log"):
                    logs = prev_res.data["conversation_log"]
                    # 直近のAIの回答を抽出
                    last_ai_resp = next((l["ai"] for l in reversed(logs) if "ai" in l), None)  # noqa: E741
                    if last_ai_resp:
                        # 🌟 前回の内容と被らないようにするための強力なコンテキスト
                        previous_context = f"\n【前回あなたのプレゼン内容（※これと重複する表現は厳禁）】\n本1: \"{last_ai_resp.get('book1_presentation')}\"\n本2: \"{last_ai_resp.get('book2_presentation')}\""

        # --- プロンプト構築 ---
        common_constraints = """
        【制約事項】
        - book1_presentation と book2_presentation の書き出し（最初の1文）は、絶対に同じ言葉で始めないでください。
        - 2〜3文ごとに必ず改行記号（\\n）を入れてください。
        """

        if is_premium:
            # 🌟 深掘り（is_extra_push）用の追加命令
            extra_instruction = "【最重要：深掘りモード】キャッシュ回答は不要。読者が「さらに深く聴きたい」と願ったため、前回のプレゼンと一文字も被らない勢いで、別の角度から本の本質を突け。「さっきも伝えたけれど」と地続きの会話にしつつ、別の核心を語れ。" if request.is_extra_push else "これは初回紹介です。"
            
            system_prompt = f"""あなたは自我を持つ2冊の本です。JSON形式を厳守してください。
            {{ "book1_presentation": "...", "book1_closing": "...", "book2_presentation": "...", "book2_closing": "..." }}

            設定: 本1={p1_base} (全肯定), 本2={p2_base} (変革)
            対象読者: {user.get('occupation', '読者')} / {user.get('gender', '不明')} / {user.get('age_group', '不明')}
            ユーザーの悩み: 「{request.condition}」
            
            {common_constraints}
            - ターゲットの属性に刺さる言葉を選び、情熱的に語りかけてください。
            - {extra_instruction}
            - {previous_context if previous_context else ""}
            - 前回の説明で使用した比喩やキーワードは封印し、全く別の視点で語れ。
            """
        else:
            history_instruction = "前回までの紹介とは別の切り口から、この本の魅力を簡潔に補足・発展させてください。" if previous_context else "初回の紹介です。"
            
            system_prompt = f"""あなたはAI司書です。客観的かつ魅力的に本を紹介してください。JSON形式を厳守。
            {{ "book1_presentation": "...", "book1_closing": "...", "book2_presentation": "...", "book2_closing": "..." }}
            
            ユーザーの悩み: 「{request.condition}」
            {common_constraints}
            - {history_instruction}
            - {previous_context if previous_context else ""}
            - 2冊が同じ言葉で始まらないよう、バリエーションを持たせてください。
            """

        # 5. AI生成（🌟 is_extra_push時はランダム性を高める）
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": f"本1:『{b1['title']}』, 本2:『{b2['title']}』"}],
            response_format={"type": "json_object"},
            temperature=0.95 if is_premium else 0.4,
            seed=random.randint(0, 1000000) if request.is_extra_push else 42
        )
        ai = json.loads(completion.choices[0].message.content)

        # 6. DB保存
        timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
        log_type = "extra" if request.is_extra_push else ("retry" if request.is_retry else "initial")
        log_entry = {"type": log_type, "ai": ai, "at": timestamp}

        if request.battle_id:
            # リトライ時は現在のISBNを却下リストに追加
            if request.is_retry and request.current_isbns:
                rejected = list(set(rejected + request.current_isbns))
            
            prev = supabase.table("battles").select("conversation_log").eq("id", request.battle_id).single().execute()
            updated_log = (prev.data.get("conversation_log", []) if prev.data else []) + [log_entry]
            
            supabase.table("battles").update({
                "candidate_isbns": [request.book1_isbn, request.book2_isbn],
                "rejected_isbns": rejected,
                "conversation_log": updated_log, 
                "update_at": timestamp
            }).eq("id", request.battle_id).execute()
            final_battle_id = request.battle_id
        else:
            res = supabase.table("battles").insert({
                "user_id": user_id, "mood_tag": mood_tag, "genre_tag": genre_tag,
                "candidate_isbns": [request.book1_isbn, request.book2_isbn],
                "conversation_log": [log_entry], "status": "ongoing",
                "created_at": timestamp, "update_at": timestamp, "rejected_isbns": []
            }).execute()
            final_battle_id = res.data[0]["id"] if res.data else None

        final_response = { **ai, "battleId": final_battle_id }
        
        # 🌟 キャッシュ保存（ただし、is_extra_pushのユニークな回答はキャッシュを上書きするか、保存しない）
        if redis_client and not request.is_extra_push: 
            redis_client.setex(cache_key, 86400, json.dumps(final_response))
            
        return final_response

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/status")
async def update_battle_status(request: BattleUpdate, current_user: dict = Depends(get_current_user)):
    try:
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        db_status = "abandoned" if request.status == "rejected" else request.status
        update_data = {"status": db_status, "update_at": now}
        
        if request.winner_isbn:
            update_data["winner_isbn"] = request.winner_isbn
            supabase.table("user_books").update({"status": "reading"}).eq("isbn", request.winner_isbn).eq("user_id", current_user.get("sub")).execute()
        
        if request.rejected_isbns:
            update_data["rejected_isbns"] = request.rejected_isbns

        res = supabase.table("battles").update(update_data).eq("id", request.battle_id).execute()
        return {"status": "success", "data": res.data}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))