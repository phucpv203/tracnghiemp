import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from './db.js';

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  throw new Error(
    'JWT_SECRET chưa được set! Vào Render Dashboard → Environment → thêm biến JWT_SECRET.'
  );
}
if (SECRET.length < 32) {
  throw new Error('JWT_SECRET quá ngắn, cần ít nhất 32 ký tự để an toàn.');
}

// Cache trạng thái cột token_version
let HAS_TOKEN_VERSION = null;
async function checkTokenVersionColumn() {
  if (HAS_TOKEN_VERSION !== null) return HAS_TOKEN_VERSION;
  try {
    await query('SELECT token_version FROM users LIMIT 1');
    HAS_TOKEN_VERSION = true;
  } catch (e) {
    if (/column .*token_version.* does not exist/i.test(e.message)) {
      HAS_TOKEN_VERSION = false;
    } else {
      throw e;
    }
  }
  return HAS_TOKEN_VERSION;
}

async function signToken(user, hasVersion) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      v: hasVersion ? Number(user.token_version) : 0,
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
  const hasVersion = await checkTokenVersionColumn();

  // Tương thích: nếu cột token_version chưa có, không select nó ra
  const sql = hasVersion
    ? 'INSERT INTO users(name, email, password_hash, role, points) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, points, token_version'
    : 'INSERT INTO users(name, email, password_hash, role, points) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, points';

  const result = await query(sql, [name, email, password_hash, 'user', 0]);
  const user = result.rows[0];
  if (!hasVersion) user.token_version = 0;

  const token = await signToken(user, hasVersion);
  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role, points: Number(user.points) },
    token,
  };
}

export async function loginUser({ email, password }) {
  const hasVersion = await checkTokenVersionColumn();
  const selectSql = hasVersion
    ? 'SELECT id, name, email, password_hash, role, points, token_version FROM users WHERE email = $1'
    : 'SELECT id, name, email, password_hash, role, points, 0 AS token_version FROM users WHERE email = $1';

  const result = await query(selectSql, [email]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new Error('Email hoặc mật khẩu không đúng.');
  }

  // Tăng token_version nếu cột tồn tại
  if (hasVersion) {
    const updateRes = await query(
      'UPDATE users SET token_version = token_version + 1, updated_at = NOW() WHERE id = $1 RETURNING token_version',
      [user.id]
    );
    user.token_version = updateRes.rows[0].token_version;
  } else {
    user.token_version = 0;
  }

  const token = await signToken(user, hasVersion);
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
  const hasVersion = await checkTokenVersionColumn();
  const sql = hasVersion
    ? 'SELECT id, name, email, role, points, token_version FROM users WHERE id = $1'
    : 'SELECT id, name, email, role, points FROM users WHERE id = $1';
  const result = await query(sql, [id]);
  return result.rows[0] || null;
}
