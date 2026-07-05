import { useState, useRef, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiService } from '../services/apiService';
import { AuthContext } from '../App';
import NoteBanner from '../components/NoteBanner';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState('register'); // 'register' | 'otp'
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(0);
  const otpRefs = useRef([]);
  const navigate = useNavigate();
  const { onLogin } = useContext(AuthContext);
  const countdownRef = useRef(null);

  // Cleanup interval khi unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setError('');
      const result = await apiService.register({ name, email, password });
      setStep('otp');
      startCountdown();
    } catch (err) {
      setError(err.message);
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

    // Auto focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Cho phép paste toàn bộ mã OTP (6 số) vào ô đầu tiên
  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').trim();
    // Chỉ chấp nhận chuỗi 6 chữ số
    if (!/^\d{6}$/.test(pastedData)) return;
    
    const digits = pastedData.split('');
    setOtp(digits);
    // Focus vào ô cuối cùng sau khi paste
    otpRefs.current[5]?.focus();
  };

  const handleVerifyOtp = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Vui lòng nhập đủ 6 mã số OTP.');
      return;
    }
    
    try {
      setError('');
      const result = await apiService.verifyEmail({ email, otp: otpCode });
      onLogin(result.user, result.token);
      navigate('/trang-chu');
    } catch (err) {
      setError(err.message);
    }
  };

  if (step === 'otp') {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md mx-auto rounded-3xl bg-white dark:bg-slate-800 p-8 shadow-xl dark:shadow-slate-800 sm:p-10">
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Xác thực email</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Nhập mã OTP gồm 6 số được gửi đến <strong className="text-slate-900 dark:text-slate-200">{email}</strong>
          </p>
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
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
                  className="w-12 h-14 text-center text-2xl font-bold rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 dark:focus:ring-slate-600"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              ))}
            </div>

            <button
              onClick={handleVerifyOtp}
              className="mt-6 w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 transition"
            >
              Xác thực
            </button>

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
            <p className="mt-4 rounded-xl bg-rose-50 dark:bg-rose-900/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
              {error}
            </p>
          )}

          <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
            <button
              onClick={() => setStep('register')}
              className="font-semibold text-slate-900 dark:text-slate-200 hover:text-slate-600 dark:hover:text-slate-400"
            >
              Quay lại đăng ký
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12 sm:px-6">
      <div className="w-full rounded-3xl bg-white dark:bg-slate-800 p-8 shadow-xl dark:shadow-slate-800 sm:p-10">
        <NoteBanner page="register" />
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Đăng ký</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Tạo tài khoản mới để bắt đầu ôn luyện.</p>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Họ và tên</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 dark:focus:ring-slate-600" />
          </div>
          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 dark:focus:ring-slate-600" />
          </div>
          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Mật khẩu</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 dark:focus:ring-slate-600" />
          </div>

          {error && <p className="rounded-xl bg-rose-50 dark:bg-rose-900/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{error}</p>}

          <button type="submit" className="w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 transition">
            Đăng ký
          </button>
        </form>

          <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
            Đã có tài khoản?{' '}
            <Link to="/login" className="font-semibold text-slate-900 dark:text-slate-100 hover:text-slate-700 dark:hover:text-slate-300">
              Đăng nhập
            </Link>
          </p>
      </div>
    </div>
  );
}