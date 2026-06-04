const exams = [
  { courseId: 1, title: 'Thi thử Toán', questions: 10, passScore: 80 },
  { courseId: 2, title: 'Thi thử Vật lý', questions: 12, passScore: 80 },
  { courseId: 3, title: 'Thi thử Hóa học', questions: 8, passScore: 80 }
];

export function getExam(courseId) {
  return exams.find((item) => item.courseId === Number(courseId));
}

export function submitExam(courseId) {
  const exam = getExam(courseId);
  if (!exam) return null;
  const score = Math.floor(Math.random() * 100) + 1;
  return { courseId: exam.courseId, score, passed: score >= exam.passScore, passScore: exam.passScore };
}
