import os
import json
import datetime
import re
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

router = APIRouter(prefix="/battle", tags=["AI Battle"])

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

class BattleRequest(BaseModel):
    battleId: Optional[str] = None
    userId: str
    book1_isbn: str
    book2_isbn: str
    condition: str = ""
    genre_tag: Optional[str] = "none"
    winner_isbn: Optional[str] = None
    is_retry: bool = False
    is_extra_push: bool = False
    current_isbns: List[str] = []
    rejected_isbns: List[str] = []

def get_personality_by_genre(category_id: str, role_index: int):
    id_str = str(category_id or "").strip()
    is_alt = role_index % 2 == 1
    
    # 1. コミック・ラノベ (フロントエンド同期)
    if re.search(r'^001001|^001017|^001021|^001025', id_str):
        return "【性格: 刺激を求める相棒】一人称『僕』。やんちゃで好奇心旺盛。退屈な日常をぶち壊すようなスリルと興奮を煽る口調。" if is_alt else \
               "【性格: 癒やしの幼馴染】一人称『私』。等身大の安心感。あなたの感情に寄り添い、一緒に笑い転げてくれるような温かい口調。"
    
    # 2. 小説・物語・エッセイ
    if re.search(r'^001004|^001008|^001019|^001020|^001023', id_str):
        return "【性格: 退廃的な詩人】一人称『ワタシ』。少し毒気のあるミステリアスさ。美しくも残酷な世界の真実を囁き、魂を揺さぶる口調。" if is_alt else \
               "【性格: 穏やかなストーリーテラー】一人称『私』。ティータイムのような心地よさ。物語の優しさに浸らせ、心を整えてくれる口調。"
    
    # 3. ビジネス・経済・キャリア
    if id_str.startswith("001007"):
        return "【性格: 燃え盛る起業家】一人称『俺』。圧倒的熱量。甘えを捨てろと鼓舞し、あなたの野心を爆発させて成功へと引きずり出す強引な口調。" if is_alt else \
               "【性格: 冷徹な天才軍師】一人称『私』。氷のような冷静さ。感情を排し、データと論理だけで勝てる戦略を淡々と授ける知的な口調。"
    
    # 4. 専門書・語学・自己啓発
    if id_str.startswith("001002") or id_str.startswith("001006"):
        return "【性格: 革命の導師】一人称『私』。今のあなたを全否定し、生まれ変わるための「破壊」を説く。厳しいが愛のあるカリスマ的口調。" if is_alt else \
               "【性格: 慈愛のヒーラー】一人称『僕』。今のままのあなたでいいと包み込む。自己肯定感を最大まで高め、心を浄化する聖母のような口調。"

    # 5. 暮らし・料理・健康
    if re.search(r'^001010|^001012', id_str):
        return "【性格: 効率至上主義の執事】一人称『私』。無駄を徹底的に排除。洗練された美しい暮らしを構築するため、凛とした態度で律する性格。" if is_alt else \
               "【性格: 陽だまりの家政婦】一人称『わたし』。丁寧でゆったり。日々の小さな幸せを慈しみ、手間暇かける喜びを優しく教える性格。"

    # 6. 趣味・ホビー・スポーツ
    if re.search(r'^001009|^001011|^001013|^001015|^001018', id_str):
        return "【性格: 狂気のコレクター】一人称『僕』。理性を失うほどの偏愛。その道の奥深さと、常識を脱ぎ捨てる快感を早口でまくし立てる性格。" if is_alt else \
               "【性格: 粋な遊び人】一人称『私』。余裕のある大人。人生を楽しむ遊びのコツを、ユーモアを交えて軽やかに提案する性格。"

    # 7. 教育・科学
    if re.search(r'^001012|^001028', id_str):
        return "【性格: 異端の科学者】一人称『ワタクシ』。知的好奇心の塊。あなたの常識を覆す新発見をぶつけ、知の興奮で脳を痺れさせる性格。" if is_alt else \
               "【性格: 厳格な大教授】一人称『私』。学問への誠実さ。基本の重要性を説き、体系的な知識であなたの土台を盤石にする重厚な性格。"

    # 8. 資格・就職・PC・技術
    if id_str.startswith("001005") or id_str.startswith("001007") or id_str.startswith("001016"):
        return "【性格: 鬼の特訓コーチ】一人称『私』。一切の妥協を許さない。最短でプロにするため、あなたの限界を突破させるストイックな性格。" if is_alt else \
               "【性格: 隣り合わせの職人】一人称『僕』。現場の知恵。あなたの手を取り、道具の使い方からコツまで丁寧に教え、共に歩む性格。"

    return "【性格: 革新の反逆者】一人称『俺』。" if is_alt else "【性格: 調和の守護者】一人称『私』。"

