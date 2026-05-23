// ============================================
// アプリ全体で使うTypeScript型定義
// えんちゃんさん（バトル画面）と使えるように共通化
// ============================================

// 書籍マスターの型（booksテーブル）
export type Book = {
  isbn: string;
  title: string;
  author: string;
  item_caption: string;
  image_url: string;
  genre_id: string;
  category_id: string;
  size?: string;           // 追加: 「単行本」「文庫」など
  publisher_name?: string; // 追加: 出版社名
};

// ユーザーの本棚の型（user_booksテーブル + booksをJOIN）
export type UserBook = {
  id: string;
  user_id: string;
  isbn: string;
  status: "unread" | "reading" | "completed";
  added_at: string;
  books: Book;
};
