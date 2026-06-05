/**
 * deviceService - Quản lý thiết bị đăng nhập của user
 *
 * Mỗi user chỉ được phép đăng nhập trên 1 thiết bị cùng lúc.
 * Device_ID được sinh ngẫu nhiên (UUID) và lưu trên trình duyệt (localStorage).
 */
import { query } from './db.js';

export async function getDeviceByUserId(userId) {
  const result = await query('SELECT id, user_id, device_id, device_name FROM user_devices WHERE user_id = $1', [userId]);
  return result.rows[0] || null;
}

export async function getDeviceByDeviceId(deviceId) {
  const result = await query('SELECT id, user_id, device_id, device_name FROM user_devices WHERE device_id = $1', [deviceId]);
  return result.rows[0] || null;
}

export async function createDevice(userId, deviceId, deviceName) {
  const result = await query(
    `INSERT INTO user_devices (user_id, device_id, device_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO UPDATE SET device_id = EXCLUDED.device_id, device_name = EXCLUDED.device_name, updated_at = NOW()
     RETURNING id, user_id, device_id, device_name`,
    [userId, deviceId, deviceName || 'Unknown device']
  );
  return result.rows[0];
}

export async function deleteDeviceByUserId(userId) {
  await query('DELETE FROM user_devices WHERE user_id = $1', [userId]);
}

export async function replaceDevice(userId, newDeviceId, newDeviceName) {
  // Xoá device cũ, tạo device mới (1 câu lệnh để tránh race condition)
  const result = await query(
    `INSERT INTO user_devices (user_id, device_id, device_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO UPDATE SET device_id = EXCLUDED.device_id, device_name = EXCLUDED.device_name, updated_at = NOW()
     RETURNING id, user_id, device_id, device_name`,
    [userId, newDeviceId, newDeviceName || 'Unknown device']
  );
  return result.rows[0];
}