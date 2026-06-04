import bcrypt from 'bcryptjs';

export const users = [
  {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    password_hash: bcrypt.hashSync('test1234', 10),
    role: 'user',
    points: 120,
  },
  {
    id: 2,
    name: 'Admin',
    email: 'admin@example.com',
    password_hash: bcrypt.hashSync('admin1234', 10),
    role: 'admin',
    points: 1000,
  },
];

export const courses = [
  { id: 1, title: 'Toán học', description: 'Ôn tập các dạng toán cơ bản.', slug: 'toan', requiredScore: 0 },
  { id: 2, title: 'Vật lý', description: 'Luyện đề vật lý trọng tâm.', slug: 'vat-ly', requiredScore: 0 },
  { id: 3, title: 'Hóa học', description: 'Môn khóa mở khi đủ điểm.', slug: 'hoa-hoc', requiredScore: 80 },
];

export const questions = [
  {
    id: 1,
    courseId: 1,
    content: {
      question: '1 + 1 = ?',
      answers: ['1', '2', '3', '4'],
      correct: 1,
      explanation: 'Kết quả là 2.',
    },
  },
];

export const userProgress = [
  { userId: 1, courseId: 1, score: 55.0, status: 'learning' },
  { userId: 1, courseId: 2, score: 91.0, status: 'completed' },
  { userId: 1, courseId: 3, score: 0.0, status: 'locked', requiredScore: 80 },
];

export const prerequisites = [
  { courseId: 3, prerequisiteCourseId: 2, minScore: 80 },
];

export function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}
