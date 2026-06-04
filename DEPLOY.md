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
2. Mở **SQL Editor** → chạy lần lượt:
   - `backend/db/schema.sql` (tạo bảng)
   - `backend/db/migration-token-version.sql` (thêm cột `token_version` để hỗ trợ "1 tài khoản 1 thiết bị")
   - `backend/db/add-user.sql` (tạo user mẫu: `admin@tracnghiem.com` / `admin123` và `user@tracnghiem.com` / `user123`)
3. **Project Settings → Database** → copy **Connection string (Transaction mode, port 6543)**.
   ```
   postgresql://postgres.XXX:PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres
   ```
   ⚠️ **Phải dùng Pooler URL (IPv4)**, không dùng direct (IPv6).
4. Lưu lại: `DATABASE_URL`.

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
| `backend/middleware/auth.js` | **MỚI** — verify JWT + check `token_version` (1 thiết bị 1 tài khoản) |
| `backend/db/migration-token-version.sql` | **MỚI** — thêm cột `token_version` cho bảng users |
| `backend/services/authService.js` | Login tăng version, ký JWT có version; thêm `getUserById` cho `/auth/me` |
| `backend/routes/auth.js` | Thêm endpoint `GET /auth/me` để FE verify token |
| `backend/routes/progress.js` | Dùng `req.user.id` thay hardcode; gắn `requireAuth` |
| `backend/routes/exams.js` | Dùng `req.user.id` thay hardcode; gắn `requireAuth` |
| `backend/routes/admin.js` | Gắn `requireAuth` + `requireAdmin` |
| `frontend/src/services/apiService.js` | Gắn `Authorization: Bearer <token>`; gọi `onUnauthorized` khi 401 |
| `frontend/src/services/authService.js` | Lưu/lấy `token` + `user` từ localStorage |
| `frontend/src/App.jsx` | Verify token với backend khi load; polling 30s; auto-logout khi 401 |
| `frontend/src/pages/LoginPage.jsx` | Lưu token sau khi login |

---

## ❓ Troubleshooting

- **"Get Pages site failed / Not Found"**: GitHub Pages chưa được bật cho repo. Workflow đã có `enablement: true` để tự bật, nhưng nếu vẫn lỗi → vào **Settings → Pages → Source = GitHub Actions** thủ công rồi chạy lại workflow.
- **Login báo lỗi, Network gọi `http://localhost:4000` thay vì Render**: Bạn **chưa set secret `VITE_API_URL` trong GitHub repo**. Vào **Settings → Secrets and variables → Actions → New repository secret** với Name=`VITE_API_URL`, Value=`https://trac-nghiem-backend.onrender.com`. Push lại để workflow build lại với env đúng.
- **Trang trắng trên GH Pages**: mở DevTools → Console. Thường do path asset sai. Kiểm tra `base: './'` trong `vite.config.js`.
- **CORS error "No 'Access-Control-Allow-Origin' header"**: Bạn chưa set `FRONTEND_URL` trên Render. Vào **Render → Service → Environment → Add**: Key=`FRONTEND_URL`, Value=`https://phucpv203.github.io` (CHỈ host, KHÔNG có path `/tracnghiemp/` và KHÔNG có trailing slash). Render tự redeploy. Mở Render Logs để xem `[CORS] Allowed origins:` in ra gì.
- **Test CORS nhanh (curl)**: `curl -H "Origin: https://phucpv203.github.io" -I https://tracnghiemp.onrender.com/health` → response phải có header `access-control-allow-origin: https://phucpv203.github.io`.
- **Test CORS trên browser**: Mở https://phucpv203.github.io/tracnghiemp/ → F12 → Network tab → bấm login → xem request /auth/login có status 200 không. Nếu 200 mà vẫn fail ở frontend → xem response body.
- **"Couldn't find a package.json" trên Render**: Render auto-detect Node từ root `package.json` của repo này. Script `start` trong đó đã `cd backend && node index.js`. Nếu vẫn lỗi (thường do service cũ cache cấu hình) → vào Render Dashboard → Service → Settings → Build & Deploy → set **Build Command** = `npm run build`, **Start Command** = `npm start`, **Root Directory** = (trống).
- **BE không response**: vào Render → Logs xem có lỗi gì. Free tier ngủ → đợi 30s.
- **DB connection failed / `ENETUNREACH 2406:...`**: Render free tier không reach được IPv6. Phải dùng **Connection Pooler URL** (port 6543 hoặc 5432, có IPv4), KHÔNG dùng direct connection (port 5432 host dạng `db.xxx.supabase.co`). Vào Supabase → Settings → Database → Connection string → chọn tab **Transaction** hoặc **Session** → copy URI → paste vào Render `DATABASE_URL` → Save. Xem Render Logs: phải thấy `[DB] Connection string: postgresql://...****@aws-0-...pooler.supabase.com:6543/postgres`.
- **"relation does not exist"**: Chưa chạy `schema.sql` trong Supabase SQL Editor. Vào Supabase → SQL Editor → paste nội dung `backend/db/schema.sql` → Run.
- **"password authentication failed"**: Sai password trong DATABASE_URL. Reset password DB: Supabase → Settings → Database → Database password → Reset.
- **Routing 404 khi refresh**: do đã dùng `HashRouter` nên URL có dạng `/#/courses/...` — refresh OK.
