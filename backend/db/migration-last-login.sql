-- Migration: Thêm cột last_login vào bảng users
-- Thêm cột để ghi nhận thời gian đăng nhập cuối cùng của người dùng

ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;