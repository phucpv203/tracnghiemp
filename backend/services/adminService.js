import bcrypt from 'bcryptjs';
import { query } from './db.js';

function slugify(text) {
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/\-+/g, '-');
}

export async function searchUsers(searchTerm) {
  const term = `%${searchTerm}%`;
  const result = await query(
    `SELECT
       u.id,
       u.name,
       u.email,
       u.role,
       u.points,
       COALESCE(
         json_agg(
           json_build_object(
             'userId', up.user_id,
             'courseId', up.course_id,
             'score', up.score,
             'status', up.status,
             'lastExamId', up.last_exam_id,
             'startedAt', up.started_at,
             'completedAt', up.completed_at,
             'courseTitle', c.title,
             'requiredScore', c.required_points
           ) ORDER BY up.course_id
         ) FILTER (WHERE up.id IS NOT NULL), '[]'
       ) AS progress
     FROM users u
     LEFT JOIN user_progress up ON up.user_id = u.id
     LEFT JOIN courses c ON c.id = up.course_id
     WHERE u.name ILIKE $1 OR u.email ILIKE $1
      GROUP BY u.id
      ORDER BY u.id`,
    [term]
  );
  return result.rows.map((row) => ({
    ...row,
    progress: row.progress || [],
  }));
}

export async function listUsers() {
  const result = await query(
    `SELECT
       u.id,
       u.name,
       u.email,
       u.role,
       u.points,
       COALESCE(
         json_agg(
           json_build_object(
             'userId', up.user_id,
             'courseId', up.course_id,
             'score', up.score,
             'status', up.status,
             'lastExamId', up.last_exam_id,
             'startedAt', up.started_at,
             'completedAt', up.completed_at,
             'courseTitle', c.title,
             'requiredScore', c.required_points
           ) ORDER BY up.course_id
         ) FILTER (WHERE up.id IS NOT NULL), '[]'
       ) AS progress
     FROM users u
     LEFT JOIN user_progress up ON up.user_id = u.id
     LEFT JOIN courses c ON c.id = up.course_id
     GROUP BY u.id
     ORDER BY u.id`
  );
  return result.rows.map((row) => ({
    ...row,
    progress: row.progress || [],
  }));
}

export async function updateUser(id, data) {
  const existing = await query('SELECT id FROM users WHERE id = $1', [Number(id)]);
  if (!existing.rows.length) return null;

  const updates = [];
  const values = [Number(id)];
  let index = 2;

  if (data.name !== undefined) {
    updates.push(`name = $${index++}`);
    values.push(data.name);
  }
  if (data.role !== undefined) {
    updates.push(`role = $${index++}`);
    values.push(data.role);
  }
  if (data.points !== undefined) {
    updates.push(`points = $${index++}`);
    values.push(Number(data.points));
  }
  if (data.password) {
    const password_hash = await bcrypt.hash(data.password, 10);
    updates.push(`password_hash = $${index++}`);
    values.push(password_hash);
  }

  if (!updates.length) {
    const result = await query('SELECT id, name, email, role, points FROM users WHERE id = $1', [Number(id)]);
    return result.rows[0];
  }

  const result = await query(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $1 RETURNING id, name, email, role, points`,
    values
  );
  return result.rows[0];
}

export async function searchCourses(searchTerm) {
  const term = `%${searchTerm}%`;
  const result = await query(
    'SELECT * FROM courses WHERE title ILIKE $1 ORDER BY id',
    [term]
  );
  return result.rows;
}

export async function listCourses() {
  const result = await query('SELECT * FROM courses ORDER BY id');
  return result.rows;
}

export async function createCourse(data) {
  const slug = data.slug || slugify(data.title);
  const required_points = Number(data.requiredScore || 0);
  const description = data.description || '';
  const question_type = data.questionType === 'fill' ? 'fill' : 'choice';
  const result = await query(
    'INSERT INTO courses(title, slug, description, required_points, question_type) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [data.title, slug, description, required_points, question_type]
  );
  return result.rows[0];
}

export async function updateCourse(id, data) {
  const updates = [];
  const values = [Number(id)];
  let index = 2;

  if (data.title !== undefined) {
    updates.push(`title = $${index++}`);
    values.push(data.title);
  }
  if (data.description !== undefined) {
    updates.push(`description = $${index++}`);
    values.push(data.description);
  }
  if (data.requiredScore !== undefined) {
    updates.push(`required_points = $${index++}`);
    values.push(Number(data.requiredScore));
  }
  if (data.questionType !== undefined) {
    updates.push(`question_type = $${index++}`);
    values.push(data.questionType === 'fill' ? 'fill' : 'choice');
  }

  if (!updates.length) return null;

  const result = await query(
    `UPDATE courses SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
    values
  );
  return result.rows[0];
}

