-- Migration: Thêm bảng site_notes để lưu dòng lưu ý riêng cho từng trang
-- page: 'dashboard' | 'login' | 'register'

-- Xoá bảng cũ nếu tồn tại (dữ liệu lưu ý cũ sẽ mất, cần nhập lại)
DROP TABLE IF EXISTS site_notes;

-- Tạo bảng mới
CREATE TABLE site_notes (
  id BIGSERIAL PRIMARY KEY,
  page VARCHAR(20) NOT NULL UNIQUE,
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert 3 dòng mặc định
INSERT INTO site_notes (page, content) VALUES
  ('dashboard', ''),
  ('login', ''),
  ('register', '');