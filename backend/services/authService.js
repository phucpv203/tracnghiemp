import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from './db.js';

// Bắt buộc phải có JWT_SECRET ở môi trường production.
const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  throw new Error(
    'JWT_SECRET chưa được set! Vào Render Dashboard → Environment → thêm biến JWT_SECRET.'
  );
}
if (SECRET.length < 32) {
  throw new Error('JWT_SECRET quá ngắn, cần ít nhất 32 ký tự để an toàn.');
}

/**
 * Tạo JWT có chứa token_version
 * Khi login từ thiết bị mới, version sẽ tăng → token cũ bị vô hiệu
 */
function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      v: Number(user.token_version), // version
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
  // token_version mặc định = 0 (DEFAULT trong schema)
  const result = await query(
    'INSERT INTO users(name, email, password_hash, role, points) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, points, token_version',
    [name, email, password_hash, 'user', 0]
  );
  const user = result.rows[0];
  const token = signToken(user);
  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role, points: Number(user.points) },
    token,
  };
}

export async function loginUser({ email, password }) {
  // Lấy user + version hiện tại
  const result = await query(
    'SELECT id, name, email, password_hash, role, points, token_version FROM users WHERE email = $1',
    [email]
  );
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new Error('Email hoặc mật khẩu không đúng.');
  }

  // TĂNG token_version lên 1 → mọi token cũ (từ thiết bị khác) sẽ bị vô hiệu
  const updateRes = await query(
    'UPDATE users SET token_version = token_version + 1, updated_at = NOW() WHERE id = $1 RETURNING token_version',
    [user.id]
  );
  user.token_version = updateRes.rows[0].token_version;

  const token = signToken(user);
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
 * Lấy thông tin user hiện tại (dùng cho /auth/me)
 * Trả về null nếu không tồn tại
 */
export async function getUserById(id) {
  const result = await query(
    'SELECT id, name, email, role, points, token_version FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}
