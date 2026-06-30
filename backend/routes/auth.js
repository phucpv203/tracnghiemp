import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { registerUser, loginUser, loginAndReplaceDevice, getUserById } from '../services/authService.js';
import { deleteDeviceByUserId, replaceDevice } from '../services/deviceService.js';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../services/db.js';
import { sendVerificationEmail, sendPasswordResetEmail, sendDeviceChangeOtpEmail } from '../services/emailService.js';

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
      await query('DELETE FROM verification_codes WHERE email = $1', [email]);
      const password_hash = await bcrypt.hash(password, 10);
      await query(
        'UPDATE users SET name = $1, password_hash = $2, updated_at = NOW() WHERE id = $3',
        [name, password_hash, user.id]
      );
      
      const otp = generateOTP();
      await query(
        'INSERT INTO verification_codes (email, code, type, expires_at) VALUES ($1, $2, $3, $4)',
        [email, otp, 'email_verification', new Date(Date.now() + 5 * 60 * 1000)]
      );
      
      await sendVerificationEmail(email, otp, name);
      
      return res.json({
        message: 'Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra email.',
        email
      });
    }
    
    // Tạo user mới
    const password_hash = await bcrypt.hash(password, 10);
    await query(
      'INSERT INTO users(name, email, password_hash, role, points, email_verified) VALUES ($1, $2, $3, $4, $5, $6)',
      [name, email, password_hash, 'user', 0, false]
    );
    
    const otp = generateOTP();
    await query(
      'INSERT INTO verification_codes (email, code, type, expires_at) VALUES ($1, $2, $3, $4)',
      [email, otp, 'email_verification', new Date(Date.now() + 5 * 60 * 1000)]
    );
    
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
 */
