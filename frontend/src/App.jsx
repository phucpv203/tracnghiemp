/**
 * App.jsx - Component chính của ứng dụng
 * 
 * Quản lý:
 * - Authentication state (user đăng nhập)
 * - Routing đến các trang
 * - Protected routes (cần đăng nhập)
 * - Admin routes (cần role admin)
 * 
 * Luồng hoạt động:
 * 1. Khi app load, kiểm tra localStorage xem có user không
 * 2. Nếu có, set vào state và cho phép truy cập các trang protected
 * 3. Nếu không, redirect về /login
 * 4. Khi login thành công, lưu user vào localStorage và redirect
 * 5. Khi logout, xóa user khỏi localStorage và redirect về /login
 */
import { useState, useEffect, createContext } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import StudyPage from './pages/StudyPage';
import ExamPage from './pages/ExamPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminCourses from './pages/AdminCourses';
import ProtectedRoute from './components/ProtectedRoute';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import { authService } from './services/authService';

/**
 * AuthContext - Context để chia sẻ thông tin user và các hàm auth
 * cho toàn bộ ứng dụng
 */
export const AuthContext = createContext(null);

function App() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  /**
   * Khi app mount, kiểm tra xem có user trong localStorage không
   * (duy trì phiên đăng nhập)
   */
  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  /**
   * Xử lý khi user đăng nhập thành công
   * - Lưu user vào localStorage
   * - Set state
   * - Redirect dựa trên role
   */
  const onLogin = (userData) => {
    authService.saveUser(userData);
    setUser(userData);
    navigate(userData.role === 'admin' ? '/admin' : '/dashboard');
  };

  /**
   * Xử lý khi user đăng xuất
   * - Xóa user khỏi localStorage
   * - Clear state
   * - Redirect về /login
   */
  const onLogout = () => {
    authService.clearUser();
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, onLogin, onLogout }}>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminProtectedRoute>
                <AdminDashboard />
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AdminProtectedRoute>
                <AdminUsers />
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/courses"
            element={
              <AdminProtectedRoute>
                <AdminCourses />
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/study/:courseId"
            element={
              <ProtectedRoute>
                <StudyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exam/:courseId"
            element={
              <ProtectedRoute>
                <ExamPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
        </Routes>
      </div>
    </AuthContext.Provider>
  );
}

export default App;
