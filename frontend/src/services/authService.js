/**
 * authService - Dịch vụ quản lý xác thực và phiên đăng nhập
 * 
 * Lưu trữ thông tin user vào localStorage để duy trì phiên đăng nhập
 * khi tải lại trang hoặc đóng/mở trình duyệt.
 * 
 * Storage key: 'quiz-app-user'
 * Data format: { id, name, email, role }
 */
const STORAGE_KEY = 'quiz-app-user';

export const authService = {
  /**
   * Lưu thông tin user vào localStorage
   * @param {object} user - Thông tin user { id, name, email, role }
   */
  saveUser: (user) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  },
  
  /**
   * Lấy thông tin user hiện tại từ localStorage
   * @returns {object|null} Thông tin user hoặc null nếu chưa đăng nhập
   */
  getCurrentUser: () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  
  /**
   * Xóa thông tin user khỏi localStorage (đăng xuất)
   */
  clearUser: () => {
    localStorage.removeItem(STORAGE_KEY);
  },
};
