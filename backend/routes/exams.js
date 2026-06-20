/**
 * Exam Routes - Các endpoint liên quan đến bài thi
 */
import { Router } from 'express';
import { query } from '../services/db.js';
import { getQuestionsWithAnswers } from '../services/questionsService.js';
import { requireAuth } from '../middleware/auth.js';

// Helper: so sánh đáp án kiểu fill (không phân biệt hoa-thường, trim whitespace)
function normalizeText(s) {
  return String(s).trim().toLowerCase().replace(/\s+/g, ' ');
}

const router = Router();

router.use(requireAuth);

/**
 * GET /exams/:courseId
 */
router.get('/:courseId', async (req, res) => {
  try {
    const courseRes = await query('SELECT * FROM courses WHERE id = $1', [Number(req.params.courseId)]);
    if (!courseRes.rows.length) {
      return res.status(404).json({ message: 'Không tìm thấy môn học.' });
    }

    const course = courseRes.rows[0];
    const questions = await getQuestionsWithAnswers(course.id);

    // Fisher-Yates shuffle để xáo trộn ngẫu nhiên đều, tránh thiên vị
    const shuffled = [...questions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const selectedQuestions = shuffled.slice(0, course.question_type === 'fill' ? 20 : 80);

    const exam = {
      courseId: course.id,
      title: `Thi thử ${course.title}`,
      questions: selectedQuestions.length,
      passScore: 80,
      data: selectedQuestions,
    };

    res.json({ exam });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /exams/:courseId/submit
 * Nộp bài thi và lưu kết quả
 *
 * userId lấy từ token (req.user.id) thay vì hardcode = 1
 */
router.post('/:courseId/submit', async (req, res) => {
  try {
    const { answers } = req.body;
    const userId = req.user.id; // từ token, không cần client gửi

    if (!Array.isArray(answers)) {
      return res.status(400).json({ message: 'answers phải là một mảng' });
    }

    const courseRes = await query('SELECT * FROM courses WHERE id = $1', [Number(req.params.courseId)]);
    if (!courseRes.rows.length) {
      return res.status(404).json({ message: 'Không tìm thấy môn học.' });
    }

    let correctCount = 0;

    // Xác định loại đề dựa vào course
    const isFillType = courseRes.rows[0].question_type === 'fill';

    for (const answer of answers) {
      const questionRes = await query(
        'SELECT id FROM questions WHERE id = $1 AND course_id = $2',
        [Number(answer.questionId), Number(req.params.courseId)]
      );
      if (questionRes.rows.length) {
        if (isFillType) {
          // Kiểu điền đáp án: so sánh text (answer.answer[0].answer_text)
          const ansRes = await query(
            'SELECT answer_text FROM answers WHERE question_id = $1 AND is_correct = true ORDER BY id LIMIT 1',
            [Number(answer.questionId)]
          );
          if (ansRes.rows.length) {
            const correctText = ansRes.rows[0].answer_text;
            if (normalizeText(answer.text) === normalizeText(correctText)) {
              correctCount++;
            }
          }
        } else {
          const ansRes = await query(
            'SELECT id FROM answers WHERE question_id = $1 AND is_correct = true',
            [Number(answer.questionId)]
          );
          if (ansRes.rows.length && Number(ansRes.rows[0].id) === Number(answer.answerId)) {
            correctCount++;
          }
        }
      }
    }

    const totalQuestions = answers.length;
    const score = Math.round((correctCount / totalQuestions) * 100);
    const passScore = 80;
    const passed = score >= passScore;

    const existingProgress = await query(
      'SELECT * FROM user_progress WHERE user_id = $1 AND course_id = $2',
      [userId, Number(req.params.courseId)]
    );

    const status = passed ? 'completed' : 'learning';

    if (existingProgress.rows.length > 0) {
      if (passed) {
        await query(
          `UPDATE user_progress
           SET score = $1, status = $2, completed_at = NOW(), updated_at = NOW()
           WHERE user_id = $3 AND course_id = $4`,
          [score, status, userId, Number(req.params.courseId)]
        );
      } else {
        await query(
          `UPDATE user_progress
           SET score = $1, status = $2, updated_at = NOW()
           WHERE user_id = $3 AND course_id = $4`,
          [score, status, userId, Number(req.params.courseId)]
        );
      }
    } else {
      await query(
        `INSERT INTO user_progress (user_id, course_id, score, status, started_at, completed_at)
         VALUES ($1, $2, $3, $4, NOW(), $5)`,
        [userId, Number(req.params.courseId), score, status, passed ? new Date() : null]
      );
    }

    // Cộng điểm cho user khi pass (thưởng)
    if (passed) {
      await query(
        'UPDATE users SET points = points + $1, updated_at = NOW() WHERE id = $2',
        [Math.round(score / 10), userId]
      );
    }

    res.json({
      courseId: req.params.courseId,
      score,
      passed,
      passScore,
      correctCount,
      totalQuestions,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
