import { NextResponse } from "next/server";
import Stripe from "stripe";

// .env.localから合言葉（シークレットキー）を読み込む
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

export async function POST() {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "jpy",
            product_data: {
              name: "プレミアム属性開放プラン",
              description:
                "年代・性別・職業に合わせた最適なプレゼンが解放されます",
            },
            unit_amount: 500, //500円
          },
          quantity: 1,
        },
      ],
      mode: "payment", //買い切りモード
      success_url: `http://localhost:3000/bookshelf?success=true`,
      cancel_url: `http://localhost:3000/payment`,
    });

    // Stripeが作ってくれた「決済ページのURL」をフロントエンド（画面側）に送り返す
    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
