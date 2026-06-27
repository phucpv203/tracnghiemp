/**
 * Course Routes - Các endpoint liên quan đến khóa học
 * 
 * Chức năng:
 * - GET /: Lấy danh sách tất cả khóa học (không cần đăng nhập)
 * - GET /:id: Lấy thông tin chi tiết khóa học (cần đăng nhập + đã mở khóa)
 * - GET /:id/study: Lấy dữ liệu cho chế độ học tập (cần đăng nhập + đã mở khóa)
 * - GET /:id/preview: Lấy 20 câu hỏi đầu cho guest dùng thử (không cần đăng nhập)
 */
import { Router } from 'express';
import { query } from '../services/db.js';
import { getQuestionsWithAnswers } from '../services/questionsService.js';
import { isCourseAccessible } from '../services/progressionService.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

/**
 * GET /courses
 * Lấy danh sách tất cả các khóa học
 * 
 * Response:
 * {
 *   items: Array<{id, title, slug, required_points, ...}>
 * }
 */
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM courses ORDER BY id');
    res.json({ items: result.rows });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /courses/:id/preview
 * Lấy 20 câu hỏi đầu tiên cho guest dùng thử (không cần đăng nhập)
 * 
 * Response:
 * {
 *   course: {
 *     id: number,
 *     title: string,
 *     description: string,
 *     questions: Array<{id, content, answers: Array<{id, answer_text, is_correct}>}>
 *   }
 * }
 */
router.get('/:id/preview', async (req, res) => {
  try {
    const result = await query('SELECT * FROM courses WHERE id = $1', [Number(req.params.id)]);
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Không tìm thấy môn học.' });
    }
    const course = result.rows[0];
    
    // Lấy 20 câu hỏi đầu tiên
    const questions = await getQuestionsWithAnswers(course.id);
    const previewQuestions = questions.slice(0, 20);
    
    res.json({ 
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
        questions: previewQuestions
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /courses/:id
 * Lấy thông tin chi tiết của một khóa học, bao gồm danh sách câu hỏi
 * Yêu cầu: Đã đăng nhập + đã mở khóa môn học (hoặc môn miễn phí)
 * 
 * Response:
 * {
 *   course: {
 *     id: number,
 *     title: string,
 *     slug: string,
 *     required_points: number,
 *     questions: Array<{id, content, answers: Array<{id, answer_text, is_correct}>}>
 *   }
 * }
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const result = await query('SELECT * FROM courses WHERE id = $1', [Number(req.params.id)]);
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Không tìm thấy môn học.' });
    }
    const course = result.rows[0];

    // Kiểm tra quyền truy cập (admin luôn được phép)
    if (req.user.role !== 'admin') {
      const accessible = await isCourseAccessible(req.user.id, course.id);
      if (!accessible) {
        return res.status(403).json({
          message: 'Bạn chưa mở khóa môn học này. Vui lòng mở khóa để truy cập.',
          code: 'COURSE_LOCKED'
        });
      }
    }
    
    // Fetch questions for this course
    const questions = await getQuestionsWithAnswers(course.id);
    course.questions = questions;
    
    res.json({ course });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /courses/:id/study
 * Lấy dữ liệu khóa học cho chế độ học tập (có đáp án để tham khảo)
 * Yêu cầu: Đã đăng nhập + đã mở khóa môn học (hoặc môn miễn phí)
 * 
 * Response:
 * {
 *   course: {
 *     id: number,
 *     title: string,
 *     questions: Array<{
 *       id: number,
 *       content: string,
 *       answers: Array<{id, answer_text, is_correct}>
 *     }>
 *   }
 * }
 */
router.get('/:id/study', requireAuth, async (req, res) => {
  try {
    const result = await query('SELECT * FROM courses WHERE id = $1', [Number(req.params.id)]);
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Không tìm thấy môn học.' });
    }
    const course = result.rows[0];

    // Kiểm tra quyền truy cập (admin luôn được phép)
    if (req.user.role !== 'admin') {
      const accessible = await isCourseAccessible(req.user.id, course.id);
      if (!accessible) {
        return res.status(403).json({
          message: 'Bạn chưa mở khóa môn học này. Vui lòng mở khóa để truy cập.',
          code: 'COURSE_LOCKED'
        });
      }
    }
    
    // Fetch questions for this course (randomized for study)
    const questions = await getQuestionsWithAnswers(course.id);
    
    res.json({ 
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
        questions: questions
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

