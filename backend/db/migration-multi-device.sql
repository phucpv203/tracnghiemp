-- Migration: Cho phép mỗi user có tối đa 2 thiết bị (1 mobile + 1 desktop)
-- Thay đổi từ UNIQUE(user_id) thành UNIQUE(user_id, device_type)

-- Thêm cột device_type
ALTER TABLE user_devices ADD COLUMN IF NOT EXISTS device_type VARCHAR(10) NOT NULL DEFAULT 'desktop';

-- Xoá constraint cũ (unique trên user_id)
ALTER TABLE user_devices DROP CONSTRAINT IF EXISTS user_devices_user_id_key;

-- Thêm constraint mới: mỗi user chỉ có 1 device mỗi loại
ALTER TABLE user_devices ADD CONSTRAINT user_devices_user_id_device_type_key UNIQUE (user_id, device_type);