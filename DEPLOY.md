# 🚀 Hướng dẫn Deploy lên GitHub Pages + Render + Supabase

Kiến trúc: **1 repo (monorepo)** → FE deploy GitHub Pages, BE deploy Render, DB dùng Supabase.

```
┌──────────────────┐      HTTPS      ┌──────────────────┐      SQL      ┌──────────────┐
│  GitHub Pages    │ ──────────────► │   Render (BE)    │ ────────────► │  Supabase DB │
│  (React + Vite)  │                 │   Node Express   │               │  PostgreSQL  │
└──────────────────┘                 └──────────────────┘               └──────────────┘
```

---

## Bước 1 — Chuẩn bị Supabase (Database)

1. Vào https://supabase.com → **New Project**, đặt tên, đặt password DB.
2. Mở **SQL Editor** → paste toàn bộ nội dung `backend/db/schema.sql` → **Run**.
3. **Project Settings → Database** → copy **Connection string (Transaction mode, port 5432)**.
   ```
   postgresql://postgres.xxxx:PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres
   ```
4. Lưu lại: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`.

---

## Bước 2 — Deploy Backend lên Render

1. Push code lên GitHub (xem bước 4).
2. Vào https://render.com → **New +** → **Blueprint** → chọn repo vừa push.
3. Render tự đọc `package.json` ở root → tạo service `trac-nghiem-backend`. Script `start` trong root `package.json` sẽ `cd backend && npm install && node index.js`.
4. Vào **Environment** của service, set các biến:
   - `DATABASE_URL` = connection string Supabase
   - `JWT_SECRET` = chuỗi random dài (vd: `openssl rand -hex 32`)
   - `FRONTEND_URL` = sẽ điền ở bước 3 sau khi có domain GH Pages
5. Đợi deploy xong, copy URL dạng `https://trac-nghiem-backend.onrender.com`.

⚠️ **Lưu ý free tier Render**: server "ngủ" sau 15 phút không có request. Request đầu tiên sẽ mất ~30s.

⚠️ **Nếu service cũ vẫn báo "Couldn't find a package.json"** (do service đã được tạo từ lần trước với cấu hình cũ):
1. Vào **Service → Settings → Build & Deploy**, chỉnh thủ công:
   - **Root Directory**: *(để trống)*
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/health`
2. **Save Changes** → **Manual Deploy** → **Deploy latest commit**.

Lý do: Render tự detect Node từ `package.json` ở root và mặc định chạy `yarn start`. Root `package.json` của repo này có script `start` = `cd backend && node index.js`, nên hoạt động đúng.

---

## Bước 3 — Deploy Frontend lên GitHub Pages

1. Vào **Settings → Secrets and variables → Actions → New repository secret**:
   - Name: `VITE_API_URL`
   - Value: `https://trac-nghiem-backend.onrender.com`
2. ~~Vào **Settings → Pages**: Source = **GitHub Actions**~~ — Workflow `configure-pages@v5` đã có `enablement: true` nên **tự bật Pages cho bạn**, không cần vào Settings.
3. Push code lên branch `main` → workflow `.github/workflows/deploy-frontend.yml` tự chạy.
4. Sau ~1-2 phút, FE sẽ ở: `https://<user>.github.io/tracnghiemp/`.
5. Quay lại Render, set `FRONTEND_URL` = URL GH Pages vừa có → service tự redeploy.

---

## Bước 4 — Push code lên GitHub

```bash
cd "c:\Users\Admin\Downloads\code\trac nghiem v1"
git init               # nếu chưa có
git add .
git commit -m "feat: setup deploy config (GH Pages + Render + Supabase)"
git branch -M main
git remote add origin https://github.com/phucpv203/tracnghiemp.git
git push -u origin main
```

Sau khi push, vào tab **Actions** của repo để xem workflow build & deploy.

---

## Bước 5 — Kiểm tra

- Mở `https://phucpv203.github.io/tracnghiemp/` → app React load được.
- Đăng nhập / đăng ký → kiểm tra Network tab thấy request gọi sang `*.onrender.com` trả 200.
- Render logs hiển thị truy vấn PostgreSQL từ Supabase.

---

## ⚙️ Những gì đã cấu hình trong code

| File | Thay đổi |
|------|----------|
| `frontend/vite.config.js` | Thêm `base: './'` để asset load đúng trên GH Pages |
| `frontend/src/main.jsx` | Đổi `BrowserRouter` → `HashRouter` (SPA routing trên GH Pages) |
| `frontend/.env.production` | Chứa `VITE_API_URL` cho production |
| `frontend/.env.development` | Chứa `VITE_API_URL` cho local dev |
| `.github/workflows/deploy-frontend.yml` | Tự động build & deploy FE khi push `main` |
| `backend/index.js` | CORS whitelist qua `FRONTEND_URL`, thêm `/health` |
| `render.yaml` | Cấu hình deploy BE lên Render Blueprint |
| `package.json` (root) | Proxy scripts `cd backend && npm ...` để Render auto-detect đúng |
| `backend/.env.example` | Mẫu biến môi trường (không commit file `.env` thật) |

---

## ❓ Troubleshooting

- **"Get Pages site failed / Not Found"**: GitHub Pages chưa được bật cho repo. Workflow đã có `enablement: true` để tự bật, nhưng nếu vẫn lỗi → vào **Settings → Pages → Source = GitHub Actions** thủ công rồi chạy lại workflow.
- **Login báo lỗi, Network gọi `http://localhost:4000` thay vì Render**: Bạn **chưa set secret `VITE_API_URL` trong GitHub repo**. Vào **Settings → Secrets and variables → Actions → New repository secret** với Name=`VITE_API_URL`, Value=`https://trac-nghiem-backend.onrender.com`. Push lại để workflow build lại với env đúng.
- **Trang trắng trên GH Pages**: mở DevTools → Console. Thường do path asset sai. Kiểm tra `base: './'` trong `vite.config.js`.
- **CORS error**: chắc chắn `FRONTEND_URL` trên Render đúng domain GH Pages (không có trailing slash).
- **"Couldn't find a package.json" trên Render**: Render auto-detect Node từ root `package.json` của repo này. Script `start` trong đó đã `cd backend && node index.js`. Nếu vẫn lỗi (thường do service cũ cache cấu hình) → vào Render Dashboard → Service → Settings → Build & Deploy → set **Build Command** = `npm run build`, **Start Command** = `npm start`, **Root Directory** = (trống).
- **BE không response**: vào Render → Logs xem có lỗi gì. Free tier ngủ → đợi 30s.
- **DB connection failed**: kiểm tra `DATABASE_URL` đúng chưa, có dùng **Transaction pooler** (port 6543) không, **Session pooler** (port 5432) cũng được.
- **Routing 404 khi refresh**: do đã dùng `HashRouter` nên URL có dạng `/#/courses/...` — refresh OK.
