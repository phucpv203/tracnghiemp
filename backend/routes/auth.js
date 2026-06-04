import { Router } from 'express';
import { registerUser, loginUser, getUserById } from '../services/authService.js';
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
    const { email, password } = req.body;
    const result = await loginUser({ email, password });
    res.json(result);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
});

/**
 * GET /auth/me
 * Trả về thông tin user hiện tại (dựa trên token).
 * - Nếu token hợp lệ + version khớp → 200 + user
 * - Nếu token sai/hết hạn/version không khớp → 401
 *
 * Dùng để FE verify token khi reload trang.
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
