import { useState, useRef, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiService } from '../services/apiService';
import { AuthContext } from '../App';
import NoteBanner from '../components/NoteBanner';
import { Button, Input, Card } from '../components/ui';
import { WarningCircle, ArrowLeft } from '@phosphor-icons/react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState('register');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(0);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const otpRefs = useRef([]);
  const navigate = useNavigate();
  const { onLogin } = useContext(AuthContext);
  const countdownRef = useRef(null);

  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  const validateForm = () => {
    const errors = {};
    if (!name.trim()) {
      errors.name = 'Vui lòng nhập họ và tên';
    }
    if (!email.trim()) {
      errors.email = 'Vui lòng nhập email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Email không đúng định dạng';
    } else {
      const domainParts = email.split('@')[1]?.split('.') || [];
      const tld = domainParts[domainParts.length - 1];
      if (!tld || tld.length < 2) {
        errors.email = 'Email phải có đuôi tên miền hợp lệ (vd: .com, .vn, .net)';
      }
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

    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = await apiService.register({ name, email, password });
      setStep('otp');
      startCountdown();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const startCountdown = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
    setCountdown(300);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    try {
      setError('');
      await apiService.resendOtp({ email });
      startCountdown();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleOtpChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').trim();
    if (!/^\d{6}$/.test(pastedData)) return;
    
    const digits = pastedData.split('');
    setOtp(digits);
    otpRefs.current[5]?.focus();
  };

  const handleVerifyOtp = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Vui lòng nhập đủ 6 mã số OTP.');
      return;
    }
    
    setLoading(true);
    try {
      setError('');
      const result = await apiService.verifyEmail({ email, otp: otpCode });
      onLogin(result.user, result.token);
      navigate('/trang-chu');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'otp') {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12 sm:px-6">
        <Card padding="lg" className="w-full max-w-md mx-auto">
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Xác thực email</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Nhập mã OTP gồm 6 số được gửi đến <strong className="text-slate-900 dark:text-slate-200">{email}</strong>
          </p>
          <p className="mt-2 text-sm font-medium text-warning-600 dark:text-warning-400">
            💡 Nếu không thấy email, vui lòng kiểm tra mục <strong>Spam</strong> hoặc <strong>Thư rác</strong>.
          </p>

          <div className="mt-8">
            <div className="flex justify-center gap-3">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (otpRefs.current[index] = el)}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  onPaste={index === 0 ? handleOtpPaste : undefined}
                  className="w-12 h-14 text-center text-2xl font-bold rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  aria-label={`Mã OTP số ${index + 1}`}
                />
              ))}
            </div>

            <Button
              onClick={handleVerifyOtp}
              loading={loading}
              className="mt-6 w-full"
            >
              Xác thực
            </Button>

            <div className="mt-4 text-center">
              <button
                onClick={handleResendOtp}
                disabled={countdown > 0}
                className={`text-sm font-medium transition ${
                  countdown > 0
                    ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed'
                    : 'text-slate-900 dark:text-slate-200 hover:text-slate-600 dark:hover:text-slate-400'
                }`}
              >
                {countdown > 0
                  ? `Gửi lại mã (${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, '0')})`
                  : 'Gửi lại mã OTP'}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-danger-50 dark:bg-danger-900/30 px-4 py-3 text-sm text-danger-700 dark:text-danger-300" role="alert">
              <WarningCircle size={18} weight="fill" className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
            <button
              onClick={() => setStep('register')}
              className="font-semibold text-slate-900 dark:text-slate-200 hover:text-slate-600 dark:hover:text-slate-400 inline-flex items-center gap-1"
            >
              <ArrowLeft size={16} weight="bold" />
              Quay lại đăng ký
            </button>
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12 sm:px-6">
      <Card padding="lg" className="w-full">
        <NoteBanner page="register" />
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Đăng ký</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Tạo tài khoản mới để bắt đầu ôn luyện.</p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
          <Input
            label="Họ và tên"
            value={name}
            onChange={(e) => { setName(e.target.value); setFieldErrors(prev => ({ ...prev, name: '' })); }}
            error={fieldErrors.name}
            placeholder="Nguyễn Văn A"
            required
          />
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
            helperText="Ít nhất 6 ký tự"
          />

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-danger-50 dark:bg-danger-900/30 px-4 py-3 text-sm text-danger-700 dark:text-danger-300" role="alert">
              <WarningCircle size={18} weight="fill" className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" variant="primary" loading={loading} className="w-full">
            Đăng ký
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          Đã có tài khoản?{' '}
          <Link to="/login" className="font-semibold text-slate-900 dark:text-slate-100 hover:text-slate-700 dark:hover:text-slate-300">
            Đăng nhập
          </Link>
        </p>
      </Card>
    </div>
  );
}