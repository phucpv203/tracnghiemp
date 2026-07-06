import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { query } from './db.js';
import { getDeviceByUserId, getDeviceByUserIdAndType, createOrUpdateDevice, replaceDevice, detectDeviceType } from './deviceService.js';

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
    { expiresIn: '15d' }
  );
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Email không đúng định dạng.');
  }
  const domainParts = email.split('@')[1]?.split('.') || [];
  const tld = domainParts[domainParts.length - 1];
  if (!tld || tld.length < 2) {
    throw new Error('Email phải có đuôi tên miền hợp lệ (vd: .com, .vn, .net).');
  }
}

export async function registerUser({ name, email, password }) {
  // Kiểm tra định dạng email
  validateEmail(email);

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
 * - Mỗi user được phép có 2 device: 1 điện thoại + 1 máy tính
 * - Nếu chưa có device nào → tạo mới, login ok
 * - Nếu device gửi lên khớp với device cùng loại trong DB → login ok
 * - Nếu device khác loại đã tồn tại → vẫn cho login (cập nhật device cùng loại)
 * - Nếu cùng loại nhưng khác device_id → báo conflict
 */
export async function loginUser({ email, password, deviceId, deviceName }) {
  const result = await query(
    'SELECT id, name, email, password_hash, role, points, last_login FROM users WHERE email = $1',
    [email]
  );
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new Error('Email hoặc mật khẩu không đúng.');
  }

  // Lưu lại last_login cũ (lần đăng nhập trước đó) trước khi cập nhật
  const previousLastLogin = user.last_login;

  // Ghi nhận thời gian đăng nhập hiện tại
  await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

  // Admin không bị kiểm tra/ghi nhận thiết bị
  if (user.role !== 'admin') {
    const hasDevices = await checkDevicesTable();

    if (hasDevices && deviceId) {
      const deviceType = detectDeviceType(deviceName);
      const existingDevice = await getDeviceByUserIdAndType(user.id, deviceType);

      if (existingDevice) {
        // Đã có device cùng loại trong DB
        if (existingDevice.device_id === deviceId) {
          // Cùng device → login bình thường, cập nhật tên
          await createOrUpdateDevice(user.id, deviceId, deviceName || 'Unknown device');
        } else {
          // Khác device cùng loại → báo conflict
          const err = new Error(`Tài khoản đang được dùng trên "${existingDevice.device_name}" (${deviceType === 'mobile' ? 'điện thoại' : 'máy tính'}). Bạn có muốn thay thế thiết bị này để đăng nhập không?`);
          err.code = 'DEVICE_CONFLICT';
          err.existingDevice = {
            deviceId: existingDevice.device_id,
            deviceName: existingDevice.device_name,
            deviceType: existingDevice.device_type,
          };
          throw err;
        }
      } else {
        // Chưa có device cùng loại → tạo mới (hoặc thay thế nếu đã có device khác loại)
        await createOrUpdateDevice(user.id, deviceId, deviceName || 'Unknown device');
      }
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
      lastLogin: previousLastLogin, // Trả về lần đăng nhập trước đó, không phải lần hiện tại
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

  // Admin không bị ghi nhận thiết bị
  if (user.role !== 'admin') {
    const hasDevices = await checkDevicesTable();
    if (hasDevices) {
      await replaceDevice(user.id, deviceId, deviceName || 'Unknown device');
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

export async function getUserById(id) {
  const result = await query(
    'SELECT id, name, email, role, points, last_login FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
let googleClient = null;
function getGoogleClient() {
  if (!GOOGLE_CLIENT_ID) return null;
  if (!googleClient) {
    googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
  }
  return googleClient;
}

/**
 * Đăng nhập / đăng ký bằng Google
 * - Verify idToken từ Google
 * - Nếu email chưa tồn tại → tạo user mới (không cần password_hash)
 * - Nếu tồn tại → đăng nhập
 * - user tự động verified (vì Google đã xác thực)
 */
export async function loginWithGoogle({ idToken, deviceId, deviceName }) {
  const client = getGoogleClient();
  if (!client) {
    throw new Error('Google login chưa được cấu hình.');
  }

  // Verify token
  const ticket = await client.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  const googleEmail = payload.email;
  const googleName = payload.name || payload.email.split('@')[0];

  if (!googleEmail) {
    throw new Error('Không thể lấy email từ tài khoản Google.');
  }

  // Kiểm tra user đã tồn tại chưa
  let result = await query('SELECT id, name, email, role, points FROM users WHERE email = $1', [googleEmail]);
  let user = result.rows[0];

  if (!user) {
    // Tạo user mới (email_verified = true vì Google đã xác thực)
    result = await query(
      `INSERT INTO users(name, email, password_hash, role, points, email_verified)
       VALUES ($1, $2, '', $3, $4, true)
       RETURNING id, name, email, role, points`,
      [googleName, googleEmail, 'user', 0]
    );
    user = result.rows[0];
  }

  // Ghi nhận thời gian đăng nhập
  await query('UPDATE users SET last_login = NOW(), updated_at = NOW() WHERE id = $1', [user.id]);

  // Xử lý device (nếu có)
  if (user.role !== 'admin') {
    const hasDevices = await checkDevicesTable();
    if (hasDevices && deviceId) {
      try {
        await createOrUpdateDevice(user.id, deviceId, deviceName || 'Unknown device');
      } catch (_) {
        // Bỏ qua lỗi device
      }
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