export async function deleteAllQuestionsByCourse(courseId) {
  const courseIdNum = Number(courseId);
  
  // Kiểm tra course tồn tại
  const existing = await query('SELECT id, title FROM courses WHERE id = $1', [courseIdNum]);
  if (!existing.rows.length) return null;

  // Xoá answers → questions
  await query('DELETE FROM answers WHERE question_id IN (SELECT id FROM questions WHERE course_id = $1)', [courseIdNum]);
  await query('DELETE FROM questions WHERE course_id = $1', [courseIdNum]);

  return { courseId: courseIdNum, deleted: true };
}

export async function deleteCourse(id) {
  const courseId = Number(id);

  // Kiểm tra course tồn tại
  const existing = await query('SELECT id, title FROM courses WHERE id = $1', [courseId]);
  if (!existing.rows.length) return null;

  // Xoá các bản ghi liên quan (answers → questions → exams → user_progress → course)
  await query('DELETE FROM answers WHERE question_id IN (SELECT id FROM questions WHERE course_id = $1)', [courseId]);
  await query('DELETE FROM questions WHERE course_id = $1', [courseId]);
  await query('DELETE FROM exams WHERE course_id = $1', [courseId]);
  await query('DELETE FROM user_progress WHERE course_id = $1', [courseId]);
  await query('DELETE FROM course_prerequisites WHERE course_id = $1 OR prerequisite_course_id = $1', [courseId]);
  await query('DELETE FROM courses WHERE id = $1', [courseId]);

  return { id: courseId, deleted: true };
}

function normalizeContent(value, explanation) {
  if (typeof value === 'string') {
    let output = value;
    if (explanation) {
      output += `\n\n${explanation}`;
    }
    return output;
  }

  if (value && typeof value === 'object') {
    const questionText = value.question || '';
    const explanationText = value.explanation || explanation || '';
    return explanationText ? `${questionText}\n\n${explanationText}` : questionText;
  }

  return explanation ? explanation : '';
}

export async function addQuestion(data) {
  const content = normalizeContent(data.content ?? data.question, data.explanation);
  const difficulty = data.difficulty !== undefined ? Number(data.difficulty) : 1;
  const courseId = data.courseId !== undefined ? Number(data.courseId) : null;

  const result = await query(
    'INSERT INTO questions(course_id, content, difficulty) VALUES ($1, $2, $3) RETURNING *',
    [courseId, content, difficulty]
  );
  const question = result.rows[0];

  if (Array.isArray(data.answers)) {
    const answersInserted = [];
    for (let i = 0; i < data.answers.length; i++) {
      const text = data.answers[i];
      const is_correct = i === Number(data.correct);
      const aRes = await query(
        'INSERT INTO answers(question_id, answer_text, is_correct) VALUES ($1, $2, $3) RETURNING *',
        [Number(question.id), text, is_correct]
      );
      answersInserted.push(aRes.rows[0]);
    }
    question.answers = answersInserted;
  }

  return question;
}

export async function deleteQuestion(id) {
  const questionId = Number(id);
  const existing = await query('SELECT id FROM questions WHERE id = $1', [questionId]);
  if (!existing.rows.length) return null;
  await query('DELETE FROM answers WHERE question_id = $1', [questionId]);
  await query('DELETE FROM questions WHERE id = $1', [questionId]);
  return { id: questionId, deleted: true };
}

