/**
 * apiService - Dịch vụ gọi API đến backend
 *
 * Tự động gắn Authorization: Bearer <token> từ localStorage.
 * Tự động gắn X-Device-Id header từ deviceService.
 * Khi backend trả 401 (token sai/hết hạn/phiên bị thay thế) → thông báo auth.
 */
import { authService } from './authService';
import { deviceService } from './deviceService';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Callback khi nhận 401 — App.jsx sẽ đăng ký để xử lý logout
let onUnauthorized = null;
export function setOnUnauthorized(cb) {
  onUnauthorized = cb;
}

async function request(path, options = {}) {
  const token = authService.getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Gắn Device_ID vào header của mọi request
  try {
    headers['X-Device-Id'] = deviceService.getDeviceId();
  } catch (_) {
    // browser-only, ignore
  }

  const method = options.method || 'GET';
  console.log(`[api] ${method} ${path}`, { hasToken: !!token });

  const response = await fetch(`${API_BASE}${path}`, {
    headers,
    credentials: 'include',
    ...options,
  });

  console.log(`[api] ${method} ${path} → ${response.status}`);

  // 401 = token hết hạn / sai / phiên bị thay thế (login ở nơi khác)
  if (response.status === 401) {
    let body = null;
    try {
      body = await response.json();
    } catch (_) {
      // ignore
    }
    console.warn('[api] 401:', body?.message);
    if (onUnauthorized) {
      onUnauthorized(body?.message || 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
    }
    throw new Error(body?.message || 'Phiên đăng nhập hết hạn.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    console.error(`[api] ${method} ${path} error:`, errorData);
    throw new Error(errorData?.message || `API ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

export const apiService = {
  // ===== Auth =====
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),
  replaceDevice: (payload) => request('/auth/replace-device', { method: 'POST', body: JSON.stringify(payload) }),

  // ===== Courses =====
  getCourses: () => request('/courses'),
  getCourseDetail: (courseId) => request(`/courses/${courseId}`),
  getCoursePreview: (courseId) => request(`/courses/${courseId}/preview`),

  // ===== Progress =====
  getProgress: () => request('/progress'),
  getProgressByUser: (userId) => request(`/progress/${userId}`),
  checkUnlock: (userId, courseId) => request(`/progress/${userId}/check-unlock/${courseId}`),
  unlockCourse: (userId, courseId) => request(`/progress/${userId}/unlock/${courseId}`, { method: 'POST' }),

  // ===== Top-up =====
  topUp: (points) => request('/progress/topup', { method: 'POST', body: JSON.stringify({ points }) }),

  // ===== PayOS =====
  createPayment: (points) => request('/payos/create-payment', { method: 'POST', body: JSON.stringify({ points }) }),
  checkPayment: (orderCode) => request(`/payos/check-payment/${orderCode}`),

  // ===== Exams =====
  getExam: (courseId) => request(`/exams/${courseId}`),
  submitExam: (courseId, answers) =>
    request(`/exams/${courseId}/submit`, { method: 'POST', body: JSON.stringify({ answers }) }),

  // ===== Favorites =====
  getFavorites: () => request('/favorites'),
  toggleFavorite: (courseId) => request('/favorites/toggle', { method: 'POST', body: JSON.stringify({ courseId }) }),

  // ===== Admin =====
  getUsers: (searchTerm) => {
    const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : '';
    return request(`/admin/users${query}`);
  },
  updateUser: (id, data) => request(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getAdminCourses: (searchTerm) => {
    const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : '';
    return request(`/admin/courses${query}`);
  },
  createCourse: (data) => request('/admin/courses', { method: 'POST', body: JSON.stringify(data) }),
  updateCourse: (id, data) => request(`/admin/courses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCourse: (id) => request(`/admin/courses/${id}`, { method: 'DELETE' }),
  createQuestion: (data) => request('/admin/questions', { method: 'POST', body: JSON.stringify(data) }),
  updateQuestion: (id, data) => request(`/admin/questions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  importQuestions: (courseId, questions) =>
    request('/admin/questions/import', { method: 'POST', body: JSON.stringify({ courseId, questions }) }),
  deleteAllQuestions: (courseId) => request(`/admin/courses/${courseId}/questions`, { method: 'DELETE' }),
  updateUserPassword: (id, password) =>
    request(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify({ password }) }),
  updateUserPoints: (id, points) =>
    request(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify({ points }) }),
  deleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
  getUserDevices: (userId) => request(`/admin/users/${userId}/devices`),
  deleteUserDevice: (userId, deviceId) => request(`/admin/users/${userId}/devices/${deviceId}`, { method: 'DELETE' }),
  updateUserScore: (userId, courseId, data) =>
    request(`/admin/users/${userId}/progress/${courseId}`, { method: 'PUT', body: JSON.stringify(data) }),
};