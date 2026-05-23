# Tsundoku Battle

<br>

### 構成

<p>フロントエンド：Next.js (React)</p>
<p>バックエンド：FastAPI (Python)</p>
<p>データベース：Supabase</p>
<p>キャッシュ：Redis</p>
<p>決済：Stripe</p>
<p>実行環境：Docker / Docker Compose</p>

<br>

## リポジトリの取得

<p>git clone https://github.com/your-org/tsundoku-battle.git</p>
<p>cd tsundoku-battle</p>

<br>

## 環境変数の設定（初回のみ）

<p>①.env ファイルを作成（ルート直下）</p>
<p>touch .env</p>

<p>②.env の中身（例）</p>
<p># ======================</p>
<p># Supabase</p>
<p># ======================</p>
<p>SUPABASE_URL=https://gb・・・・・</p>

<p># Backend ONLY</p>
<p>SUPABASE_SERVICE_ROLE_KEY=sb_service_role_xxxxxxxxxxxxx</p>

<p># Frontend ONLY</p>
<p>NEXT_PUBLIC_SUPABASE_URL=https://gb・・・・・</p>
<p>NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxx</p>

<p># ======================</p>
<p># Redis（Docker内）</p>
<p># ======================</p>
<p>REDIS_URL=redis://redis:6379</p>

<p># ======================</p>
<p># Stripe</p>
<p># ======================</p>
<p>STRIPE_SECRET_KEY=sk_test_xxxxx</p>
<p>STRIPE_WEBHOOK_SECRET=whsec_xxxxx</p>

<p># ======================</p>
<p># Auth</p>
<p># ======================</p>
<p>JWT_SECRET=change-me</p>

<p># ======================</p>
<p># API</p>
<p># ======================</p>
<p>NEXT_PUBLIC_API_BASE_URL=http://localhost:8000</p>

<br>

## 起動手順（フロント＋バック）

<p>・Docker Compose 起動（初回はビルドあり）</p>
<p>docker compose up --build</p>

<p>・2回目以降　：　docker compose up</p>

<p>＜動作確認＞</p>
<p>・フロントエンド　：　http://localhost:3000</p>
<p>・バックエンド（Swagger UI）　：　http://localhost:8000/docs</p>
<p>・ヘルスチェック　：　http://localhost:8000/health  （{"status":"ok"}と表示されればOK）</p>

<p>停止方法　：　Ctrl + C</p>

<p>★注意事項　：　フロントエンドは バックエンドが起動していないとAPI通信に失敗します</p>

## 依存関係

<p>frontend → package.json</p>
<p>backend → requirements.txt</p>
<p>追加ライブラリは 必ずチームに共有してください</p>

## トラブルシューティング

<p>〇コンテナが起動しない場合</p>
<p>docker compose down -v</p>
<p>docker compose build --no-cache</p>
<p>docker compose up</p>

<p>〇FastAPI が落ちる場合</p>
<p>backend/main.py に app = FastAPI() があるか確認</p>

<p>〇Reactインストール</p>
cd frontend
# 型定義とTypeScriptをローカルにもインストール
npm install --save-dev typescript @types/react @types/node @types/react-dom
