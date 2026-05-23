"use client";

import { useState, useEffect, Suspense, useCallback, useRef } from "react";
import { 
  RotateCcw, ArrowLeft, Sparkles, LogOut, Crown, BookOpen, JapaneseYen
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";

// タイプライター：テキストを1文字ずつ表示
function TypewriterText({ text = "", speed = 25 }: { text?: string; speed?: number }) {
  const [displayedText, setDisplayedText] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDisplayedText("");
    let index = 0;
    if (!text) return;
    const interval = setInterval(() => {
      setDisplayedText(text.slice(0, index + 1));
      index++;
      if (index >= text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [displayedText]);

  return <div ref={containerRef} className="whitespace-pre-wrap">{displayedText}</div>;
}

function BattleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const genre = searchParams.get("genre") || "おまかせ";
  const mood = searchParams.get("mood") || "おまかせ";

  const isInitialized = useRef(false);
  const [step, setStep] = useState(2);
  const [book1, setBook1] = useState<any>(null);
  const [book2, setBook2] = useState<any>(null);
  const [battleId, setBattleId] = useState("");
  const [messages, setMessages] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingExtra, setLoadingExtra] = useState(false);
  const [winner, setWinner] = useState({ title: "", closingMessage: "", image: "" });
  const [isPremium, setIsPremium] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const Header = () => (
    <div className="flex justify-between items-center px-5 py-3 bg-base-300">
      <div className="flex items-center gap-2">
        <BookOpen size={20} className="text-primary" />
        <div className="flex flex-col leading-tight">
          <span className="font-serif font-bold text-lg">りどみー！</span>
          <span className="font-serif text-[10px] text-base-content/60">READ ME!</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {isPremium && <span className="badge badge-warning badge-sm gap-1"><Crown size={12} />Premium</span>}
        {!isPremium && (
          <button onClick={() => router.push("/payment")} className="btn btn-ghost btn-sm btn-circle text-success">
            <JapaneseYen size={20} />
          </button>
        )}
        <button onClick={async () => { await supabase.auth.signOut(); router.push("/register"); }} className="btn btn-ghost btn-sm btn-circle">
          <LogOut size={20} />
        </button>
      </div>
    </div>
  );
  
  const handleBattle = useCallback(
    async (currentUserId: string, b1: any, b2: any, isExtra = false, targetId?: string, forceRejected?: string[]) => {
      if (!currentUserId || !b1?.isbn || !b2?.isbn) return;
      
      if (isExtra) {
        setLoadingExtra(true);
        setMessages(null);
      } else {
        setLoading(true);
      }
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const isRetry = !isExtra && !!targetId;

        const res = await fetch(`/api/battle`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json", 
            "Authorization": `Bearer ${session?.access_token}` 
          },
          body: JSON.stringify({ 
            userId: currentUserId, 
            battleId: targetId || battleId || null, 
            book1_isbn: b1.isbn, 
            book2_isbn: b2.isbn, 
            condition: mood,
            genre_tag: genre,
            isExtraPush: isExtra,
            isRetry: isRetry,
            rejected_isbns: forceRejected || [], // 🌟 ここでフロントの除外リストを渡す
            current_isbns: [b1.isbn, b2.isbn]
          }),
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        setMessages(data);
        if (data.battleId) setBattleId(data.battleId);
      } catch (e: any) {
        setErrorMsg(e.message || "通信エラーが発生しました");
      } finally {
        setLoading(false);
        setLoadingExtra(false);
      }
    },
    [mood, genre, battleId]
  );

  const setupBattleBooks = useCallback(
    async (uid: string, isRetry: boolean = false) => {
      setLoading(true);
      setMessages(null);
      setErrorMsg(null);

      try {
        // 1. 現在表示中の2冊を即座に除外対象にする
        const currentIsbns = [book1?.isbn, book2?.isbn].filter(Boolean).map(String);

        // 2. DBからこれまでの却下リストを取得
        let dbRejectedIsbns: string[] = [];
        if (battleId) {
          const { data } = await supabase.from("battles").select("rejected_isbns").eq("id", battleId).maybeSingle();
          dbRejectedIsbns = data?.rejected_isbns?.map(String) || [];
        }

        // 3. 徹底除外リストの作成
        const absoluteExclude = Array.from(new Set([...dbRejectedIsbns, ...currentIsbns]));

        // 4. 未読本の取得
        const { data: userBooksData } = await supabase.from("user_books").select("*, books(*)").eq("user_id", uid).eq("status", "unread");
        const allAvailableBooks = userBooksData?.map((ub: any) => ub.books).filter((b: any) => b && b.isbn) || [];

        // 5. 除外リストを適用
        const candidates = allAvailableBooks.filter(b => !absoluteExclude.includes(String(b.isbn)));

        // 6. ジャンルフィルタリング
        const genreRules: { [key: string]: string[] } = {
          "小説": ["001004","001019"], 
          "短編・エッセイ": ["001004","001008","001017","001020","001023"], 
          "ビジネス": ["001005","001006", "001007","001026"], 
          "自己啓発": ["001002","001006","001016"], 
          "歴史・科学": ["001012","001028"],
          "暮らし・実用": ["001005","001010","001012"],
          "趣味・エンタメ": ["001009","001011","001013","001015","001018"],
          "漫画": ["001001","001021","001025"], 
        };
        const allowedIds = genreRules[genre] || [];

        let finalSelection: any[] = [];
        if (genre !== "おまかせ" && allowedIds.length > 0) {
          const genreFiltered = candidates.filter((b: any) => 
            b.category_id && allowedIds.some(id => String(b.category_id).startsWith(id))
          );
          if (genreFiltered.length >= 2) finalSelection = genreFiltered;
        }

        // 7. ジャンルで足りない場合は全候補から
        if (finalSelection.length < 2) finalSelection = candidates;

        if (finalSelection.length < 2) {
          setErrorMsg("新しい組み合わせの未読本がもうありません。本棚に本を追加してください。");
          setLoading(false);
          return;
        }

        const picked = [...finalSelection].sort(() => 0.5 - Math.random()).slice(0, 2);
        setBook1(picked[0]);
        setBook2(picked[1]);

        await handleBattle(uid, picked[0], picked[1], false, isRetry ? battleId : undefined, absoluteExclude);

      } catch (e: any) {
        setErrorMsg("エラーが発生しました");
        setLoading(false);
      }
    },
    [handleBattle, battleId, book1, book2, genre]
  );

  const handleWinner = async (winnerBook: any, closing: string) => {
    if (!userId || !battleId || !book1?.isbn || !book2?.isbn) return;
    const rejectedIsbn = book1.isbn === winnerBook.isbn ? book2.isbn : book1.isbn;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`/api/battle`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({ userId, battleId, winner_isbn: winnerBook.isbn, rejected_isbns: [rejectedIsbn], status: "completed" }),
      });
      setWinner({ title: winnerBook.title, image: winnerBook.image_url, closingMessage: closing });
      setStep(3);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace("/login");
      setUserId(user.id);
      const { data } = await supabase.from("users").select("subscription_status").eq("id", user.id).single();
      if (data?.subscription_status === "premium") setIsPremium(true);
      setupBattleBooks(user.id, false);
    })();
  }, [router, setupBattleBooks]);

  if (step === 3) return (
    <div data-theme="coffee" className="h-screen bg-base-200 flex flex-col">
      <Header />
      <div className="flex-1 flex flex-col items-center p-8 text-center">
        <img src={winner.image} className="w-40 h-56 rounded-2xl shadow-2xl object-cover border-4 border-base-100" alt="" />
        <h3 className="text-xl font-bold mt-6 italic text-primary font-serif">『{winner.title}』</h3>
        <div className="bg-base-100 p-6 rounded-2xl mt-4 max-w-md shadow-md border border-base-300">
          <TypewriterText text={winner.closingMessage} speed={30} />
        </div>
        <button onClick={() => router.push("/bookshelf")} className="btn btn-primary mt-8 rounded-xl px-10 shadow-lg">本棚に戻る</button>
      </div>
    </div>
  );

  return (
    <div data-theme="coffee" className="h-screen bg-base-200 flex flex-col">
      <Header />
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {loading && !loadingExtra ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="text-primary font-serif animate-pulse">{isPremium ? "本たちがあなたを呼んでいます..." : "本棚から最適な一冊を探しています..."}</p>
          </div>
        ) : errorMsg ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4 text-error text-center">
            <p className="bg-error/10 p-4 rounded-lg">{errorMsg}</p>
            <button onClick={() => window.location.reload()} className="btn btn-outline btn-sm">再読み込み</button>
          </div>
        ) : (
          <div className="flex flex-col gap-12 pt-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {[ { b: book1, m: messages?.book1_presentation, c: messages?.book1_closing },
                 { b: book2, m: messages?.book2_presentation, c: messages?.book2_closing } 
              ].map((item, idx) => (
                <div key={idx} className="bg-base-100 p-6 rounded-[2rem] shadow-xl flex flex-col items-center relative border border-base-300">
                  <img src={item.b?.image_url} className="w-24 h-36 -mt-12 rounded-lg shadow-2xl border-2 border-white object-cover bg-base-300" alt="" />
                  <h3 className="font-serif font-bold text-sm text-center mt-3 h-10 line-clamp-2">『{item.b?.title}』</h3>
                  <div key={item.m} className="p-4 rounded-xl bg-base-200/50 mt-4 min-h-[160px] w-full text-sm leading-relaxed border border-base-300/50">
                    {item.m ? <TypewriterText text={item.m} speed={25} /> : <div className="flex justify-center pt-10"><span className="loading loading-dots loading-md text-primary/30"></span></div>}
                  </div>
                  <button onClick={() => handleWinner(item.b, item.c)} className="btn btn-primary btn-sm w-full mt-5 rounded-xl font-bold shadow-md hover:scale-105 transition-transform">この本を読み始める</button>
                </div>
              ))}
            </div>
            <div className="flex flex-col items-center gap-4 pb-10">
              <button onClick={() => userId && handleBattle(userId, book1, book2, true, battleId)} disabled={loadingExtra || !battleId} className="btn btn-primary btn-wide rounded-xl shadow-lg border-none">
                {loadingExtra ? <span className="loading loading-spinner"></span> : <><Sparkles size={18} className="mr-2" />もっと深く聴く</>}
              </button>
              <button onClick={() => userId && setupBattleBooks(userId, true)} className="btn btn-ghost btn-sm text-base-content/50 italic hover:bg-transparent hover:text-primary">
                <RotateCcw size={16} className="mr-1" />別の2冊を選ぶ
              </button>
              <button onClick={() => router.push("/bookshelf")} className="btn btn-link btn-xs text-base-content/40 no-underline hover:text-primary mt-2">
                <ArrowLeft size={14} className="mr-1" /> 本棚に戻る
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BattlePage() { return <Suspense fallback={null}><BattleContent /></Suspense>; }