/**
 * App.jsx - Component chính của ứng dụng
 *
 * Tính năng:
 * 1. Lưu đăng nhập: khi load, verify token với backend qua /auth/me.
 *    Nếu token hợp lệ → set user, không cần login lại.
 *    Nếu token sai/hết hạn/phiên bị thay thế → auto logout.
 * 2. 1 tài khoản 1 thiết bị: polling /auth/me mỗi 30 giây.
 *    Nếu backend trả 401 với code=SESSION_REPLACED → user bị đá ra.
 * 3. Cập nhật document.title theo trang hiện tại
 */
import { useState, useEffect, createContext, useRef, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DeviceChangeOtpPage from './pages/DeviceChangeOtpPage';
import ContactPage from './pages/ContactPage';
import DashboardPage from './pages/DashboardPage';
import StudyPage from './pages/StudyPage';
import GuestStudyPage from './pages/GuestStudyPage';
import TopUpPage from './pages/TopUpPage';
import ExamPage from './pages/ExamPage';
import FillStudyPage from './pages/FillStudyPage';
import FillExamPage from './pages/FillExamPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminCourses from './pages/AdminCourses';
import AdminEditQuestions from './pages/AdminEditQuestions';
import AdminNote from './pages/AdminNote';
import ProtectedRoute from './components/ProtectedRoute';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import { Skeleton } from './components/ui';
import { authService } from './services/authService';
import { apiService, setOnUnauthorized } from './services/apiService';
import { fingerprintService } from './services/fingerprintService';
import { Sun, Moon, Spinner } from '@phosphor-icons/react';

export const AuthContext = createContext(null);
export const ThemeContext = createContext({ dark: false, toggleTheme: () => {} });

const POLL_INTERVAL_MS = 30 * 1000; // 30 giây

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return false;
  });
  const navigate = useNavigate();
  const pollRef = useRef(null);

  const toggleTheme = useCallback(() => {
    setDark(prev => {
      const next = !prev;
      localStorage.setItem('theme', next ? 'dark' : 'light');
      return next;
    });
  }, []);

  // Apply/remove dark class on <html> và update document theme meta
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.content = dark ? '#0f172a' : '#f5f5f4';
    }
  }, [dark]);

  // Set document title mặc định
  useEffect(() => {
    document.title = 'Hệ thống ôn thi trắc nghiệm';
  }, []);

  // Khởi tạo Fingerprint.js ngay khi app mount
  useEffect(() => {
    fingerprintService.init().catch(() => {});
  }, []);

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
          authService.clearUser();
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Polling để phát hiện phiên bị thay thế
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
        await apiService.me();
      } catch (_) {}
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [user]);

  // Đăng ký callback khi nhận 401
  useEffect(() => {
    setOnUnauthorized((message) => {
      authService.clearUser();
      setUser(null);
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
    } catch (_) {}
    authService.clearUser();
    setUser(null);
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-stone-100 dark:bg-slate-900 animate-fade-in">
        <div className="flex flex-col items-center gap-6">
          <Spinner size={40} weight="bold" className="text-primary-600 animate-spin" />
          <div className="space-y-3 text-center">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Đang tải ứng dụng...</p>
            <div className="w-48 mx-auto space-y-2">
              <Skeleton variant="text" />
              <Skeleton variant="text" width="60%" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, onLogin, onLogout }}>
      <ThemeContext.Provider value={{ dark, toggleTheme }}>
        <div className="min-h-screen bg-stone-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-200">
          <Routes>
          <Route path="/login" element={user ? <Navigate to="/trang-chu" replace /> : <LoginPage />} />
          <Route path="/register" element={user ? <Navigate to="/trang-chu" replace /> : <RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={user ? <Navigate to="/trang-chu" replace /> : <ForgotPasswordPage />} />
          <Route path="/device-change-otp" element={user ? <Navigate to="/trang-chu" replace /> : <DeviceChangeOtpPage />} />
          <Route path="/lien-he" element={<ContactPage />} />
          <Route path="/trang-chu" element={<DashboardPage />} />
          <Route path="/preview/:courseId" element={<GuestStudyPage />} />
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
            path="/admin/courses/:courseId/questions"
            element={
              <AdminProtectedRoute>
                <AdminEditQuestions />
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/note"
            element={
              <AdminProtectedRoute>
                <AdminNote />
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
          <Route
            path="/fill-study/:courseId"
            element={
              <ProtectedRoute>
                <FillStudyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/fill-exam/:courseId"
            element={
              <ProtectedRoute>
                <FillExamPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/trang-chu" replace />} />
        </Routes>

        {/* Floating theme toggle button */}
        <button
          onClick={toggleTheme}
          aria-label={dark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
          className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-white dark:bg-slate-700 shadow-lg border border-slate-200 dark:border-slate-600 hover:shadow-xl transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          {dark ? (
            <Sun size={24} weight="fill" className="text-warning-400" />
          ) : (
            <Moon size={24} weight="fill" className="text-slate-700" />
          )}
        </button>
      </div>
      </ThemeContext.Provider>
    </AuthContext.Provider>
  );
}

export default App;