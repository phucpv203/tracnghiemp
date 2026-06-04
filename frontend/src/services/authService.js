/**
 * authService - Quản lý phiên đăng nhập (user + token)
 *
 * Lưu trong localStorage:
 * - 'quiz-app-user' : thông tin user { id, name, email, role }
 * - 'quiz-app-token': JWT token
 *
 * Khi app load: verify token bằng cách gọi /auth/me.
 * Nếu token sai/hết hạn/version không khớp → auto logout.
 */
const USER_KEY = 'quiz-app-user';
const TOKEN_KEY = 'quiz-app-token';

export const authService = {
  /** Lưu thông tin user */
  saveUser: (user) => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  },

  /** Lưu token */
  saveToken: (token) => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  },

  /** Lấy user từ localStorage (sync) */
  getCurrentUser: () => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  /** Lấy token từ localStorage (sync) */
  getToken: () => localStorage.getItem(TOKEN_KEY),

  /** Xóa sạch (logout local) */
  clearUser: () => {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
  },
};
