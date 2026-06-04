import fs from 'fs/promises';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const TABLE_NAME = process.env.SUPABASE_TABLE || 'questions';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Thiếu biến môi trường SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY hoặc SUPABASE_KEY');
  process.exit(1);
}

const [filePath, courseIdArg] = process.argv.slice(2);
if (!filePath || !courseIdArg) {
  console.error('Sử dụng: node importQuestionsToSupabase.js <path-to-json-file> <course_id>');
  process.exit(1);
}

const courseId = Number(courseIdArg);
if (Number.isNaN(courseId)) {
  console.error('course_id phải là một số hợp lệ');
  process.exit(1);
}

async function loadQuestions() {
  const content = await fs.readFile(filePath, 'utf-8');
  const parsed = JSON.parse(content);
  return Array.isArray(parsed) ? parsed : [parsed];
}

async function importQuestions() {
  const questions = await loadQuestions();

  // check if course exists
  const courseRes = await fetch(`${SUPABASE_URL}/rest/v1/courses?id=eq.${courseId}`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  const courseFound = (await courseRes.json()).length > 0;

  const imported = [];
  for (const item of questions) {
    if (!item.question || !Array.isArray(item.answers) || item.correct === undefined) continue;

    const content = item.explanation ? `${item.question}\n\n${item.explanation}` : item.question;
    const difficulty = item.difficulty ?? 1;

    // insert question
    const qRes = await fetch(`${SUPABASE_URL}/rest/v1/questions`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify([{ course_id: courseFound ? courseId : null, content, difficulty }]),
    });
    if (!qRes.ok) {
      const err = await qRes.text();
      throw new Error(`Không thể tạo question: ${qRes.status} ${err}`);
    }
    const qCreated = await qRes.json();
    const qRow = qCreated[0];

    // insert answers
    const answersPayload = item.answers.map((text, idx) => ({ question_id: qRow.id, answer_text: text, is_correct: Number(idx) === Number(item.correct) }));
    const aRes = await fetch(`${SUPABASE_URL}/rest/v1/answers`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(answersPayload),
    });
    if (!aRes.ok) {
      const err = await aRes.text();
      throw new Error(`Không thể tạo answers: ${aRes.status} ${err}`);
    }
    const aCreated = await aRes.json();

    imported.push({ question: qRow, answers: aCreated });
  }

  console.log(`Đã import ${imported.length} câu hỏi (và câu trả lời) vào Supabase.`);
  console.log(JSON.stringify(imported, null, 2));
}

importQuestions().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
