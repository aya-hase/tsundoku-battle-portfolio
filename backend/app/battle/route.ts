import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabase } from "../../../backend/lib/supabase"; 

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

/**
 * 🌟 性格設定 (フロントエンドと完全同期)
 */
const getPersonalityByGenre = (categoryId: any, roleIndex: number, bookTitle: string) => {
  const id = categoryId ? String(categoryId).trim() : "";
  const isAlt = roleIndex % 2 === 1;

  if (/^001001|^001017|^001021|^001025/.test(id)) {
    return isAlt 
      ? "【性格: 刺激を求める相棒】一人称『僕』。やんちゃで好奇心旺盛。退屈な日常をぶち壊すようなスリルと興奮を煽る口調。" 
      : "【性格: 癒やしの幼馴染】一人称『私』。等身大の安心感。あなたの感情に寄り添い、一緒に笑い転げてくれるような温かい口調。";
  }
  if (/^001004|^001008|^001019|^001020|^001023/.test(id)) {
    return isAlt 
      ? "【性格: 退廃的な詩人】一人称『ワタシ』。少し毒気のあるミステリアスさ。美しくも残酷な世界の真実を囁き、魂を揺さぶる口調。" 
      : "【性格: 穏やかなストーリーテラー】一人称『私』。ティータイムのような心地よさ。物語の優しさに浸らせ、心を整えてくれる口調。";
  }
  if (id.startsWith("001007")) {
    return isAlt 
      ? "【性格: 燃え盛る起業家】一人称『俺』。圧倒的熱量。甘えを捨てろと鼓舞し、あなたの野心を爆発させて成功へと引きずり出す強引な口調。" 
      : "【性格: 冷徹な天才軍師】一人称『私』。氷のような冷静さ。感情を排し、データと論理だけで勝てる戦略を淡々と授ける知的な口調。";
  }
  if (id.startsWith("001002") || id.startsWith("001006")) {
    return isAlt 
      ? "【性格: 革命の導師】一人称『私』。今のあなたを全否定し、生まれ変わるための「破壊」を説く。厳しいが愛のあるカリスマ的口調。" 
      : "【性格: 慈愛のヒーラー】一人称『僕』。今のままのあなたでいいと包み込む。自己肯定感を最大まで高め、心を浄化する聖母のような口調。";
  }
  if (/^001010|^001012/.test(id)) {
    return isAlt 
      ? "【性格: 効率至上主義の執事】一人称『私』。無駄を徹底的に排除。洗練された美しい暮らしを構築するため、凛とした態度で律する性格。" 
      : "【性格: 陽だまりの家政婦】一人称『わたし』。丁寧でゆったり。日々の小さな幸せを慈しみ、手間暇かける喜びを優しく教える性格。";
  }
  if (/^001009|^001011|^001013|^001015|^001018/.test(id)) {
    return isAlt 
      ? "【性格: 狂気のコレクター】一人称『僕』。理性を失うほどの偏愛。その道の奥深さと、常識を脱ぎ捨てる快感を早口でまくし立てる性格。" 
      : "【性格: 粋な遊び人】一人称『私』。余裕のある大人。人生を楽しむ遊びのコツを、ユーモアを交えて軽やかに提案する性格。";
  }
  if (/^001012|^001028/.test(id)) {
    return isAlt 
      ? "【性格: 異端の科学者】一人称『ワタクシ』。知的好奇心の塊。あなたの常識を覆す新発見をぶつけ、知の興奮で脳を痺れさせる性格。" 
      : "【性格: 厳格な大教授】一人称『私』。学問への誠実さ。基本の重要性を説き、体系的な知識であなたの土台を盤石にする重厚な性格。";
  }
  if (id.startsWith("001005") || id.startsWith("001007") || id.startsWith("001016")) {
    return isAlt 
      ? "【性格: 鬼の特訓コーチ】一人称『私』。一切の妥協を許さない。最短でプロにするため、あなたの限界を突破させるストイックな性格。" 
      : "【性格: 隣り合わせの職人】一人称『僕』。現場の知恵。あなたの手を取り、道具の使い方からコツまで丁寧に教え、共に歩む性格。";
  }
  return isAlt ? "【性格: 革新の反逆者】一人称『俺』。" : "【性格: 調和の守護者】一人称『私』。";
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      battleId, userId, book1_isbn, book2_isbn, condition, 
      genre_tag, winner_isbn, isRetry, isExtraPush, current_isbns,
      rejected_isbns 
    } = body;

    // --- 1. 勝者決定ロジック ---
    if (battleId && (winner_isbn || isRetry)) {
      const { data: cb } = await supabase.from("battles").select("*").eq("id", battleId).maybeSingle();
      let rejected = cb?.rejected_isbns || [];
      const incomingRejected = rejected_isbns || [];
      const retryCurrent = current_isbns || [];
      rejected = Array.from(new Set([...rejected, ...incomingRejected, ...retryCurrent]));

      const updatePayload: any = { rejected_isbns: rejected, update_at: new Date().toISOString() };

      if (winner_isbn) {
        updatePayload.winner_isbn = winner_isbn;
        updatePayload.status = "completed"; 
        await supabase.from("user_books").update({ status: "reading" }).eq("user_id", userId).eq("isbn", winner_isbn);
      }
      await supabase.from("battles").update(updatePayload).eq("id", battleId);
      if (winner_isbn) return NextResponse.json({ success: true });
    }

    // --- 2. データの取得 ---
    const { data: user } = await supabase.from("users").select("*").eq("id", userId).maybeSingle();
    const { data: books } = await supabase.from("books").select("*").in("isbn", [book1_isbn, book2_isbn]);
    
    if (!user || !books || books.length < 2) throw new Error("データ不足");

    const b1 = books.find(b => b.isbn === book1_isbn);
    const b2 = books.find(b => b.isbn === book2_isbn);
    const isPremium = user.subscription_status === "premium";

    let previousContext = "";
    let conversationHistory: any[] = [];

    if (battleId) {
      const { data: cb } = await supabase.from("battles").select("conversation_log").eq("id", battleId).maybeSingle();
      if (cb?.conversation_log) {
        conversationHistory = cb.conversation_log as any[];
        const lastLog = [...conversationHistory].reverse().find(l => l.ai);
        if (lastLog) {
            previousContext = `
           【重要：前回のプレゼン内容（これと重複禁止）】
            本1: ${lastLog.ai.book1_presentation}
            本2: ${lastLog.ai.book2_presentation}`;
        }
      }
    }

   // --- 3. システムプロンプト構築 ---
    let systemPrompt = "";

    if (isPremium) {
      const p1 = getPersonalityByGenre(b1?.category_id, 0, b1?.title || "");
      const p2 = getPersonalityByGenre(b2?.category_id, 1, b2?.title || "");

      systemPrompt = `あなたは、意思を持ち読者に直接語りかける「本そのもの」です。

【絶対アイデンティティ】
- 2冊の本が、自分こそが読まれるべきだと「あなた」に直接訴えかけます。
- AIとしての客観的な説明は一切禁止。常に「本そのもの」として振る舞いなさい。

【最重要：完全深掘りルール】
1. 性格の完全維持：${isExtraPush ? "前回のプレゼンと同一人物を維持。一人称、口調、温度感を変えることは厳禁。" : "割り当てられた個別の性格を全うしろ。"}
2. 継続性と深化：${isExtraPush ? "前回と100%違う角度で語れ】前回の内容は既知。呼びかけは絶対禁止。今回は、物語のより深い核心や魅力で相手を惹きつけろ。同じ語り口の繰り返しは敗北とみなす。" : 
  "第一声は絶対に前回と違う言葉にしろ。"}

【ターゲット】年齢:${user.age_group} / 性別:${user.gender} / 職業:${user.occupation} / 悩み:「${condition}」

【個別の性格設定】
- 本1: ${p1}
- 本2: ${p2}

【出力ルール】
1. presentation (220-250文字): 2〜3文ごとに必ず【改行コード(\\n)】を挿入。
2. 立場と視点: 本になりきって読者に自分の魅力や読みどころを直接訴えかける二人称形式。
3. 深掘り: ${isExtraPush ? "深堀は必ず地続きで前回の対話を前提に、本の魅力・核心を語れ。" : "初対面の読者の魂を揺さぶる第一声を放て。"}
4. 最適化: 読者の職業や悩みに深く寄り添い、その人生がどう変わるかを具体的に提示しろ。
5. 禁止事項: タイトルの呼称とメタ発言（「私の本」「紹介します」「著者によると」「タイトルは〜です」）は一切禁止。本の内容そのものを自分の言葉として語れ。
6. closing (150文字程度): 選ばれたい情熱を爆発させ、読者に「今すぐページを捲りたい」と思わせる魂の叫び。

${previousContext}
JSON形式: { "book1_presentation": "...", "book1_closing": "...", "book2_presentation": "...", "book2_closing": "..." }`;
    } else {
      systemPrompt = `あなたは誠実なAI司書です。
【ルール】
1. 丁寧な敬語（です・ます）。
2. 書き出し重複禁止。
3. presentation(100-120字)、closing(40字)。
4. 改行：1〜2文ごとに必ず\\n。
JSON形式: { "book1_presentation": "...", "book1_closing": "...", "book2_presentation": "...", "book2_closing": "..." }`;
    }

    // --- 4. 生成 ---
const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `本1:『${b1?.title}』, 本2:『${b2?.title}』` }
      ],
      temperature: isPremium ? 0.95 : 0.4,
      response_format: { type: "json_object" },
    });
    
    const aiResponse = JSON.parse(completion.choices[0].message.content || "{}");

 // --- 5. ログ保存 ---
    const logEntry = { type: isExtraPush ? "extra" : (isRetry ? "retry" : "initial"), ai: aiResponse, at: new Date().toISOString() };
    let finalBattleId = battleId;
    if (battleId) {
      await supabase.from("battles").update({
        candidate_isbns: [book1_isbn, book2_isbn],
        conversation_log: [...conversationHistory, logEntry],
        update_at: new Date().toISOString()
      }).eq("id", battleId);
    } else {
      const { data: nb } = await supabase.from("battles").insert({
        user_id: userId, mood_tag: condition, genre_tag: genre_tag || "none",
        candidate_isbns: [book1_isbn, book2_isbn], conversation_log: [logEntry],
        status: "ongoing", rejected_isbns: []
      }).select().single();
      finalBattleId = nb?.id;
    }

    return NextResponse.json({ ...aiResponse, battleId: finalBattleId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}