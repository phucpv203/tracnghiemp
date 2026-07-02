import { Router } from 'express';
import { query } from '../services/db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /notes - Lấy dòng lưu ý (ai cũng xem được)
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT id, content, updated_at FROM site_notes LIMIT 1');
    const note = result.rows[0] || { id: null, content: '', updated_at: null };
    res.json({ note });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /notes - Admin sửa dòng lưu ý
router.put('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { content } = req.body;
    const result = await query(
      `UPDATE site_notes SET content = $1, updated_at = now() WHERE id = (SELECT id FROM site_notes LIMIT 1) RETURNING id, content, updated_at`,
      [content ?? '']
    );
    if (!result.rows.length) {
      // Nếu chưa có row nào, insert mới
      const insertResult = await query(
        'INSERT INTO site_notes (content) VALUES ($1) RETURNING id, content, updated_at',
        [content ?? '']
      );
      return res.json({ note: insertResult.rows[0] });
    }
    res.json({ note: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;