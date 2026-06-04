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
