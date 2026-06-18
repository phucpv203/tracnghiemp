import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { registerUser, loginUser, loginAndReplaceDevice, getUserById } from '../services/authService.js';
import { deleteDeviceByUserId } from '../services/deviceService.js';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../services/db.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/emailService.js';

const router = Router();

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  throw new Error('JWT_SECRET chưa được set!');
}

// Helper: generate random 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * POST /auth/register
 * Đăng ký tài khoản mới, gửi OTP xác thực email
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Kiểm tra email đã tồn tại chưa
    const existing = await query('SELECT id, email_verified FROM users WHERE email = $1', [email]);
    if (existing.rows.length) {
      const user = existing.rows[0];
      if (user.email_verified) {
        return res.status(400).json({ message: 'Email đã tồn tại.' });
      }
      // Nếu tài khoản chưa verified, cho phép đăng ký lại (cập nhật thông tin)
      // Xoá OTP cũ
      await query('DELETE FROM verification_codes WHERE email = $1', [email]);
      // Cập nhật thông tin user
      const password_hash = await bcrypt.hash(password, 10);
      await query(
        'UPDATE users SET name = $1, password_hash = $2, updated_at = NOW() WHERE id = $3',
        [name, password_hash, user.id]
      );
      
      // Tạo OTP mới
      const otp = generateOTP();
      await query(
        'INSERT INTO verification_codes (email, code, type, expires_at) VALUES ($1, $2, $3, $4)',
        [email, otp, 'email_verification', new Date(Date.now() + 5 * 60 * 1000)]
      );
      
      // Gửi email
      await sendVerificationEmail(email, otp, name);
      
      return res.json({
        message: 'Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra email.',
        email
      });
    }
    
    // Tạo user mới
    const password_hash = await bcrypt.hash(password, 10);
    const result = await query(
      'INSERT INTO users(name, email, password_hash, role, points, email_verified) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, role, points',
      [name, email, password_hash, 'user', 0, false]
    );
    
    // Tạo OTP
    const otp = generateOTP();
    await query(
      'INSERT INTO verification_codes (email, code, type, expires_at) VALUES ($1, $2, $3, $4)',
      [email, otp, 'email_verification', new Date(Date.now() + 5 * 60 * 1000)]
    );
    
    // Gửi email
    await sendVerificationEmail(email, otp, name);
    
    res.json({
      message: 'Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra email.',
      email
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * POST /auth/verify-email
 * Xác thực email bằng OTP
 * Body: { email, otp }
 */
router.post('/verify-email', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ message: 'Vui lòng nhập email và mã OTP.' });
    }
    
    // Tìm OTP hợp lệ
    const codeRes = await query(
      `SELECT * FROM verification_codes 
       WHERE email = $1 AND code = $2 AND type = 'email_verification' 
       AND used_at IS NULL AND expires_at > NOW() 
       ORDER BY created_at DESC LIMIT 1`,
      [email, otp]
    );
    
    if (!codeRes.rows.length) {
      // Kiểm tra xem có OTP hết hạn không
      const expiredRes = await query(
        `SELECT * FROM verification_codes 
         WHERE email = $1 AND code = $2 AND type = 'email_verification' AND used_at IS NULL
         ORDER BY created_at DESC LIMIT 1`,
        [email, otp]
      );
      if (expiredRes.rows.length) {
        return res.status(400).json({ message: 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.' });
      }
      return res.status(400).json({ message: 'Mã OTP không đúng.' });
    }
    
    // Đánh dấu OTP đã dùng
    await query('UPDATE verification_codes SET used_at = NOW() WHERE id = $1', [codeRes.rows[0].id]);
    
    // Kích hoạt tài khoản
    await query('UPDATE users SET email_verified = true, updated_at = NOW() WHERE email = $1', [email]);
    
    // Lấy thông tin user
    const userRes = await query('SELECT id, name, email, role, points FROM users WHERE email = $1', [email]);
    const user = userRes.rows[0];
    
    // Tạo token tự động đăng nhập
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      SECRET,
      { expiresIn: '15d' }
    );
    
    res.json({
      message: 'Xác thực email thành công!',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        points: Number(user.points),
      },
      token
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /auth/resend-otp
 * Gửi lại OTP xác thực email
 * Body: { email }
 */
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Vui lòng nhập email.' });
    }
    
    // Kiểm tra email tồn tại
    const userRes = await query('SELECT id, name, email_verified FROM users WHERE email = $1', [email]);
    if (!userRes.rows.length) {
      return res.status(404).json({ message: 'Email không tồn tại trong hệ thống.' });
    }
    
    const user = userRes.rows[0];
    if (user.email_verified) {
      return res.status(400).json({ message: 'Email này đã được xác thực.' });
    }
    
    // Xoá OTP cũ
    await query('DELETE FROM verification_codes WHERE email = $1 AND type = $2 AND used_at IS NULL',
      [email, 'email_verification']);
    
    // Tạo OTP mới
    const otp = generateOTP();
    await query(
      'INSERT INTO verification_codes (email, code, type, expires_at) VALUES ($1, $2, $3, $4)',
      [email, otp, 'email_verification', new Date(Date.now() + 5 * 60 * 1000)]
    );
    
    // Gửi email
    await sendVerificationEmail(email, otp, user.name);
    
    res.json({ message: 'Mã OTP mới đã được gửi đến email của bạn.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /auth/forgot-password
 * Gửi OTP đặt lại mật khẩu
 * Body: { email }
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Vui lòng nhập email.' });
    }
    
    // Kiểm tra email tồn tại
    const userRes = await query('SELECT id, name FROM users WHERE email = $1', [email]);
    if (!userRes.rows.length) {
      // Không tiết lộ email có tồn tại hay không
      return res.json({ message: 'Nếu email tồn tại, mã OTP sẽ được gửi đến bạn.' });
    }
    
    const user = userRes.rows[0];
    
    // Xoá OTP cũ
    await query('DELETE FROM verification_codes WHERE email = $1 AND type = $2 AND used_at IS NULL',
      [email, 'password_reset']);
    
    // Tạo OTP mới
    const otp = generateOTP();
    await query(
      'INSERT INTO verification_codes (email, code, type, expires_at) VALUES ($1, $2, $3, $4)',
      [email, otp, 'password_reset', new Date(Date.now() + 5 * 60 * 1000)]
    );
    
    // Gửi email
    await sendPasswordResetEmail(email, otp, user.name);
    
    res.json({ message: 'Nếu email tồn tại, mã OTP sẽ được gửi đến bạn.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /auth/reset-password
 * Đặt lại mật khẩu với OTP
 * Body: { email, otp, newPassword }
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin.' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự.' });
    }
    
    // Tìm OTP hợp lệ
    const codeRes = await query(
      `SELECT * FROM verification_codes 
       WHERE email = $1 AND code = $2 AND type = 'password_reset' 
       AND used_at IS NULL AND expires_at > NOW() 
       ORDER BY created_at DESC LIMIT 1`,
      [email, otp]
    );
    
    if (!codeRes.rows.length) {
      const expiredRes = await query(
        `SELECT * FROM verification_codes 
         WHERE email = $1 AND code = $2 AND type = 'password_reset' AND used_at IS NULL
         ORDER BY created_at DESC LIMIT 1`,
        [email, otp]
      );
      if (expiredRes.rows.length) {
        return res.status(400).json({ message: 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.' });
      }
      return res.status(400).json({ message: 'Mã OTP không đúng.' });
    }
    
    // Đánh dấu OTP đã dùng
    await query('UPDATE verification_codes SET used_at = NOW() WHERE id = $1', [codeRes.rows[0].id]);
    
    // Cập nhật mật khẩu
    const password_hash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2',
      [password_hash, email]);
    
    res.json({ message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /auth/login
 * Đăng nhập - kiểm tra email đã verified chưa
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password, deviceId, deviceName } = req.body;
    
    // Kiểm tra email đã verified chưa
    const checkRes = await query('SELECT email_verified FROM users WHERE email = $1', [email]);
    if (checkRes.rows.length && !checkRes.rows[0].email_verified) {
      return res.status(403).json({
        message: 'Email chưa được xác thực. Vui lòng kiểm tra email để xác thực tài khoản.',
        code: 'EMAIL_NOT_VERIFIED',
        email
      });
    }
    
    const result = await loginUser({ email, password, deviceId, deviceName });
    res.json(result);
  } catch (error) {
    if (error.code === 'DEVICE_CONFLICT') {
      return res.status(409).json({
        message: error.message,
        code: 'DEVICE_CONFLICT',
        existingDevice: error.existingDevice,
      });
    }
    res.status(401).json({ message: error.message });
  }
});

/**
 * POST /auth/replace-device
 * Đăng nhập và thay thế thiết bị cũ
 */
router.post('/replace-device', async (req, res) => {
  try {
    const { email, password, deviceId, deviceName } = req.body;
    const result = await loginAndReplaceDevice({ email, password, deviceId, deviceName });
    res.json(result);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
});

/**
 * POST /auth/logout
 * Xoá device record và token (logout)
 */
router.post('/logout', requireAuth, async (req, res) => {
  try {
    await deleteDeviceByUserId(req.user.id);
    res.json({ message: 'Đăng xuất thành công.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /auth/me
 * Trả về thông tin user hiện tại (dựa trên token).
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User không tồn tại.' });
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        points: Number(user.points),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;