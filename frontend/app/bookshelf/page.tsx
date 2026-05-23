"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BookCard from "../../components/BookCard";
import { UserBook } from "../../lib/types";
import { BookOpen, LogOut, JapaneseYen, Trash2, Crown } from "lucide-react";
import { supabase } from "../../lib/supabase";

// ============================================
// 楽天APIから返ってくる本の型
// ============================================
type RakutenBook = {
  Item: {
    title: string;
    author: string;
    isbn: string;
    largeImageUrl: string;
    itemCaption: string;
    booksGenreId: string;
    size: string; // 追加
    publisherName: string; // 追加
  };
};

// ============================================
// ジャンル・気分の選択肢（要件定義より）
// ============================================
const GENRES = [
  "おまかせ",
  "小説",
  "短編・エッセイ",
  "ビジネス",
  "自己啓発",
  "歴史・科学",
  "暮らし・実用",
  "趣味・エンタメ",
  "漫画",
];

const MOODS = [
  "おまかせ",
  "知的好奇心を満たされたい",
  "明るい気分になりたい",
  "ワクワクしたい",
  "泣きたい",
  "短時間で読みたい",
];

// ============================================
// API のベースURL
// ============================================
const API_BASE = "http://localhost:8000";

// ============================================
// メインコンポーネント
// ============================================
export default function BookshelfPage() {
  const router = useRouter();
  const [books, setBooks] = useState<UserBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [genre, setGenre] = useState("おまかせ");
  const [mood, setMood] = useState("おまかせ");
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<RakutenBook[]>([]);
  const [searching, setSearching] = useState(false);
  const [addedIsbns, setAddedIsbns] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  //---ユーザーIDを取得して、ユーザーの本棚ページへ--//
  const [userId, setUserId] = useState<string>("");

  // --- 本棚データの取得（ページ読み込み時） ---

  // ============================================
  // 🚀 Aさんの修正箇所①：fetchBooks
  // (変更点：userIdでのクエリをやめ、ヘッダーにトークンを入れる)
  // ============================================
  const fetchBooks = async () => {
    try {
      // ✨ 修正：最新のセッションからトークンを取得
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      // 🛑 ガード：トークンがない場合は中断
      if (!token) {
        console.warn("トークンが見つかりません。再ログインしてください。");
        return;
      }

      // 🔍 デバッグ用（確認したら消してOK）
      console.log("JWT Token Check:", token);

      const res = await fetch(`${API_BASE}/api/user_books`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setBooks(data);

      if (Array.isArray(data)) {
        setAddedIsbns(data.map((b: UserBook) => b.isbn));
      }
    } catch (error) {
      console.error("本棚の取得に失敗しました:", error);
    } finally {
      setLoading(false);
    }
  };
  // ============================================

  const unreadBooks = Array.isArray(books)
    ? books.filter((b) => b.status === "unread")
    : [];

  //--Premium会員--//
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
      } else {
        // ログインしていない場合はログイン画面へ
        router.push("/login");
      }
    };
    getUser();
  }, [router]);

  useEffect(() => {
    if (!userId) return;
    fetchBooks();
    fetchSubscriptionStatus();
  }, [userId]);

  const fetchSubscriptionStatus = async () => {
    try {
      // 🚀 Aさんの修正：Supabase SDKを使用してステータスを取得（環境変数の直接使用を避ける）
      const { data, error } = await supabase
        .from("users")
        .select("subscription_status")
        .eq("id", userId)
        .single();

      if (data && data.subscription_status === "premium") {
        setIsPremium(true);
      }
    } catch (error) {
      console.error("ステータス取得に失敗:", error);
    }
  };

  // --- 楽天APIで検索 ---
  const handleSearch = async (page: number = 1) => {
    if (!searchQuery.trim()) {
      setMessage("検索キーワードを入力してください");
      return;
    }
    if (page === 1) {
      setSearching(true);
      setSearchResults([]);
    } else {
      setLoadingMore(true);
    }
    setMessage("");
    try {
      const res = await fetch(
        `${API_BASE}/api/books/search?q=${encodeURIComponent(searchQuery)}&page=${page}`,
      );
      const data = await res.json();
      if (data.Items && data.Items.length > 0) {
        if (page === 1) {
          setSearchResults(data.Items);
        } else {
          setSearchResults((prev) => [...prev, ...data.Items]);
        }
        setHasNext(data.has_next);
        setCurrentPage(page);
      } else {
        if (page === 1) {
          setSearchResults([]);
          setMessage("該当する書籍が見つかりません");
        }
        setHasNext(false);
      }
    } catch (error) {
      console.error("検索に失敗しました:", error);
      setMessage("検索に失敗しました。しばらくしてから再度お試しください");
    } finally {
      setSearching(false);
      setLoadingMore(false);
    }
  };

  // --- 本棚に追加 ---
  // ============================================
  // 🚀 Aさんの修正箇所②：handleAddBook
  // (変更点：フロントから直接Supabaseを叩かず、Pythonバックエンド経由にする)
  // ============================================
  const handleAddBook = async (item: RakutenBook["Item"]) => {
    if (addedIsbns.includes(item.isbn)) {
      setMessage("この本は既に本棚に登録されています");
      return;
    }

    // 即座に追加済みにする（連続クリック防止）
    setAddedIsbns((prev) => [...prev, item.isbn]);

    try {
      // ✨ 修正：最新のセッションからトークンを取得
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      // 🛑 ガード：トークンがない場合は中断
      if (!token) {
        setMessage("ログイン情報が取得できません。再ログインしてください");
        return;
      }

      const res = await fetch(`${API_BASE}/api/user_books`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          isbn: item.isbn,
          title: item.title,
          author: item.author,
          item_caption: item.itemCaption || "",
          image_url: item.largeImageUrl || "",
          genre_id: item.booksGenreId || "",
        }),
      });

      if (res.ok) {
        setMessage(`「${item.title}」を本棚に追加しました`);
        setAddedIsbns([...addedIsbns, item.isbn]);
        fetchBooks();
      } else {
        setMessage("登録に失敗しました");
        setAddedIsbns((prev) => prev.filter((isbn) => isbn !== item.isbn));
      }
    } catch (error) {
      console.error("登録に失敗しました:", error);
      setMessage("登録に失敗しました");
      setAddedIsbns((prev) => prev.filter((isbn) => isbn !== item.isbn));
    }
  };
  // ============================================

  // ============================================
  // 🚀 Aさんの修正箇所③：handleDeleteBook
  // (変更点：削除リクエストも認証トークン付きでPython側へ送る)
  // ============================================
  const handleDeleteBook = async () => {
    if (!deleteTarget) return;
    const { id: userBookId, title } = deleteTarget;

    try {
      // ✨ 修正：最新のセッションからトークンを取得
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      // 🛑 ガード：トークンがない場合は中断
      if (!token) {
        setMessage("ログイン情報が取得できません。再ログインしてください");
        return;
      }

      const res = await fetch(`${API_BASE}/api/user_books/${userBookId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setMessage(`「${title}」を削除しました`);
        fetchBooks();
      } else {
        setMessage("削除に失敗しました");
      }
    } catch (error) {
      console.error("削除に失敗しました:", error);
      setMessage("削除に失敗しました");
    } finally {
      setDeleteTarget(null);
    }
  };

  // ============================================

  // --- 検索スタート（バトル画面への遷移） ---
  const handleStart = () => {
    if (unreadBooks.length < 2) {
      setMessage("バトルには未読の本が2冊以上必要です");
      return;
    }
    router.push(
      `/battle?genre=${encodeURIComponent(genre)}&mood=${encodeURIComponent(mood)}`,
    );
  };

  return (
    <div data-theme="coffee" className="h-screen bg-base-200 flex flex-col">
      {/* ========== ヘッダー ========== */}
      <div className="flex justify-between items-center px-5 py-3 bg-base-300">
        <div className="flex items-center gap-2">
          <BookOpen size={20} className="text-primary" />
          <div className="flex flex-col leading-tight">
            <span className="font-serif font-bold text-lg">りどみー！</span>
            <span className="font-serif text-[10px] text-base-content/60">READ ME!</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isPremium && (
            <span className="badge badge-warning badge-sm gap-1">
              <Crown size={12} />
              Premium
            </span>
          )}
          {!isPremium && (
            <button
              onClick={() => router.push("/payment")}
              className="btn btn-ghost btn-sm btn-circle"
              aria-label="決済"
            >
              <JapaneseYen size={20} />
            </button>
          )}
          <button
            onClick={async () => {
              // ✨ 修正：signOut だけでOK（localStorageは自動でクリアされます）
              await supabase.auth.signOut();
              router.push("/login");
            }}
            className="btn btn-ghost btn-sm btn-circle"
            aria-label="ログアウト"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col">
        {/* ========== 通知メッセージ ========== */}
        {message && (
          <div className="alert alert-info mb-3 py-2 text-sm">
            <span>{message}</span>
            <button
              className="btn btn-ghost btn-xs"
              onClick={() => setMessage("")}
            >
              ✕
            </button>
          </div>
        )}

        {/* ========== 未読リスト ヘッダー + 追加ボタン ========== */}
        <div className="flex justify-between items-center mb-3">
          <h1 className="text-xl font-bold font-serif">未読リスト</h1>
          <button
            className="btn btn-sm btn-outline"
            onClick={() => {
              setShowSearch(!showSearch);
              setSearchResults([]);
              setSearchQuery("");
              setMessage("");
              setCurrentPage(1);
              setHasNext(false);
            }}
          >
            {showSearch ? "✕ 閉じる" : "＋ 追加"}
          </button>
        </div>

        {/* ========== 検索窓 ========== */}
        {showSearch && (
          <div className="mb-4">
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                className="input input-bordered flex-1"
                placeholder="タイトルや著者で検索"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch(1)}
              />
              <button
                className="btn btn-primary"
                onClick={() => handleSearch(1)}
                disabled={searching}
              >
                {searching ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  "検索"
                )}
              </button>
            </div>

            {/* --- 検索結果 --- */}
            {searchResults.length > 0 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {searchResults.map((result) => (
                  <div
                    key={result.Item.isbn}
                    className="flex-shrink-0 w-32 text-center flex flex-col"
                  >
                    <img
                      src={result.Item.largeImageUrl}
                      alt={result.Item.title}
                      className="rounded-xl h-40 w-full object-cover"
                    />
                    <p className="font-serif text-xs font-bold line-clamp-2 mt-1">
                      {result.Item.title}
                    </p>
                    <p className="text-xs text-base-content/50 line-clamp-1">
                      {result.Item.author}
                    </p>
                    <p className="text-xs text-base-content/40 line-clamp-1">
                      {result.Item.size} / {result.Item.publisherName}
                    </p>
                    <button
                      className={`btn btn-xs mt-auto w-full ${addedIsbns.includes(result.Item.isbn)
                        ? "btn-disabled"
                        : "btn-primary"
                        }`}
                      onClick={() => handleAddBook(result.Item)}
                      disabled={addedIsbns.includes(result.Item.isbn)}
                    >
                      {addedIsbns.includes(result.Item.isbn)
                        ? "登録済み"
                        : "追加"}
                    </button>
                  </div>
                ))}
                {hasNext && (
                  <button
                    className="btn btn-outline btn-sm flex-shrink-0 self-center"
                    onClick={() => handleSearch(currentPage + 1)}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <span className="loading loading-spinner loading-sm"></span>
                    ) : (
                      "もっと見る →"
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========== 未読一覧カード ========== */}
        <div className="card bg-base-100 shadow-md rounded-2xl p-4 mb-5">
          {loading ? (
            <div className="flex justify-center py-6">
              <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
          ) : unreadBooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-base-content/50">
              <BookOpen size={40} className="mb-3" />
              <p className="font-semibold text-sm">未読の本がありません</p>
              <p className="text-xs mt-1">
                「追加」ボタンから本を登録しましょう
              </p>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-1">
              {unreadBooks.map((ub) => (
                <div key={ub.id} className="flex-shrink-0 w-28 relative">
                  {/* ゴミ箱ボタン */}
                  <button
                    className="absolute -top-1 -right-1 btn btn-ghost btn-xs btn-circle bg-base-300/80 z-10"
                    onClick={() => setDeleteTarget({ id: ub.id, title: ub.books.title })}
                  >
                    <Trash2 size={14} className="text-error" />
                  </button>
                  <BookCard book={ub.books} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ========== ジャンル選択 ========== */}
        <div className="card bg-base-100 shadow-md rounded-2xl p-4 mb-4">
          <label className="label pb-2">
            <span className="label-text font-semibold text-base">ジャンル</span>
          </label>
          <select
            className="select select-bordered w-full text-base"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
          >
            {GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        {/* ========== 気分選択 ========== */}
        <div className="card bg-base-100 shadow-md rounded-2xl p-4 mb-5">
          <label className="label pb-2">
            <span className="label-text font-semibold text-base">今の気分</span>
          </label>
          <select
            className="select select-bordered w-full text-base"
            value={mood}
            onChange={(e) => setMood(e.target.value)}
          >
            {MOODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* ========== 検索スタートボタン ========== */}
        <div className="mt-auto pb-4">
          <button
            className="btn btn-primary w-full text-lg h-14 rounded-xl flex items-center justify-center gap-2"
            onClick={handleStart}
          >
            <BookOpen size={22} />
            検索スタート！
          </button>
          <p className="text-center text-xs text-base-content/50 mt-2">
            ※バトルには未読の本が2冊以上必要です
          </p>
        </div>
      </div>
      {/* ========== 削除確認モーダル ========== */}
      {deleteTarget && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg font-serif">本棚から削除</h3>
            <p className="py-4">「{deleteTarget.title}」を本棚から削除しますか？</p>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => setDeleteTarget(null)}
              >
                キャンセル
              </button>
              <button
                className="btn btn-error"
                onClick={handleDeleteBook}
              >
                削除する
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop"
            onClick={() => setDeleteTarget(null)}
          ></div>
        </div>
      )}
    </div>
  );
}
