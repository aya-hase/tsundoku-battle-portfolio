// ============================================
// BookCard: 本1冊分のカードUI
// 本棚画面（Bなほ）・バトル画面（Cえんちゃん）共通
// ============================================

import { Book } from "../lib/types";

type Props = {
  book: Book;
};

export default function BookCard({ book }: Props) {
  return (
    <div className="card bg-base-100 shadow flex-shrink-0 w-28">
      <figure className="pt-3 px-2">
        <img
          src={book.image_url}
          alt={book.title}
          className="rounded h-32 w-full object-cover"
        />
      </figure>
      <div className="p-2 pt-1">
        <p className="font-serif font-bold text-xs line-clamp-2">
          {book.title}
        </p>
      </div>
    </div>
  );
}