router.post('/verify-email', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ message: 'Vui lòng nhập email và mã OTP.' });
    }
    
    const codeRes = await query(
      `SELECT * FROM verification_codes 
       WHERE email = $1 AND code = $2 AND type = 'email_verification' 
       AND used_at IS NULL AND expires_at > NOW() 
       ORDER BY created_at DESC LIMIT 1`,
      [email, otp]
    );
    
    if (!codeRes.rows.length) {
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
    
    await query('UPDATE verification_codes SET used_at = NOW() WHERE id = $1', [codeRes.rows[0].id]);
    await query('UPDATE users SET email_verified = true, updated_at = NOW() WHERE email = $1', [email]);
    
    const userRes = await query('SELECT id, name, email, role, points FROM users WHERE email = $1', [email]);
    const user = userRes.rows[0];
    
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
 */
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Vui lòng nhập email.' });
    }
    
    const userRes = await query('SELECT id, name, email_verified FROM users WHERE email = $1', [email]);
    if (!userRes.rows.length) {
      return res.status(404).json({ message: 'Email không tồn tại trong hệ thống.' });
    }
    
    const user = userRes.rows[0];
    if (user.email_verified) {
      return res.status(400).json({ message: 'Email này đã được xác thực.' });
    }
    
    await query('DELETE FROM verification_codes WHERE email = $1 AND type = $2 AND used_at IS NULL',
      [email, 'email_verification']);
    
    const otp = generateOTP();
    await query(
      'INSERT INTO verification_codes (email, code, type, expires_at) VALUES ($1, $2, $3, $4)',
      [email, otp, 'email_verification', new Date(Date.now() + 5 * 60 * 1000)]
    );
    
    await sendVerificationEmail(email, otp, user.name);
    
    res.json({ message: 'Mã OTP mới đã được gửi đến email của bạn.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /auth/forgot-password
 * Gửi OTP đặt lại mật khẩu
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Vui lòng nhập email.' });
    }
    
    const userRes = await query('SELECT id, name FROM users WHERE email = $1', [email]);
    if (!userRes.rows.length) {
      return res.json({ message: 'Nếu email tồn tại, mã OTP sẽ được gửi đến bạn.' });
    }
    
    const user = userRes.rows[0];
    
    await query('DELETE FROM verification_codes WHERE email = $1 AND type = $2 AND used_at IS NULL',
      [email, 'password_reset']);
    
    const otp = generateOTP();
    await query(
      'INSERT INTO verification_codes (email, code, type, expires_at) VALUES ($1, $2, $3, $4)',
      [email, otp, 'password_reset', new Date(Date.now() + 5 * 60 * 1000)]
    );
    
    await sendPasswordResetEmail(email, otp, user.name);
    
    res.json({ message: 'Nếu email tồn tại, mã OTP sẽ được gửi đến bạn.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /auth/reset-password
 * Đặt lại mật khẩu với OTP
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
    
    await query('UPDATE verification_codes SET used_at = NOW() WHERE id = $1', [codeRes.rows[0].id]);
    
    const password_hash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2',
      [password_hash, email]);
    
    res.json({ message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /auth/request-device-otp
 * Gửi OTP để xác nhận đổi thiết bị (kiểm tra giới hạn 1 tuần)
 * Body: { email, password, deviceId, deviceName }
 */
router.post('/request-device-otp', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu.' });
    }
    
    // Xác thực thông tin đăng nhập
    const result = await query(
      'SELECT id, name, email, password_hash, email_verified, last_device_change_at FROM users WHERE email = $1',
      [email]
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' });
    }
    
    if (!user.email_verified) {
      return res.status(403).json({
        message: 'Email chưa được xác thực. Vui lòng xác thực email trước.',
        code: 'EMAIL_NOT_VERIFIED',
        email
      });
    }
    
    // Kiểm tra giới hạn 1 tuần
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    if (user.last_device_change_at) {
      const timeSinceLastChange = Date.now() - new Date(user.last_device_change_at).getTime();
      if (timeSinceLastChange < ONE_WEEK_MS) {
        const remainingMs = ONE_WEEK_MS - timeSinceLastChange;
        const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
        return res.status(429).json({
          message: `Bạn chỉ được phép đổi thiết bị mỗi tuần một lần. Vui lòng thử lại sau ${remainingDays} ngày.`,
          code: 'DEVICE_CHANGE_LIMIT',
          remainingDays
        });
      }
    }
    
    // Xoá OTP cũ
    await query('DELETE FROM verification_codes WHERE email = $1 AND type = $2 AND used_at IS NULL',
      [email, 'device_change']);
    
    // Tạo OTP mới
    const otp = generateOTP();
    await query(
      'INSERT INTO verification_codes (email, code, type, expires_at) VALUES ($1, $2, $3, $4)',
      [email, otp, 'device_change', new Date(Date.now() + 5 * 60 * 1000)]
    );
    
    // Gửi email OTP xác nhận đổi thiết bị
    const devices = await query(
      'SELECT device_name, device_type FROM user_devices WHERE user_id = $1',
      [user.id]
    );
    const deviceNames = devices.rows.map(d => {
      const typeLabel = d.device_type === 'mobile' ? 'điện thoại' : 'máy tính';
      return `${d.device_name} (${typeLabel})`;
    });
    const currentDeviceName = deviceNames.length > 0 ? deviceNames.join(', ') : 'thiết bị hiện tại';
    
    await sendDeviceChangeOtpEmail(email, otp, user.name, currentDeviceName);
    
    res.json({
      message: `Mã OTP đã được gửi đến email ${email}. Vui lòng kiểm tra email để xác nhận đổi thiết bị.`,
      email
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /auth/verify-device-otp
 * Xác nhận OTP và đổi thiết bị (đăng nhập)
 * Body: { email, otp, password, deviceId, deviceName }
 */
router.post('/verify-device-otp', async (req, res) => {
  try {
    const { email, otp, deviceId, deviceName } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ message: 'Vui lòng nhập email và mã OTP.' });
    }
    
    // Tìm OTP hợp lệ
    const codeRes = await query(
      `SELECT * FROM verification_codes 
       WHERE email = $1 AND code = $2 AND type = 'device_change' 
       AND used_at IS NULL AND expires_at > NOW() 
       ORDER BY created_at DESC LIMIT 1`,
      [email, otp]
    );
    
    if (!codeRes.rows.length) {
      const expiredRes = await query(
        `SELECT * FROM verification_codes 
         WHERE email = $1 AND code = $2 AND type = 'device_change' AND used_at IS NULL
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
    
    // Lấy user
    const userRes = await query('SELECT id, name, email, role, points FROM users WHERE email = $1', [email]);
    const user = userRes.rows[0];
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }
    
    // Thay thế thiết bị và cập nhật last_device_change_at
    await replaceDevice(user.id, deviceId, deviceName || 'Unknown device');
    
    // Cập nhật thời gian đổi thiết bị
    await query('UPDATE users SET last_device_change_at = NOW(), updated_at = NOW() WHERE id = $1', [user.id]);
    
    // Tạo token
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      SECRET,
      { expiresIn: '15d' }
    );
    
    res.json({
      message: 'Đổi thiết bị thành công!',
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
 * POST /auth/login
 * Đăng nhập - kiểm tra email verified và thiết bị
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
 * POST /auth/replace-device (legacy - giữ để tương thích)
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
 * Chỉ đăng xuất (xoá token phía client), KHÔNG xoá device cũ
 */
router.post('/logout', requireAuth, async (req, res) => {
  try {
    res.json({ message: 'Đăng xuất thành công.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /auth/me
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