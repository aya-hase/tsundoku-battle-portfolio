import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});
// Supabaseのクライアント作成（環境変数は既存のものに合わせてください）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // 管理者権限のキーが必要です
);
export async function POST(req: Request) {
  const payload = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      payload,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
    console.log("✅ Webhook受信成功:", event.type); // 成功した時もログを出す
  } catch (err: any) {
    console.error("❌ Webhook検証エラー:", err.message);
    console.error(
      "使用中のSECRET:",
      process.env.STRIPE_WEBHOOK_SECRET?.slice(0, 10) + "...",
    );

    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 },
    );
  }
  // 決済が成功した時の処理
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // どのユーザーが買ったかを特定してDBを更新
    const customerEmail = session.customer_details?.email;

    if (customerEmail) {
      console.log("🔍 更新対象のメールアドレス:", customerEmail); // 追加

      const { data, error, count } = await supabase
        .from("users")
        .update({ subscription_status: "premium" }) // 設計書の enum に合わせる
        .eq("email", customerEmail)
        .select();

      if (error) {
        console.error("❌ DB更新エラー:", error.message);
      } else {
        console.log("✨ DB更新結果:", data);
        console.log("📊 更新された行数:", data?.length || 0);
      }
    } else {
      console.warn("⚠️ セッションにメールアドレスが含まれていませんでした");
    }
  }
  return NextResponse.json({ received: true });
}
