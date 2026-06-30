/**
 * Middleware xác thực JWT + Thiết bị
 *
 * - Verify JWT signature
 * - Kiểm tra device_id trong header X-Device-Id có khớp với device trong DB không
 *   (nếu bảng user_devices chưa tồn tại → bỏ qua kiểm tra device)
 * - Nếu không khớp → 401 SESSION_REPLACED (user đã đăng nhập ở thiết bị khác)
 * - Nếu khớp → gắn req.user = { id, email, role } để route dùng
 */
import jwt from 'jsonwebtoken';
import { query } from '../services/db.js';
import { getDeviceByUserId } from '../services/deviceService.js';

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  throw new Error('JWT_SECRET chưa được set trên Render!');
}
if (SECRET.length < 32) {
  throw new Error('JWT_SECRET quá ngắn, cần ≥ 32 ký tự.');
}

// Cache trạng thái bảng user_devices
let HAS_DEVICES_TABLE = null;
async function checkDevicesTable() {
  if (HAS_DEVICES_TABLE !== null) return HAS_DEVICES_TABLE;
  try {
    await query('SELECT 1 FROM user_devices LIMIT 1');
    HAS_DEVICES_TABLE = true;
  } catch (e) {
    if (/relation .*user_devices.* does not exist/i.test(e.message)) {
      HAS_DEVICES_TABLE = false;
    } else {
      throw e;
    }
  }
  return HAS_DEVICES_TABLE;
}

/**
 * Middleware bắt buộc đăng nhập
 */
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      return res.status(401).json({ message: 'Thiếu token. Vui lòng đăng nhập lại.', code: 'NO_TOKEN' });
    }

    let payload;
    try {
      payload = jwt.verify(match[1], SECRET);
    } catch (e) {
      return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn.', code: 'INVALID_TOKEN' });
    }

    // Kiểm tra user có tồn tại trong DB không
    const result = await query('SELECT id, email, role FROM users WHERE id = $1', [payload.sub]);
    if (!result.rows.length) {
      return res.status(401).json({ message: 'Tài khoản không tồn tại.', code: 'USER_NOT_FOUND' });
    }

    const user = result.rows[0];

    // Kiểm tra device (nếu bảng user_devices tồn tại)
    // Cho phép 2 thiết bị: 1 desktop + 1 mobile
    const hasDevices = await checkDevicesTable();
    if (hasDevices) {
      const deviceId = req.headers['x-device-id'];
      const devices = await getDeviceByUserId(user.id);

      if (devices.length > 0) {
        // Nếu user có device trong DB mà request không gửi device_id hoặc gửi sai
        if (!deviceId) {
          return res.status(401).json({
            message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
            code: 'SESSION_REPLACED',
          });
        }

        // Kiểm tra xem deviceId có nằm trong danh sách devices của user không
        const matchedDevice = devices.find(d => d.device_id === deviceId);
        if (!matchedDevice) {
          return res.status(401).json({
            message: 'Tài khoản này đã được đăng nhập trên thiết bị khác. Vui lòng đăng nhập lại.',
            code: 'SESSION_REPLACED',
          });
        }
      }
      // Nếu user chưa có device trong DB (trường hợp user cũ), vẫn cho phép
    }

    req.user = {
      id: Number(user.id),
      email: user.email,
      role: user.role,
    };
    next();
  } catch (error) {
    console.error('[auth] requireAuth error:', error.message);
    res.status(500).json({ message: error.message });
  }
}

/**
 * Middleware bắt buộc role admin
 */
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Chưa đăng nhập.', code: 'NO_AUTH' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Cần quyền admin.', code: 'NOT_ADMIN' });
  }
  next();
}