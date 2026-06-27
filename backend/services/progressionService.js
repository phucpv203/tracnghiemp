import { query } from './db.js';

export async function getProgress(userId) {
  const result = await query(
    `SELECT up.*, c.title AS course_title, c.required_points AS required_score
     FROM user_progress up
     JOIN courses c ON c.id = up.course_id
     WHERE up.user_id = $1
     ORDER BY up.course_id`,
    [Number(userId)]
  );
  return result.rows.map((row) => ({
    userId: row.user_id,
    courseId: row.course_id,
    score: row.score,
    status: row.status,
    lastExamId: row.last_exam_id,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    courseTitle: row.course_title,
    requiredScore: row.required_score,
  }));
}

export async function getPrerequisites(courseId) {
  const result = await query(
    `SELECT prerequisite_course_id AS prerequisiteCourseId, min_score AS minScore
     FROM course_prerequisites
     WHERE course_id = $1`,
    [Number(courseId)]
  );
  return result.rows;
}

/**
 * isCourseAccessible - Kiểm tra user có quyền truy cập môn học không
 * 
 * Môn học được coi là "có thể truy cập" nếu:
 * 1. required_points = 0 (miễn phí) → luôn cho phép
 * 2. User đã mở khóa (có user_progress với status != 'locked')
 * 3. User là admin
 */
export async function isCourseAccessible(userId, courseId) {
  const courseRes = await query('SELECT required_points FROM courses WHERE id = $1', [Number(courseId)]);
  if (!courseRes.rows.length) return false;

  const requiredPoints = Number(courseRes.rows[0].required_points);

  // Miễn phí → luôn cho phép
  if (requiredPoints === 0) return true;

  // Kiểm tra user đã mở khóa chưa
  const progressRes = await query(
    'SELECT status FROM user_progress WHERE user_id = $1 AND course_id = $2',
    [Number(userId), Number(courseId)]
  );

  if (progressRes.rows.length && progressRes.rows[0].status !== 'locked') return true;

  return false;
}

export async function canUnlockCourse(userId, courseId) {
  const prereqs = await getPrerequisites(courseId);
  if (!prereqs.length) return true;

  const result = await query(
    `SELECT course_id, score
     FROM user_progress
     WHERE user_id = $1 AND course_id = ANY($2::bigint[])`,
    [Number(userId), prereqs.map((item) => Number(item.prerequisiteCourseId))]
  );

  const scoreMap = new Map(result.rows.map((row) => [Number(row.course_id), Number(row.score)]));
  return prereqs.every((req) => scoreMap.get(Number(req.prerequisiteCourseId)) >= Number(req.minScore));
}
