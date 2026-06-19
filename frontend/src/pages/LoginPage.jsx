import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiService } from '../services/apiService';
import { deviceService } from '../services/deviceService';
import { AuthContext } from '../App';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailNotVerified, setEmailNotVerified] = useState(null);
  const { onLogin } = useContext(AuthContext);
  const navigate = useNavigate();

  // --- Hàm parse tên thiết bị từ message ---
  function extractDeviceName(message) {
    const match = message.match(/đang được dùng trên "([^"]+)"/);
    return match ? match[1] : 'thiết bị khác';
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    setEmailNotVerified(null);

    const deviceId = await deviceService.getDeviceId();
    const deviceName = deviceService.getDeviceName();

    try {
      const response = await apiService.login({ email, password, deviceId, deviceName });
      onLogin(response.user, response.token);
    } catch (err) {
      // Nếu conflict thiết bị → chuyển sang trang OTP đổi thiết bị
      if (err.message && err.message.includes('Tài khoản đang được dùng trên')) {
        const existingDeviceName = extractDeviceName(err.message);
        navigate('/device-change-otp', {
          state: { email, password, existingDeviceName }
        });
      } else if (err.message && err.message.includes('Email chưa được xác thực')) {
        setEmailNotVerified({ email });
        setError('Email chưa được xác thực. Vui lòng kiểm tra email hoặc gửi lại mã OTP.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!emailNotVerified) return;
    setLoading(true);
    setError('');
    try {
      await apiService.resendOtp({ email: emailNotVerified.email });
      navigate('/verify-email', { state: { email: emailNotVerified.email } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12 sm:px-6">
      <div className="w-full rounded-3xl bg-white dark:bg-slate-800 p-8 shadow-xl dark:shadow-slate-800 sm:p-10">
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Đăng nhập</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Đăng nhập để tiếp tục ôn thi trắc nghiệm.</p>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 dark:focus:ring-slate-600"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Mật khẩu</label>
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition"
              >
                Quên mật khẩu?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 dark:focus:ring-slate-600"
            />
          </div>

          {error && <p className="rounded-xl bg-rose-50 dark:bg-rose-900/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{error}</p>}

          {/* Email not verified */}
          {emailNotVerified && (
            <div className="rounded-2xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 p-5">
              <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                Nhấn nút bên dưới để gửi lại mã OTP xác thực email.
              </p>
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={loading}
                className="w-full rounded-xl bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {loading ? 'Đang gửi...' : 'Gửi lại mã OTP'}
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 transition disabled:bg-slate-300 dark:disabled:bg-slate-600"
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

          <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="font-semibold text-slate-900 dark:text-slate-100 hover:text-slate-700 dark:hover:text-slate-300">
              Đăng ký ngay
            </Link>
          </p>
      </div>
    </div>
  );
}