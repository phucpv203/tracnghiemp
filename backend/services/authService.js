import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from './db.js';
import { getDeviceByUserId, getDeviceByDeviceId, createDevice, replaceDevice } from './deviceService.js';

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  throw new Error(
    'JWT_SECRET chưa được set! Vào Render Dashboard → Environment → thêm biến JWT_SECRET.'
  );
}
if (SECRET.length < 32) {
  throw new Error('JWT_SECRET quá ngắn, cần ít nhất 32 ký tự để an toàn.');
}

// Cache trạng thái cột device_id (kiểm tra bảng user_devices có tồn tại không)
let HAS_DEVICES_TABLE = null;
async function checkDevicesTable() {
  if (HAS_DEVICES_TABLE !== null) return HAS_DEVICES_TABLE;
  try {
    await query('SELECT 1 FROM user_devices LIMIT 1');
    HAS_DEVICES_TABLE = true;
  } catch (e) {
    if (/relation .*user_devices.* does not exist/i.test(e.message)) {
      HAS_DEVICES_TABLE = false;
      console.warn('[auth] ⚠️ Bảng user_devices chưa tồn tại. Tính năng "1 tài khoản 1 thiết bị" sẽ tạm thời bị tắt. Hãy chạy file backend/db/migration-user-devices.sql trong Supabase SQL Editor.');
    } else {
      throw e;
    }
  }
  return HAS_DEVICES_TABLE;
}

async function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    SECRET,
    { expiresIn: '8h' }
  );
}

export async function registerUser({ name, email, password }) {
  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length) {
    throw new Error('Email đã tồn tại.');
  }

  const password_hash = await bcrypt.hash(password, 10);
  const result = await query(
    'INSERT INTO users(name, email, password_hash, role, points) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, points',
    [name, email, password_hash, 'user', 0]
  );
  const user = result.rows[0];

  const token = await signToken(user);
  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role, points: Number(user.points) },
    token,
  };
}

/**
 * Đăng nhập có kiểm tra thiết bị
 * - Nếu user chưa có device nào → tạo mới, login ok
 * - Nếu device gửi lên khớp với device trong DB → login ok
 * - Nếu không khớp → throw error với thông tin device cũ (code: DEVICE_CONFLICT)
 */
export async function loginUser({ email, password, deviceId, deviceName }) {
  const result = await query(
    'SELECT id, name, email, password_hash, role, points FROM users WHERE email = $1',
    [email]
  );
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new Error('Email hoặc mật khẩu không đúng.');
  }

  const hasDevices = await checkDevicesTable();

  if (hasDevices && deviceId) {
    const existingDevice = await getDeviceByUserId(user.id);

    if (existingDevice) {
      // User đã có thiết bị trong DB
      if (existingDevice.device_id === deviceId) {
        // Cùng thiết bị → login bình thường, cập nhật tên thiết bị
        await createDevice(user.id, deviceId, deviceName || 'Unknown device');
      } else {
        // Khác thiết bị → báo conflict
        const err = new Error(`Tài khoản đang được dùng trên "${existingDevice.device_name}". Bạn có muốn xóa thiết bị đó để đăng nhập trên máy này không?`);
        err.code = 'DEVICE_CONFLICT';
        err.existingDevice = {
          deviceId: existingDevice.device_id,
          deviceName: existingDevice.device_name,
        };
        throw err;
      }
    } else {
      // Chưa có device → tạo mới
      await createDevice(user.id, deviceId, deviceName || 'Unknown device');
    }
  }

  const token = await signToken(user);
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      points: Number(user.points),
    },
    token,
  };
}

/**
 * Đăng nhập và thay thế thiết bị cũ (dùng khi user xác nhận muốn đá thiết bị cũ ra)
 */
export async function loginAndReplaceDevice({ email, password, deviceId, deviceName }) {
  const result = await query(
    'SELECT id, name, email, password_hash, role, points FROM users WHERE email = $1',
    [email]
  );
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new Error('Email hoặc mật khẩu không đúng.');
  }

  const hasDevices = await checkDevicesTable();
  if (hasDevices) {
    await replaceDevice(user.id, deviceId, deviceName || 'Unknown device');
  }

  const token = await signToken(user);
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      points: Number(user.points),
    },
    token,
  };
}

export async function getUserById(id) {
  const result = await query(
    'SELECT id, name, email, role, points FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}