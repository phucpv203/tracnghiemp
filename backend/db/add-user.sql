-- =============================================================
-- Thêm/sửa user trên Supabase
-- Chạy trong: Supabase Dashboard → SQL Editor → New query
-- =============================================================
-- LƯU Ý: password_hash bên dưới đã được mã hoá bằng bcrypt (giống backend Node dùng).
-- KHÔNG paste plain text vào cột password_hash!
--
-- Muốn tạo user với password khác?
-- Chạy: node backend/generate-hash.js <password>  → copy hash mới vào câu lệnh dưới.
-- =============================================================

-- Thêm user mới (id tự tăng, trùng email sẽ tự skip)
INSERT INTO users (name, email, password_hash, role, points, created_at, updated_at)
VALUES
  -- Admin mẫu: email=admin@tracnghiem.com, password=admin123
  ('Admin', 'admin@tracnghiem.com', '$2a$10$V/MS7tK/q45MSz0CU1531.GlIIDTDi7TGx3yQlu2viYy4Xk20unxi', 'admin', 1000, now(), now()),

  -- User thường mẫu: email=user@tracnghiem.com, password=user123
  ('Nguyễn Văn A', 'user@tracnghiem.com', '$2a$10$.OerHttCBPrw7hwiNgddlez9.uIE535au0Rk6VTskhs.30pg5fRkC', 'user', 100, now(), now())
ON CONFLICT (email) DO UPDATE
  SET name = EXCLUDED.name,
      password_hash = EXCLUDED.password_hash,
      role = EXCLUDED.role,
      points = EXCLUDED.points,
      updated_at = now();

-- =============================================================
-- CÁC CÂU LỆNH HỮU ÍCH KHÁC
-- =============================================================

-- 1. Set user thành admin (thay email cụ thể)
-- UPDATE users SET role = 'admin', updated_at = now() WHERE email = 'user@tracnghiem.com';

-- 2. Reset password cho user (paste hash mới từ generate-hash.js)
-- UPDATE users SET password_hash = '$2a$10$NEW_HASH_HERE', updated_at = now() WHERE email = 'user@tracnghiem.com';

-- 3. Cộng điểm cho user
-- UPDATE users SET points = points + 500, updated_at = now() WHERE email = 'user@tracnghiem.com';

-- 4. Xoá user (cẩn thận, sẽ xoá cả progress liên quan)
-- DELETE FROM users WHERE email = 'user@tracnghiem.com';

-- 5. Xem tất cả user
-- SELECT id, name, email, role, points, created_at FROM users ORDER BY id;
