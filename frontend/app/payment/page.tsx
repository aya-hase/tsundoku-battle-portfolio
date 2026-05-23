"use client";

import { useState } from "react";
import { CreditCard, ArrowLeft, CheckCircle2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PaymentPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter(); // ここで router を定義

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("エラーが発生しました:" + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("通信に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-200 p-5 flex flex-col items-center">
      {/* ヘッダー：リンク先を本棚へ変更 */}
      <header className="navbar max-w-md mb-8">
        <div className="flex-none">
          <button
            onClick={() => router.push("/bookshelf")}
            className="btn btn-ghost btn-circle"
          >
            <ArrowLeft size={24} />
          </button>
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold ml-2">本棚へ戻る</h1>
        </div>
      </header>

      {/* 決済カード */}
      <div className="card w-full max-w-md bg-base-100 shadow-xl border border-base-300">
        <div className="card-body items-center text-center">
          {/* アイコンとバッジ：重なりを解消するために配置を調整 */}
          <div className="indicator mb-6 mt-4">
            {/* アイコン本体：p-5で少し余裕を持たせる */}
            <div className="bg-primary/10 p-5 rounded-3xl text-primary">
              <CreditCard size={48} />
            </div>
          </div>

          <h2 className="card-title text-2xl font-black">
            プレミアム属性解放
            <Sparkles className="text-secondary" size={22} />
          </h2>

          <div className="flex items-baseline gap-1 my-4">
            <span className="text-5xl font-extrabold text-primary">¥500</span>
            <span className="text-base-content/60 text-sm">/ 買い切り</span>
          </div>

          <div className="divider text-xs text-base-content/40 uppercase tracking-widest">
            Special Benefit
          </div>

          <ul className="w-full space-y-4 my-4">
            <li className="flex items-start gap-3 text-left">
              <CheckCircle2 className="text-success flex-shrink-0" size={24} />
              <span className="text-sm font-medium">
                年代・性別・職業に合わせた最適なプレゼンが解放されます
              </span>
            </li>
          </ul>

          <div className="card-actions w-full mt-6">
            <button
              onClick={handleCheckout}
              disabled={loading}
              className={`btn btn-primary btn-block text-lg h-16 shadow-lg ${loading ? "loading" : ""}`}
            >
              {!loading && "プランに加入する"}
            </button>
          </div>

          <p className="text-[10px] text-base-content/50 mt-6 leading-relaxed">
            ※安全なStripe決済画面へ移動します。
            <br />
            決済完了後、自動的に本棚へ戻ります。
          </p>
        </div>
      </div>
    </div>
  );
}
