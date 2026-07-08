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
import { authService } from './services/authService';
import { apiService, setOnUnauthorized } from './services/apiService';
import { fingerprintService } from './services/fingerprintService';

export const AuthContext = createContext(null);
export const ThemeContext = createContext({ dark: false, toggleTheme: () => {} });

const POLL_INTERVAL_MS = 30 * 1000; // 30 giây

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dark, setDark] = useState(() => {
    // Mặc định sáng, chỉ chuyển sang tối khi người dùng chủ động bật
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return false; // mặc định là sáng
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

  // Apply/remove dark class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  // Khởi tạo Fingerprint.js ngay khi app mount (để cache fingerprint sớm)
  useEffect(() => {
    fingerprintService.init().catch(() => {
      // Silent fail, fingerprint sẽ được init sau khi cần
    });
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
          className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-white dark:bg-slate-700 shadow-lg border border-slate-200 dark:border-slate-600 hover:shadow-xl transition-all duration-200 hover:scale-110"
        >
          {dark ? (
            <svg className="h-6 w-6 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="h-6 w-6 text-slate-700" fill="currentColor" viewBox="0 0 20 20">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          )}
        </button>
      </div>
      </ThemeContext.Provider>
    </AuthContext.Provider>
  );
}

export default App;