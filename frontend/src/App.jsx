/**
 * App.jsx - Component chính của ứng dụng
 *
 * Tính năng:
 * 1. Lưu đăng nhập: khi load, verify token với backend qua /auth/me.
 *    Nếu token hợp lệ → set user, không cần login lại.
 *    Nếu token sai/hết hạn/phiên bị thay thế → auto logout.
 * 2. 1 tài khoản 1 thiết bị: polling /auth/me mỗi 30 giây.
 *    Nếu backend trả 401 với code=SESSION_REPLACED → user bị đá ra.
 */
import { useState, useEffect, createContext, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import StudyPage from './pages/StudyPage';
import TopUpPage from './pages/TopUpPage';
import ExamPage from './pages/ExamPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminCourses from './pages/AdminCourses';
import ProtectedRoute from './components/ProtectedRoute';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import { authService } from './services/authService';
import { apiService, setOnUnauthorized } from './services/apiService';

export const AuthContext = createContext(null);

const POLL_INTERVAL_MS = 30 * 1000; // 30 giây

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const pollRef = useRef(null);

  // Verify token khi app mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = authService.getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { user: fresh } = await apiService.me();
        if (!cancelled) {
          authService.saveUser(fresh);
          setUser(fresh);
        }
      } catch (e) {
        if (!cancelled) {
          // /auth/me trả 401 → token hết hạn/sai/bị thay thế
          authService.clearUser();
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Polling để phát hiện phiên bị thay thế từ thiết bị khác
  useEffect(() => {
    if (!user) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }
    pollRef.current = setInterval(async () => {
      try {
        await apiService.me(); // nếu 401 sẽ trigger onUnauthorized
      } catch (_) {
        // đã được xử lý trong request()
      }
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [user]);

  // Đăng ký callback khi nhận 401 từ bất kỳ API call nào
  useEffect(() => {
    setOnUnauthorized((message) => {
      authService.clearUser();
      setUser(null);
      // Hiển thị alert đơn giản, có thể thay bằng toast
      alert(message);
      navigate('/login', { replace: true });
    });
  }, [navigate]);

  const onLogin = (userData, token) => {
    authService.saveUser(userData);
    if (token) authService.saveToken(token);
    setUser(userData);
    navigate(userData.role === 'admin' ? '/admin' : '/trang-chu');
  };

  const onLogout = async () => {
    try {
      await apiService.logout();
    } catch (_) {
      // Bỏ qua lỗi nếu API không khả dụng (vẫn logout local)
    }
    authService.clearUser();
    setUser(null);
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        Đang tải...
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, onLogin, onLogout }}>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/trang-chu" replace /> : <LoginPage />} />
          <Route path="/register" element={user ? <Navigate to="/trang-chu" replace /> : <RegisterPage />} />
          <Route
            path="/trang-chu"
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
            path="/topup"
            element={
              <ProtectedRoute>
                <TopUpPage />
              </ProtectedRoute>
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
          <Route path="*" element={<Navigate to={user ? '/trang-chu' : '/login'} replace />} />
        </Routes>
      </div>
    </AuthContext.Provider>
  );
}

export default App;