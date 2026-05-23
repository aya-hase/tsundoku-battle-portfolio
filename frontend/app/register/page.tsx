"use client";

import Link from "next/link";
import React, { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react"; // アイコンをインポート

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [gender, setGender] = useState("");
  const [occupation, setOccupation] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 1. SupabaseのAuthにユーザーを作成
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(`登録エラー: ${error.message}`);
      setLoading(false);
      return;
    }

    // 💡 修正点：トークンをLocalStorageに保存（ログイン状態を維持するため）
    if (data.session) {
      localStorage.setItem("supabase-token", data.session.access_token);
    }

    // 2. Authに成功したら、作成されたIDを使って users テーブルに属性情報を保存
    if (data.user) {
      const { error: profileError } = await supabase.from("users").insert([
        {
          id: data.user.id,
          email: email,
          age_group: ageGroup,
          gender: gender,
          occupation: occupation,
        },
      ]);

      if (profileError) {
        alert(`属性保存エラー: ${profileError.message}`);
      } else {
        //alert("登録が完了しました！");
        // 💡 修正点：登録成功後、本棚画面へ遷移
        window.location.href = "/bookshelf";
      }
    }
    setLoading(false);
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
            Read me!
          </p>
        </div>
      </div>
      <div className="card w-full max-w-md bg-base-100 shadow-xl border border-base-300">
        <div className="card-body">
          <h2 className="card-title text-3xl font-bold text-primary justify-center mb-6">
            新規登録
          </h2>
          <form onSubmit={handleRegister} className="space-y-4">
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

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">職業</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
              >
                <option value="" disabled>
                  職業を選択
                </option>
                <option value="会社員">会社員</option>
                <option value="学生">学生</option>
                <option value="主婦">主婦</option>
                <option value="自営業">自営業</option>
                <option value="その他">その他</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">年代</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
              >
                <option value="" disabled>
                  年代を選択
                </option>
                {[
                  "10代",
                  "20代",
                  "30代",
                  "40代",
                  "50代",
                  "60代",
                  "70代",
                  "80代",
                  "90代",
                  "100代",
                ].map((age) => (
                  <option key={age} value={age}>
                    {age}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">性別</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="">選択してください</option>
                <option value="male">男性</option>
                <option value="female">女性</option>
                <option value="other">その他</option>
                <option value="secret">秘密</option>
              </select>
            </div>

            <div className="card-actions mt-8">
              <button
                type="submit"
                className={`btn btn-primary w-full text-lg ${loading ? "loading" : ""}`}
                disabled={loading}
              >
                {loading ? "登録中..." : "登録してはじめる"}
              </button>
            </div>
            <div className="mt-4 text-center text-sm">
              <p>
                すでにアカウントをお持ちですか？{" "}
                <Link href="/login" className="link link-primary font-bold">
                  ログインはこちら
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
