import { Router } from 'express';
import { getProgress, canUnlockCourse } from '../services/progressionService.js';
import { query } from '../services/db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const progress = await getProgress(1);
    // Also return user points
    const userRes = await query('SELECT points FROM users WHERE id = $1', [1]);
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
    const userRes = await query('SELECT id, email, points FROM users WHERE id = 1');
    res.json({ courses: courses.rows, user: userRes.rows[0] || null });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:userId', async (req, res) => {
  try {
    const progress = await getProgress(req.params.userId);
    const userRes = await query('SELECT points FROM users WHERE id = $1', [Number(req.params.userId)]);
    const points = userRes.rows.length ? Number(userRes.rows[0].points) : 0;
    res.json({ progress, points });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:userId/check-unlock/:courseId', async (req, res) => {
  try {
    const isUnlocked = await canUnlockCourse(req.params.userId, req.params.courseId);
    res.json({ courseId: Number(req.params.courseId), unlocked: isUnlocked });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /progress/:userId/unlock/:courseId
 * Unlock a course by spending points
 * Request body: { pointsToSpend: number }
 */
router.post('/:userId/unlock/:courseId', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const courseId = Number(req.params.courseId);

    // Get course info
    const courseRes = await query('SELECT * FROM courses WHERE id = $1', [courseId]);
    if (!courseRes.rows.length) {
      return res.status(404).json({ message: 'Không tìm thấy môn học.' });
    }
    const course = courseRes.rows[0];
    const requiredPoints = Number(course.required_points);

    // Get user points
    const userRes = await query('SELECT points FROM users WHERE id = $1', [userId]);
    if (!userRes.rows.length) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }
    const userPoints = Number(userRes.rows[0].points);

    // Check if already unlocked
    const existing = await query(
      'SELECT * FROM user_progress WHERE user_id = $1 AND course_id = $2',
      [userId, courseId]
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
      [requiredPoints, userId]);

    // Create or update progress record
    if (existing.rows.length) {
      await query(
        `UPDATE user_progress SET status = 'learning', updated_at = NOW() WHERE user_id = $1 AND course_id = $2`,
        [userId, courseId]
      );
    } else {
      await query(
        `INSERT INTO user_progress (user_id, course_id, score, status, started_at)
         VALUES ($1, $2, 0, 'learning', NOW())`,
        [userId, courseId]
      );
    }

    // Return updated points
    const updatedUser = await query('SELECT points FROM users WHERE id = $1', [userId]);
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