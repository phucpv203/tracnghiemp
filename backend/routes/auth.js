import { Router } from 'express';
import { registerUser, loginUser, loginAndReplaceDevice, getUserById } from '../services/authService.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const result = await registerUser({ name, email, password });
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password, deviceId, deviceName } = req.body;
    const result = await loginUser({ email, password, deviceId, deviceName });
    res.json(result);
  } catch (error) {
    if (error.code === 'DEVICE_CONFLICT') {
      // Trả về 409 kèm thông tin thiết bị cũ
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
 * Đăng nhập và thay thế thiết bị cũ (đá thiết bị cũ ra)
 * Body: { email, password, deviceId, deviceName }
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