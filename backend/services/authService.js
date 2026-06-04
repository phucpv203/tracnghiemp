import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from './db.js';

const SECRET = process.env.JWT_SECRET || 'quiz-secret-key';

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
  return result.rows[0];
}

export async function loginUser({ email, password }) {
  const result = await query('SELECT id, name, email, password_hash, role FROM users WHERE email = $1', [email]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new Error('Email hoặc mật khẩu không đúng.');
  }
  const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, SECRET, { expiresIn: '8h' });
  return { user: { id: user.id, name: user.name, email: user.email, role: user.role }, token };
}
