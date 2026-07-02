import { Router } from 'express';
import { query } from '../services/db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /notes?page=dashboard|login|register - Lấy dòng lưu ý theo trang
router.get('/', async (req, res) => {
  try {
    const page = req.query.page || 'dashboard';
    const validPages = ['dashboard', 'login', 'register'];
    if (!validPages.includes(page)) {
      return res.status(400).json({ message: 'Page không hợp lệ. Chấp nhận: dashboard, login, register' });
    }
    const result = await query('SELECT id, page, content, updated_at FROM site_notes WHERE page = $1 LIMIT 1', [page]);
    const note = result.rows[0] || { id: null, page, content: '', updated_at: null };
    res.json({ note });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /notes/all - Admin lấy tất cả lưu ý
router.get('/all', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await query('SELECT id, page, content, updated_at FROM site_notes ORDER BY page');
    // Nếu thiếu page nào, tạo object rỗng
    const notes = { dashboard: '', login: '', register: '' };
    result.rows.forEach(row => {
      notes[row.page] = row.content;
    });
    res.json({ notes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /notes?page=dashboard|login|register - Admin sửa dòng lưu ý theo trang
router.put('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const page = req.query.page || req.body.page || 'dashboard';
    const { content } = req.body;
    const validPages = ['dashboard', 'login', 'register'];
    if (!validPages.includes(page)) {
      return res.status(400).json({ message: 'Page không hợp lệ. Chấp nhận: dashboard, login, register' });
    }

    const result = await query(
      `INSERT INTO site_notes (page, content, updated_at) 
       VALUES ($1, $2, now())
       ON CONFLICT (page) 
       DO UPDATE SET content = $2, updated_at = now()
       RETURNING id, page, content, updated_at`,
      [page, content ?? '']
    );
    res.json({ note: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;