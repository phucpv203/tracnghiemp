import { useState, useContext, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiService } from '../services/apiService';
import { deviceService } from '../services/deviceService';
import { AuthContext } from '../App';
import NoteBanner from '../components/NoteBanner';
import { Button, Input, Card } from '../components/ui';
import { WarningCircle, GoogleLogo } from '@phosphor-icons/react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailNotVerified, setEmailNotVerified] = useState(null);
  const [deviceConflict, setDeviceConflict] = useState(null);
  const [replacing, setReplacing] = useState(false);
  const [verifyWarning, setVerifyWarning] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const { onLogin } = useContext(AuthContext);
  const navigate = useNavigate();
  const googleBtnRef = useRef(null);
  const googleInitialized = useRef(false);

  function extractDeviceName(message) {
    const match = message.match(/đang được dùng trên "([^"]+)"/);
    return match ? match[1] : 'thiết bị khác';
  }

  const validateForm = () => {
    const errors = {};
    if (!email.trim()) {
      errors.email = 'Vui lòng nhập email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Email không đúng định dạng';
    }
    if (!password) {
      errors.password = 'Vui lòng nhập mật khẩu';
    } else if (password.length < 6) {
      errors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setEmailNotVerified(null);
    setDeviceConflict(null);
    setVerifyWarning(null);

    if (!validateForm()) return;

    setLoading(true);

    const deviceId = await deviceService.getDeviceId();
    const deviceName = deviceService.getDeviceName();

    try {
      const response = await apiService.login({ email, password, deviceId, deviceName });
      if (!response.user.emailVerified) {
        setVerifyWarning({ email });
      }
      onLogin(response.user, response.token);
    } catch (err) {
      if (err.message && err.message.includes('Tài khoản đang được dùng trên')) {
        const existingDeviceName = extractDeviceName(err.message);
        setDeviceConflict({ existingDeviceName, email, password });
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReplaceDevice = () => {
    if (!deviceConflict) return;
    navigate('/device-change-otp', {
      state: {
        email: deviceConflict.email,
        password: deviceConflict.password,
        existingDeviceName: deviceConflict.existingDeviceName
      }
    });
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

  // Khởi tạo nút Google Sign-In
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || googleInitialized.current) return;

    const checkGoogle = () => {
      if (typeof window.google?.accounts?.id === 'object') {
        googleInitialized.current = true;

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response) => {
            if (!response?.credential) {
              setError('Đăng nhập Google thất bại.');
              return;
            }
            setGoogleLoading(true);
            setError('');
            try {
              const deviceId = await deviceService.getDeviceId();
              const deviceName = deviceService.getDeviceName();
              const result = await apiService.googleLogin({
                idToken: response.credential,
                deviceId,
                deviceName
              });
              onLogin(result.user, result.token);
            } catch (err) {
              setError(err.message);
            } finally {
              setGoogleLoading(false);
            }
          },
        });

        if (googleBtnRef.current) {
          window.google.accounts.id.renderButton(
            googleBtnRef.current,
            { theme: 'outline', size: 'large', width: '100%', text: 'signin_with' }
          );
        }
        return true;
      }
      return false;
    };

    if (!checkGoogle()) {
      const interval = setInterval(() => {
        if (checkGoogle()) clearInterval(interval);
      }, 200);
      setTimeout(() => clearInterval(interval), 10000);
    }
  }, [onLogin]);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12 sm:px-6">
      <Card padding="lg" className="w-full">
        <NoteBanner page="login" />
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Đăng nhập</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Đăng nhập để tiếp tục ôn thi trắc nghiệm.</p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setFieldErrors(prev => ({ ...prev, email: '' })); }}
            error={fieldErrors.email}
            placeholder="your@email.com"
            required
          />

          <Input
            label="Mật khẩu"
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setFieldErrors(prev => ({ ...prev, password: '' })); }}
            error={fieldErrors.password}
            placeholder="••••••••"
            required
            helperText={
              <Link to="/forgot-password" className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition">
                Quên mật khẩu?
              </Link>
            }
          />

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-danger-50 dark:bg-danger-900/30 px-4 py-3 text-sm text-danger-700 dark:text-danger-300" role="alert">
              <WarningCircle size={18} weight="fill" className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {emailNotVerified && (
            <div className="rounded-2xl border border-warning-200 dark:border-warning-700 bg-warning-50 dark:bg-warning-900/30 p-5">
              <p className="text-sm text-warning-700 dark:text-warning-300 mb-3">
                Nhấn nút bên dưới để gửi lại mã OTP xác thực email.
              </p>
              <Button
                type="button"
                variant="warning"
                size="sm"
                onClick={handleResendVerification}
                loading={loading}
                className="w-full"
              >
                Gửi lại mã OTP
              </Button>
            </div>
          )}

          <Button type="submit" variant="primary" loading={loading} className="w-full">
            Đăng nhập
          </Button>
        </form>

        {GOOGLE_CLIENT_ID && (
          <>
            <div className="mt-6 flex items-center gap-3">
              <div className="flex-1 border-t border-slate-200 dark:border-slate-600"></div>
              <span className="text-xs text-slate-400 dark:text-slate-500">HOẶC</span>
              <div className="flex-1 border-t border-slate-200 dark:border-slate-600"></div>
            </div>

            <div className="mt-6 flex justify-center">
              {googleLoading ? (
                <Button variant="secondary" loading disabled className="w-full">
                  Đang đăng nhập với Google...
                </Button>
              ) : (
                <div ref={googleBtnRef}></div>
              )}
            </div>
          </>
        )}

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="font-semibold text-slate-900 dark:text-slate-100 hover:text-slate-700 dark:hover:text-slate-300">
            Đăng ký ngay
          </Link>
        </p>
      </Card>

      {/* Modal xác nhận đổi thiết bị */}
      {deviceConflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in" onClick={() => !replacing && setDeviceConflict(null)}>
          <div className="mx-4 w-full max-w-md rounded-3xl bg-white dark:bg-slate-800 p-8 shadow-xl dark:shadow-slate-800 sm:p-10 text-center animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-warning-50 dark:bg-warning-900/30">
              <WarningCircle size={32} weight="fill" className="text-warning-600 dark:text-warning-400" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Thiết bị đã tồn tại</h2>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Tài khoản của bạn đang được đăng nhập trên thiết bị:
            </p>
            <p className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-200">
              "{deviceConflict.existingDeviceName}"
            </p>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
              Bạn có muốn xoá thiết bị đó để đăng nhập trên thiết bị này không?
            </p>

            <div className="mt-6 flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setDeviceConflict(null)}
                disabled={replacing}
                className="flex-1"
              >
                Huỷ
              </Button>
              <Button
                variant="warning"
                onClick={handleReplaceDevice}
                loading={replacing}
                className="flex-1"
              >
                Xoá và đăng nhập
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}