export async function updateQuestion(id, data) {
  const updates = [];
  const values = [Number(id)];
  let index = 2;

  if (data.courseId !== undefined) {
    updates.push(`course_id = $${index++}`);
    values.push(Number(data.courseId));
  }
  if (data.content !== undefined) {
    updates.push(`content = $${index++}`);
    values.push(normalizeContent(data.content, data.explanation));
  }
  if (data.difficulty !== undefined) {
    updates.push(`difficulty = $${index++}`);
    values.push(Number(data.difficulty));
  }

  if (!updates.length && !Array.isArray(data.answers)) return null;

  let question = null;
  if (updates.length) {
    const result = await query(
      `UPDATE questions SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
      values
    );
    question = result.rows[0];
  } else {
    const result = await query('SELECT * FROM questions WHERE id = $1', [Number(id)]);
    if (!result.rows.length) return null;
    question = result.rows[0];
  }

  // Nếu có cung cấp answers, xoá answers cũ và insert lại
  if (Array.isArray(data.answers)) {
    // Xoá answers cũ
    await query('DELETE FROM answers WHERE question_id = $1', [Number(id)]);

    // Insert answers mới
    const answersInserted = [];
    for (let i = 0; i < data.answers.length; i++) {
      const text = data.answers[i];
      const is_correct = i === Number(data.correct);
      const aRes = await query(
        'INSERT INTO answers(question_id, answer_text, is_correct) VALUES ($1, $2, $3) RETURNING *',
        [Number(id), text, is_correct]
      );
      answersInserted.push(aRes.rows[0]);
    }
    question.answers = answersInserted;
  }

  return question;
}

export async function importQuestions(courseId, items) {
  const imported = [];

  const courseRes = await query('SELECT id FROM courses WHERE id = $1', [Number(courseId)]);
  if (!courseRes.rows.length) {
    throw new Error(`Course with id ${courseId} not found`);
  }

  for (const item of items) {
    if (!item.question || !Array.isArray(item.answers) || item.correct === undefined) continue;

    const content = normalizeContent(item.content ?? item.question, item.explanation);
    const difficulty = Number(item.difficulty ?? 1);

    const qRes = await query(
      'INSERT INTO questions(course_id, content, difficulty) VALUES ($1, $2, $3) RETURNING *',
      [Number(courseId), content, difficulty]
    );

    const q = qRes.rows[0];

    const answersInserted = [];
    for (let i = 0; i < item.answers.length; i++) {
      const text = item.answers[i];
      const is_correct = i === Number(item.correct);
      const aRes = await query(
        'INSERT INTO answers(question_id, answer_text, is_correct) VALUES ($1, $2, $3) RETURNING *',
        [Number(q.id), text, is_correct]
      );
      answersInserted.push(aRes.rows[0]);
    }

    imported.push({ question: q, answers: answersInserted });
  }

  return imported;
}

export async function deleteUser(id) {
  const userId = Number(id);

  // Kiểm tra user tồn tại
  const existing = await query('SELECT id, name, email FROM users WHERE id = $1', [userId]);
  if (!existing.rows.length) return null;

  // Xoá các bản ghi liên quan trước khi xoá user
  await query('DELETE FROM user_devices WHERE user_id = $1', [userId]);
  await query('DELETE FROM payment_history WHERE user_id = $1', [userId]);
  await query('DELETE FROM user_progress WHERE user_id = $1', [userId]);
  await query('DELETE FROM users WHERE id = $1', [userId]);

  return { id: userId, deleted: true };
}

export async function getUserDevices(userId) {
  const result = await query(
    'SELECT id, device_id, device_name, created_at, updated_at FROM user_devices WHERE user_id = $1 ORDER BY created_at DESC',
    [Number(userId)]
  );
  return result.rows;
}

export async function deleteUserDevice(userId, deviceId) {
  const existing = await query('SELECT id FROM user_devices WHERE id = $1 AND user_id = $2', [Number(deviceId), Number(userId)]);
  if (!existing.rows.length) return null;
  await query('DELETE FROM user_devices WHERE id = $1 AND user_id = $2', [Number(deviceId), Number(userId)]);
  return { id: Number(deviceId), deleted: true };
}

export async function updateUserProgress(userId, courseId, data) {
  const values = [Number(userId), Number(courseId), Number(data.score ?? 0), data.status || 'learning', data.lastExamId ?? null];
  const result = await query(
    `INSERT INTO user_progress(user_id, course_id, score, status, last_exam_id)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, course_id)
     DO UPDATE SET score = EXCLUDED.score, status = EXCLUDED.status, last_exam_id = EXCLUDED.last_exam_id, updated_at = now()
     RETURNING *`,
    values
  );
  return result.rows[0];
}
