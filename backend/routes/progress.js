import { Router } from 'express';
import { getProgress, canUnlockCourse } from '../services/progressionService.js';
import { query } from '../services/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Tất cả các route đều cần đăng nhập
router.use(requireAuth);

/**
 * GET /progress
 * Lấy tiến độ của user hiện tại (từ token)
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const progress = await getProgress(userId);
    const userRes = await query('SELECT points FROM users WHERE id = $1', [userId]);
    const points = userRes.rows.length ? Number(userRes.rows[0].points) : 0;
    res.json({ progress, points });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Debug endpoint: show all courses with their required points
router.get('/debug/courses', async (req, res) => {
  try {
    const courses = await query('SELECT id, title, required_points FROM courses ORDER BY id');
    const userRes = await query('SELECT id, email, points FROM users WHERE id = $1', [req.user.id]);
    res.json({ courses: courses.rows, user: userRes.rows[0] || null });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /progress/:userId
 * Lấy tiến độ của user khác (chỉ admin hoặc chính user đó)
 */
router.get('/:userId', async (req, res) => {
  try {
    const targetId = Number(req.params.userId);
    if (req.user.role !== 'admin' && req.user.id !== targetId) {
      return res.status(403).json({ message: 'Không có quyền xem tiến độ user khác.' });
    }
    const progress = await getProgress(targetId);
    const userRes = await query('SELECT points FROM users WHERE id = $1', [targetId]);
    const points = userRes.rows.length ? Number(userRes.rows[0].points) : 0;
    res.json({ progress, points });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:userId/check-unlock/:courseId', async (req, res) => {
  try {
    const targetId = Number(req.params.userId);
    if (req.user.role !== 'admin' && req.user.id !== targetId) {
      return res.status(403).json({ message: 'Không có quyền.' });
    }
    const isUnlocked = await canUnlockCourse(targetId, req.params.courseId);
    res.json({ courseId: Number(req.params.courseId), unlocked: isUnlocked });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /progress/:userId/unlock/:courseId
 * Unlock a course by spending points
 */
router.post('/:userId/unlock/:courseId', async (req, res) => {
  try {
    const targetId = Number(req.params.userId);
    if (req.user.role !== 'admin' && req.user.id !== targetId) {
      return res.status(403).json({ message: 'Không có quyền.' });
    }
    const courseId = Number(req.params.courseId);

    // Get course info
    const courseRes = await query('SELECT * FROM courses WHERE id = $1', [courseId]);
    if (!courseRes.rows.length) {
      return res.status(404).json({ message: 'Không tìm thấy môn học.' });
    }
    const course = courseRes.rows[0];
    const requiredPoints = Number(course.required_points);

    // Get user points
    const userRes = await query('SELECT points FROM users WHERE id = $1', [targetId]);
    if (!userRes.rows.length) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }
    const userPoints = Number(userRes.rows[0].points);

    // Check if already unlocked
    const existing = await query(
      'SELECT * FROM user_progress WHERE user_id = $1 AND course_id = $2',
      [targetId, courseId]
    );
    if (existing.rows.length && existing.rows[0].status !== 'locked') {
      return res.status(400).json({ message: 'Môn học này đã được mở khóa.' });
    }

    // Check sufficient points
    if (userPoints < requiredPoints) {
      return res.status(400).json({
        message: `Không đủ điểm. Cần ${requiredPoints} điểm, bạn hiện có ${userPoints} điểm.`
      });
    }

    // Deduct points
    await query('UPDATE users SET points = points - $1, updated_at = NOW() WHERE id = $2',
      [requiredPoints, targetId]);

    // Create or update progress record (UPSERT để tránh duplicate key nếu race condition)
    await query(
      `INSERT INTO user_progress (user_id, course_id, score, status, started_at)
       VALUES ($1, $2, 0, 'learning', NOW())
       ON CONFLICT (user_id, course_id) DO UPDATE
       SET status = 'learning', updated_at = NOW()`,
      [targetId, courseId]
    );

    // Return updated points
    const updatedUser = await query('SELECT points FROM users WHERE id = $1', [targetId]);
    const remainingPoints = Number(updatedUser.rows[0].points);

    res.json({
      success: true,
      message: `Đã mở khóa môn học "${course.title}" thành công!`,
      pointsSpent: requiredPoints,
      remainingPoints
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
