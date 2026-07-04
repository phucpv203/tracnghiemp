-- Fix: Xoá ràng buộc UNIQUE (user_id) cũ và thay bằng UNIQUE (user_id, device_type)
-- Vì code mới cho phép mỗi user có 2 thiết bị: 1 desktop + 1 mobile

-- Xoá ràng buộc cũ
ALTER TABLE user_devices DROP CONSTRAINT IF EXISTS uq_user_devices_user_id;

-- Thêm ràng buộc mới (nếu chưa có)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_user_devices_user_device_type'
  ) THEN
    ALTER TABLE user_devices ADD CONSTRAINT uq_user_devices_user_device_type UNIQUE (user_id, device_type);
  END IF;
END $$;

-- Thêm cột device_type nếu chưa có
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_devices' AND column_name = 'device_type'
  ) THEN
    ALTER TABLE user_devices ADD COLUMN device_type VARCHAR(20) NOT NULL DEFAULT 'desktop';
  END IF;
END $$;