/**
 * Middleware xác thực JWT
 *
 * - Verify JWT signature
 * - Check token_version trong DB có khớp với version trong token không
 *   (nếu cột token_version chưa tồn tại → fallback version=0 để tương thích ngược)
 * - Nếu không khớp → 401 (user đã đăng nhập ở nơi khác)
 * - Nếu khớp → gắn req.user = { id, email, role, version } để route dùng
 */
import jwt from 'jsonwebtoken';
import { query } from '../services/db.js';

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  throw new Error('JWT_SECRET chưa được set trên Render!');
}
if (SECRET.length < 32) {
  throw new Error('JWT_SECRET quá ngắn, cần ≥ 32 ký tự.');
}

// Cache trạng thái cột token_version (true = có, false = chưa)
let HAS_TOKEN_VERSION = null;
async function checkTokenVersionColumn() {
  if (HAS_TOKEN_VERSION !== null) return HAS_TOKEN_VERSION;
  try {
    await query('SELECT token_version FROM users LIMIT 1');
    HAS_TOKEN_VERSION = true;
  } catch (e) {
    if (/column .*token_version.* does not exist/i.test(e.message)) {
      HAS_TOKEN_VERSION = false;
      console.warn('[auth] ⚠️  Cột token_version chưa tồn tại. Tính năng "1 tài khoản 1 thiết bị" sẽ tạm thời bị tắt. Hãy chạy file backend/db/migration-token-version.sql trong Supabase SQL Editor.');
    } else {
      throw e;
    }
  }
  return HAS_TOKEN_VERSION;
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

    const hasVersion = await checkTokenVersionColumn();
    const sql = hasVersion
      ? 'SELECT id, email, role, token_version FROM users WHERE id = $1'
      : 'SELECT id, email, role, 0 AS token_version FROM users WHERE id = $1';
    const result = await query(sql, [payload.sub]);
    if (!result.rows.length) {
      return res.status(401).json({ message: 'Tài khoản không tồn tại.', code: 'USER_NOT_FOUND' });
    }

    const user = result.rows[0];
    if (hasVersion && Number(user.token_version) !== Number(payload.v)) {
      return res.status(401).json({
        message: 'Phiên đăng nhập đã hết hạn. Bạn đang đăng nhập ở nơi khác.',
        code: 'SESSION_REPLACED',
      });
    }

    req.user = {
      id: Number(user.id),
      email: user.email,
      role: user.role,
      version: hasVersion ? Number(user.token_version) : 0,
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
