import { query } from './db.js';

export async function getQuestionsByCourseid(courseId) {
  const result = await query(
    `SELECT 
       q.id, q.course_id, q.content, q.difficulty, q.created_at, q.updated_at
     FROM questions q
     WHERE q.course_id = $1
     ORDER BY q.id`,
    [Number(courseId)]
  );
  return result.rows;
}

export async function getQuestionWithAnswers(questionId) {
  const qResult = await query(
    'SELECT id, course_id, content, difficulty, created_at, updated_at FROM questions WHERE id = $1',
    [Number(questionId)]
  );
  
  if (!qResult.rows.length) return null;
  
  const question = qResult.rows[0];
  
  const aResult = await query(
    'SELECT id, question_id, answer_text, is_correct, created_at, updated_at FROM answers WHERE question_id = $1 ORDER BY id',
    [Number(questionId)]
  );
  
  question.answers = aResult.rows;
  return question;
}

export async function getQuestionsWithAnswers(courseId) {
  const questions = await getQuestionsByCourseid(courseId);
  
  const questionsWithAnswers = [];
  for (const q of questions) {
    const aResult = await query(
      'SELECT id, question_id, answer_text, is_correct FROM answers WHERE question_id = $1 ORDER BY id',
      [Number(q.id)]
    );
    questionsWithAnswers.push({
      ...q,
      answers: aResult.rows
    });
  }
  
  return questionsWithAnswers;
}
