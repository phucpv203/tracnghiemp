/**
 * Course Routes - Các endpoint liên quan đến khóa học
 * 
 * Chức năng:
 * - GET /: Lấy danh sách tất cả khóa học
 * - GET /:id: Lấy thông tin chi tiết khóa học (bao gồm câu hỏi)
 * - GET /:id/study: Lấy dữ liệu cho chế độ học tập
 */
import { Router } from 'express';
import { query } from '../services/db.js';
import { getQuestionsWithAnswers } from '../services/questionsService.js';

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
 * GET /courses/:id
 * Lấy thông tin chi tiết của một khóa học, bao gồm danh sách câu hỏi
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
router.get('/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM courses WHERE id = $1', [Number(req.params.id)]);
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Không tìm thấy môn học.' });
    }
    const course = result.rows[0];
    
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
router.get('/:id/study', async (req, res) => {
  try {
    const result = await query('SELECT * FROM courses WHERE id = $1', [Number(req.params.id)]);
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Không tìm thấy môn học.' });
    }
    const course = result.rows[0];
    
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
