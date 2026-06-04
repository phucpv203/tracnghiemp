/**
 * apiService - Dịch vụ gọi API đến backend
 * 
 * Cấu hình:
 * - API_BASE: URL gốc của backend (từ biến môi trường hoặc default)
 * - Credentials: include để gửi cookies/session
 * 
 * Các phương thức:
 * - Authentication: login, register
 * - Courses: getCourses, getCourseDetail
 * - Exams: getExam, submitExam
 * - Progress: getProgress
 * - Admin: các endpoint quản trị
 */
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

/**
 * Hàm request cơ bản để gọi API
 * @param {string} path - Đường dẫn API (ví dụ: '/courses')
 * @param {object} options - Tùy chọn fetch (method, headers, body)
 * @returns {Promise<any>} Dữ liệu từ API
 * @throws {Error} Nếu request thất bại
 */
async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.message || 'API request failed');
  }

  return response.json();
}

/**
 * Đối tượng apiService chứa các phương thức gọi API
 */
export const apiService = {
  /**
   * Đăng nhập
   * @param {object} payload - {email, password}
   */
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  
  /**
   * Đăng ký
   * @param {object} payload - {email, password, name}
   */
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  
  /**
   * Lấy danh sách khóa học
   * @returns {Promise<{items: Array}>}
   */
  getCourses: () => request('/courses'),
  
  /**
   * Lấy thông tin chi tiết khóa học (bao gồm câu hỏi)
   * @param {number|string} courseId - ID khóa học
   * @returns {Promise<{course: object}>}
   */
  getCourseDetail: (courseId) => request(`/courses/${courseId}`),
  
  /**
   * Lấy tiến độ học tập của user (bao gồm points)
   * @returns {Promise<{progress: Array, points: number}>}
   */
  getProgress: () => request('/progress'),
  
  /**
   * Lấy đề thi cho một khóa học
   * @param {number|string} courseId - ID khóa học
   * @returns {Promise<{exam: object}>}
   */
  getExam: (courseId) => request(`/exams/${courseId}`),
  
  /**
   * Nộp bài thi và nhận kết quả
   * @param {number|string} courseId - ID khóa học
   * @param {Array} answers - [{questionId, answerId}, ...]
   * @param {number} userId - ID người dùng (default: 1)
   * @returns {Promise<{score, passed, correctCount, totalQuestions}>}
   */
  submitExam: (courseId, answers, userId) => request(`/exams/${courseId}/submit`, { method: 'POST', body: JSON.stringify({ answers, userId }) }),
  
  /**
   * Mở khóa môn học bằng điểm
   * @param {number} userId - ID người dùng
   * @param {number} courseId - ID khóa học
   * @returns {Promise<{success, message, pointsSpent, remainingPoints}>}
   */
  unlockCourse: (userId, courseId) => request(`/progress/${userId}/unlock/${courseId}`, { method: 'POST' }),
};

// Admin endpoints
apiService.getUsers = () => request('/admin/users');
apiService.updateUser = (id, data) => request(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
apiService.getAdminCourses = () => request('/admin/courses');
apiService.createCourse = (data) => request('/admin/courses', { method: 'POST', body: JSON.stringify(data) });
apiService.updateCourse = (id, data) => request(`/admin/courses/${id}`, { method: 'PUT', body: JSON.stringify(data) });
apiService.createQuestion = (data) => request('/admin/questions', { method: 'POST', body: JSON.stringify(data) });
apiService.updateQuestion = (id, data) => request(`/admin/questions/${id}`, { method: 'PUT', body: JSON.stringify(data) });
apiService.importQuestions = (courseId, questions) => request('/admin/questions/import', { method: 'POST', body: JSON.stringify({ courseId, questions }) });
apiService.updateUserPassword = (id, password) => request(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify({ password }) });
apiService.updateUserPoints = (id, points) => request(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify({ points }) });
apiService.updateUserScore = (userId, courseId, data) => request(`/admin/users/${userId}/progress/${courseId}`, { method: 'PUT', body: JSON.stringify(data) });