@router.post("/start") 
async def start_battle(request: BattleRequest):
    try:
        # --- 1. 勝者決定ロジック ---
        if request.battleId and (request.winner_isbn or request.is_retry):
            cb_res = supabase.table("battles").select("*").eq("id", request.battleId).maybe_single().execute()
            cb = cb_res.data
            rejected = cb.get("rejected_isbns", []) if cb else []
            # 重複排除しながら結合
            rejected = list(set(rejected + (request.rejected_isbns or []) + (request.current_isbns or [])))

            update_payload = {"rejected_isbns": rejected, "update_at": datetime.datetime.now().isoformat()}

            if request.winner_isbn:
                update_payload["winner_isbn"] = request.winner_isbn
                update_payload["status"] = "completed"
                supabase.table("user_books").update({"status": "reading"})\
                    .eq("user_id", request.userId).eq("isbn", request.winner_isbn).execute()

            supabase.table("battles").update(update_payload).eq("id", request.battleId).execute()
            if request.winner_isbn:
                return {"success": True}

        # --- 2. データの取得 ---
        user = supabase.table("users").select("*").eq("id", request.userId).single().execute().data
        books = supabase.table("books").select("*").in_("isbn", [request.book1_isbn, request.book2_isbn]).execute().data
        
        if not user or len(books) < 2:
            raise HTTPException(status_code=400, detail="データ不足")

        b1 = next(b for b in books if b["isbn"] == request.book1_isbn)
        b2 = next(b for b in books if b["isbn"] == request.book2_isbn)
        is_premium = user.get("subscription_status") == "premium"

        previous_context = ""
        conversation_history = []
        if request.battleId:
            cb_res = supabase.table("battles").select("conversation_log").eq("id", request.battleId).maybe_single().execute()
            if cb_res.data and cb_res.data.get("conversation_log"):
                conversation_history = cb_res.data["conversation_log"]
                last_log = next((l for l in reversed(conversation_history) if l.get("ai")), None)  # noqa: E741
                if last_log:
                    previous_context = f"\n【前回のプレゼン内容】\n本1: {last_log['ai'].get('book1_presentation')}\n本2: {last_log['ai'].get('book2_presentation')}"

        # --- 3. システムプロンプト構築 ---
        if is_premium:
            p1 = get_personality_by_genre(b1.get("category_id"), 0)
            p2 = get_personality_by_genre(b2.get("category_id"), 1)
            system_content = (
                "あなたは、意思を持ち読者に直接語りかける「本そのもの」です。AIとしての説明は一切禁止。\n"
                f"【ターゲット】年齢:{user.get('age_group')} / 職業:{user.get('occupation')} / 悩み:「{request.condition}」\n"
                f"【本1の性格】: {p1}\n【本2の性格】: {p2}\n"
                f"【深掘りルール】: {'前回の性格を維持し、さらに物語の核心を語れ' if request.is_extra_push else '読者の魂を揺さぶる第一声を放て'}\n"
                "【出力ルール】presentation(220-250字), 改行\\nを2-3文ごとに入れろ。タイトルの呼称は禁止。\n"
                f"{previous_context}\nJSON形式で出力せよ。"
            )
        else:
            system_content = (
                f"あなたは誠実なAI司書です。悩み「{request.condition}」に寄り添い、客観的に紹介してください。\n"
                "1. 書き出し重複禁止：2冊を同じ言葉で始めるな。\n"
                f"2. {'タイトルを繰り返さず核心を突け' if request.is_extra_push else '冒頭に必ずタイトルを含めろ'}\n"
                "JSON形式（presentation: 100-120字, closing: 40字）で出力せよ。"
            )

        # --- 4. AI生成 ---
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": system_content}, {"role": "user", "content": f"本1:『{b1['title']}』, 本2:『{b2['title']}』"}],
            response_format={ "type": "json_object" },
            temperature=0.95 if is_premium else 0.4
        )
        ai_response = json.loads(response.choices[0].message.content)

        # --- 5. 保存ロジック ---
        log_entry = {"type": "extra" if request.is_extra_push else ("retry" if request.is_retry else "initial"), "ai": ai_response, "at": datetime.datetime.now().isoformat()}
        
        if request.battleId:
            supabase.table("battles").update({
                "candidate_isbns": [request.book1_isbn, request.book2_isbn],
                "conversation_log": conversation_history + [log_entry],
                "update_at": datetime.datetime.now().isoformat()
            }).eq("id", request.battleId).execute()
            final_id = request.battleId
        else:
            nb = supabase.table("battles").insert({
                "user_id": request.userId, "mood_tag": request.condition, "genre_tag": request.genre_tag,
                "candidate_isbns": [request.book1_isbn, request.book2_isbn], "conversation_log": [log_entry],
                "status": "ongoing", "rejected_isbns": []
            }).execute()
            final_id = nb.data[0]["id"]

        return {**ai_response, "battleId": final_id}

    except Exception as e:
        print(f"ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))