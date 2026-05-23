import { Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";
import "./globals.css"; // 同じフォルダのglobals.cssを読み込む

const notoSans = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-sans",
});

const notoSerif = Noto_Serif_JP({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-serif",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" data-theme="coffee"> {/* ここを変えるだけでOKになる */}
      <body className={`${notoSans.variable} ${notoSerif.variable} font-sans bg-base-200 text-base-content`}>
        {children}
      </body>
    </html>
  );
}