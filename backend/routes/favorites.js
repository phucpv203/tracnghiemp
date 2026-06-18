/**
 * Favorites Routes - Quản lý môn học yêu thích của người dùng
 * 
 * Chức năng:
 * - GET /favorites: Lấy danh sách course_ids yêu thích của user hiện tại
 * - POST /favorites/toggle: Thêm hoặc xóa yêu thích (toggle)
 */
import { Router } from 'express';
import { query } from '../services/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Tất cả các route đều cần đăng nhập
router.use(requireAuth);

/**
 * GET /favorites
 * Lấy danh sách các course_id mà user yêu thích
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await query(
      'SELECT course_id FROM user_favorites WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    const favoriteIds = result.rows.map(row => Number(row.course_id));
    res.json({ favoriteIds });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /favorites/toggle
 * Toggle trạng thái yêu thích của một môn học
 * Body: { courseId: number }
 */
router.post('/toggle', async (req, res) => {
  try {
    const userId = req.user.id;
    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({ message: 'Thiếu courseId.' });
    }

    // Kiểm tra course tồn tại
    const courseRes = await query('SELECT id FROM courses WHERE id = $1', [courseId]);
    if (!courseRes.rows.length) {
      return res.status(404).json({ message: 'Không tìm thấy môn học.' });
    }

    // Kiểm tra xem đã yêu thích chưa
    const existing = await query(
      'SELECT id FROM user_favorites WHERE user_id = $1 AND course_id = $2',
      [userId, courseId]
    );

    if (existing.rows.length) {
      // Đã yêu thích -> xóa (bỏ yêu thích)
      await query(
        'DELETE FROM user_favorites WHERE user_id = $1 AND course_id = $2',
        [userId, courseId]
      );
      res.json({ favorite: false, message: 'Đã bỏ yêu thích.' });
    } else {
      // Chưa yêu thích -> thêm
      await query(
        'INSERT INTO user_favorites (user_id, course_id) VALUES ($1, $2)',
        [userId, courseId]
      );
      res.json({ favorite: true, message: 'Đã thêm vào yêu thích.' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
