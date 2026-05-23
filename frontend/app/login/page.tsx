"use client";

import Link from "next/link";
import React, { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation"; // ログイン後に画面を飛ばすために追加
import { BookOpen } from "lucide-react"; // アイコンをインポート

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    console.log("1. ログイン試行開始:", email); // これが出るか
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("2. ログインエラー:", error.message);
      alert(`ログインエラー: ${error.message}`);
      return;
    }
    // ✨ 修正箇所: ログイン成功時にトークンをLocalStorageに保存
    if (data.session) {
      localStorage.setItem("supabase-token", data.session.access_token);
      console.log("3. トークンを保存しました");
    }

    console.log("4. ログイン成功、ユーザーデータ:", data.user);

    if (data.user) {
      console.log("4. 遷移実行直前");
      //alert("ログイン成功！");
      // router.push("/bookshelf"); の代わりにこちらを試してみてください
      window.location.href = "/bookshelf";
    }
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-base-200 p-4">
      {/* アプリ名セクション：サイズをログインと同じ3xlに、フォントを標準太字に */}
      <div className="w-full max-w-md mb-3 flex flex-col items-center">
        <div className="w-fit">
          <div className="flex items-center gap-2 text-primary">
            {/* 文字サイズに合わせてアイコンも少し大きく(w-6)調整 */}
            <BookOpen className="w-6 h-6" strokeWidth={2.5} />
            <h1 className="text-3xl font-bold tracking-tighter">りどみー！</h1>
          </div>
          {/* Read me! もフォントを合わせ、位置を調整 */}
          <p className="text-[11px] font-bold text-primary/80 tracking-[0.2em] uppercase ml-8 -mt-1 text-left">
            READ ME!
          </p>
        </div>
      </div>
      <div className="card w-full max-w-md bg-base-100 shadow-xl border border-base-300">
        <div className="card-body">
          <h2 className="card-title text-3xl font-bold text-primary justify-center mb-6">
            ログイン
          </h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">メールアドレス</span>
              </label>
              <input
                type="email"
                className="input input-bordered w-full focus:input-primary"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">パスワード</span>
              </label>
              <input
                type="password"
                className="input input-bordered w-full focus:input-primary"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="card-actions mt-8">
              <button type="submit" className="btn btn-primary w-full text-lg">
                ログイン
              </button>
            </div>

            <div className="mt-4 text-center text-sm">
              <p>
                アカウントをお持ちでないですか？{" "}
                <Link
                  href="/register"
                  className="link link-secondary font-bold"
                >
                  新規登録はこちら
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
