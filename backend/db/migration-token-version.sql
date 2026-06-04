-- =============================================================
-- Migration: Thêm cột token_version cho bảng users
-- Mục đích: hỗ trợ "1 tài khoản chỉ đăng nhập trên 1 thiết bị cùng lúc"
-- Cách hoạt động:
--   - Mỗi lần login, token_version được tăng lên 1
--   - Token JWT chứa version này
--   - Middleware kiểm tra: nếu version trong token < version trong DB → 401
--   - → Khi login từ thiết bị mới, token cũ tự động vô hiệu
-- =============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

-- Index để check version nhanh hơn
CREATE INDEX IF NOT EXISTS idx_users_token_version ON users(id, token_version);
