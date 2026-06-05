-- =============================================================
-- Migration: Thêm bảng user_devices để quản lý thiết bị đăng nhập
-- Mục đích: thay thế cơ chế token_version bằng cơ chế Device_ID
-- Cách hoạt động:
--   - Mỗi user chỉ được phép đăng nhập trên 1 thiết bị cùng lúc
--   - Khi login, server kiểm tra device_id gửi từ client
--   - Nếu khớp với device_id trong DB → cho phép
--   - Nếu không khớp → báo conflict, yêu cầu xác nhận thay thế
-- =============================================================

CREATE TABLE IF NOT EXISTS user_devices (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id VARCHAR(36) NOT NULL,
  device_name VARCHAR(255) NOT NULL DEFAULT 'Unknown device',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_devices_user_id UNIQUE (user_id),
  CONSTRAINT uq_user_devices_device_id UNIQUE (device_id)
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_device_id ON user_devices(device_id);