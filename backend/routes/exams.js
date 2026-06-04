/**
 * Exam Routes - Các endpoint liên quan đến bài thi
 * 
 * Chức năng:
 * - GET /:courseId: Lấy đề thi cho một khóa học
 * - POST /:courseId/submit: Nộp bài và lưu kết quả
 */
import { Router } from 'express';
import { query } from '../services/db.js';
import { getQuestionsWithAnswers } from '../services/questionsService.js';

const router = Router();

/**
 * GET /exams/:courseId
 * Lấy thông tin đề thi cho một khóa học cụ thể
 * 
 * Response:
 * {
 *   exam: {
 *     courseId: number,
 *     title: string,
 *     questions: number (số lượng câu),
 *     passScore: number (điểm đạt),
 *     data: Array (danh sách câu hỏi với đáp án)
 *   }
 * }
 */
router.get('/:courseId', async (req, res) => {
  try {
    const courseRes = await query('SELECT * FROM courses WHERE id = $1', [Number(req.params.courseId)]);
    if (!courseRes.rows.length) {
      return res.status(404).json({ message: 'Không tìm thấy môn học.' });
    }
    
    const course = courseRes.rows[0];
    const questions = await getQuestionsWithAnswers(course.id);
    
    // Randomly select up to 80 questions
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    const selectedQuestions = shuffled.slice(0, 80);
    
    const exam = {
      courseId: course.id,
      title: `Thi thử ${course.title}`,
      questions: selectedQuestions.length,
      passScore: 80,
      data: selectedQuestions
    };
    
    res.json({ exam });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /exams/:courseId/submit
 * Nộp bài thi và lưu kết quả vào database
 * 
 * Request body:
 * {
 *   answers: Array<{questionId: number, answerId: number}>,
 *   userId: number (optional, default = 1)
 * }
 * 
 * Response:
 * {
 *   courseId: number,
 *   score: number (0-100),
 *   passed: boolean,
 *   passScore: number,
 *   correctCount: number,
 *   totalQuestions: number
 * }
 * 
 * Database operations:
 * - Lưu hoặc cập nhật kết quả vào bảng user_progress
 * - Cập nhật status thành 'completed' nếu đạt, 'learning' nếu không đạt
 */
router.post('/:courseId/submit', async (req, res) => {
  try {
    // Lấy danh sách đáp án từ client và userId (mặc định là 1 nếu không có)
    const { answers } = req.body;
    const userId = req.body.userId || 1;
    
    // Calculate score based on correct answers
    if (!Array.isArray(answers)) {
      return res.status(400).json({ message: 'answers phải là một mảng' });
    }
    
    const courseRes = await query('SELECT * FROM courses WHERE id = $1', [Number(req.params.courseId)]);
    if (!courseRes.rows.length) {
      return res.status(404).json({ message: 'Không tìm thấy môn học.' });
    }
    
    // Only check answers against the questions that were sent from frontend
    let correctCount = 0;
    
    for (const answer of answers) {
      // We use the answers array directly - the frontend sent the 80 selected questions
      const correctAns = answer.answerId;
      // Need to look up the correct answer from the question's answers
      const questionRes = await query(
        'SELECT id FROM questions WHERE id = $1 AND course_id = $2',
        [Number(answer.questionId), Number(req.params.courseId)]
      );
      if (questionRes.rows.length) {
        const ansRes = await query(
          'SELECT id FROM answers WHERE question_id = $1 AND is_correct = true',
          [Number(answer.questionId)]
        );
        if (ansRes.rows.length && Number(ansRes.rows[0].id) === Number(answer.answerId)) {
          correctCount++;
        }
      }
    }
    
    const totalQuestions = answers.length;
    const score = Math.round((correctCount / totalQuestions) * 100);
    const passScore = 80;
    const passed = score >= passScore;
    
    // Save or update user progress in database
    const existingProgress = await query(
      'SELECT * FROM user_progress WHERE user_id = $1 AND course_id = $2',
      [Number(userId), Number(req.params.courseId)]
    );
    
    const status = passed ? 'completed' : 'learning';
    
    if (existingProgress.rows.length > 0) {
      // Update existing progress
      if (passed) {
        await query(
          `UPDATE user_progress 
           SET score = $1, status = $2, completed_at = NOW(), updated_at = NOW()
           WHERE user_id = $3 AND course_id = $4`,
          [score, status, Number(userId), Number(req.params.courseId)]
        );
      } else {
        await query(
          `UPDATE user_progress 
           SET score = $1, status = $2, updated_at = NOW()
           WHERE user_id = $3 AND course_id = $4`,
          [score, status, Number(userId), Number(req.params.courseId)]
        );
      }
    } else {
      // Insert new progress
      await query(
        `INSERT INTO user_progress (user_id, course_id, score, status, started_at, completed_at)
         VALUES ($1, $2, $3, $4, NOW(), $5)`,
        [Number(userId), Number(req.params.courseId), score, status, passed ? new Date() : null]
      );
    }
    
    res.json({
      courseId: req.params.courseId,
      score,
      passed,
      passScore,
      correctCount,
      totalQuestions
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
