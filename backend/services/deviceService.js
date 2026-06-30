/**
 * deviceService - Quản lý thiết bị đăng nhập của user
 *
 * Mỗi user được phép đăng ký tối đa 2 thiết bị: 1 điện thoại + 1 máy tính.
 * Mỗi loại thiết bị chỉ được 1 device duy nhất.
 */
import { query } from './db.js';

/**
 * Xác định loại thiết bị dựa trên tên thiết bị
 */
function detectDeviceType(deviceName) {
  const name = (deviceName || '').toLowerCase();
  if (/android|ios|iphone|ipad|ipod|mobile/i.test(name)) {
    return 'mobile';
  }
  return 'desktop';
}

export async function getDeviceByUserId(userId) {
  const result = await query('SELECT id, user_id, device_id, device_name, device_type FROM user_devices WHERE user_id = $1', [userId]);
  return result.rows || [];
}

export async function getDeviceByDeviceId(deviceId) {
  const result = await query('SELECT id, user_id, device_id, device_name, device_type FROM user_devices WHERE device_id = $1', [deviceId]);
  return result.rows[0] || null;
}

export async function getDeviceByUserIdAndType(userId, deviceType) {
  const result = await query(
    'SELECT id, user_id, device_id, device_name, device_type FROM user_devices WHERE user_id = $1 AND device_type = $2',
    [userId, deviceType]
  );
  return result.rows[0] || null;
}

export async function createOrUpdateDevice(userId, deviceId, deviceName) {
  const deviceType = detectDeviceType(deviceName);
  const result = await query(
    `INSERT INTO user_devices (user_id, device_id, device_name, device_type)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, device_type) DO UPDATE SET device_id = EXCLUDED.device_id, device_name = EXCLUDED.device_name, updated_at = NOW()
     RETURNING id, user_id, device_id, device_name, device_type`,
    [userId, deviceId, deviceName || 'Unknown device', deviceType]
  );
  return result.rows[0];
}

export async function deleteDeviceByUserId(userId) {
  await query('DELETE FROM user_devices WHERE user_id = $1', [userId]);
}

export async function replaceDevice(userId, newDeviceId, newDeviceName) {
  return createOrUpdateDevice(userId, newDeviceId, newDeviceName);
}