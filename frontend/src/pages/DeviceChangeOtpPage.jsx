import { useState, useRef, useContext, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { apiService } from '../services/apiService';
import { deviceService } from '../services/deviceService';
import { AuthContext } from '../App';

export default function DeviceChangeOtpPage() {
  const location = useLocation();
  const initialData = location.state || {};
  const { email, password, existingDeviceName } = initialData;

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [sending, setSending] = useState(false);
  const [step, setStep] = useState(email && password ? 'otp' : 'email'); // 'email' | 'otp' | 'limit'
  const [emailInput, setEmailInput] = useState(email || '');
  const [passwordInput, setPasswordInput] = useState(password || '');
  const [remainingDays, setRemainingDays] = useState(0);
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

  // Tự động gửi OTP khi có sẵn email + password từ LoginPage
  useEffect(() => {
    if (email && password) {
      handleRequestOtp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCountdown = () => {
    // Clear interval cũ nếu có
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

  const handleRequestOtp = async (event) => {
    event?.preventDefault();
    if (sending) return; // chặn double click
    setSending(true);
    setError('');
    setMessage('');
    try {
      const result = await apiService.requestDeviceOtp({
        email: emailInput,
        password: passwordInput
      });
      setMessage(result.message);
      setStep('otp');
      startCountdown();
    } catch (err) {
      // Check for limit error
      if (err.message && err.message.includes('mỗi tuần')) {
        setStep('limit');
        // Extract remaining days
        const match = err.message.match(/sau (\d+) ngày/);
        setRemainingDays(match ? parseInt(match[1]) : 7);
      }
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0 || sending || !emailInput) return;
    setSending(true);
    setError('');
    try {
      const result = await apiService.requestDeviceOtp({
        email: emailInput,
        password: passwordInput
      });
      setMessage('Mã OTP mới đã được gửi đến email của bạn.');
      startCountdown();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
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
    setError('');
    try {
      const deviceId = await deviceService.getDeviceId();
      const deviceName = deviceService.getDeviceName();
      
      const result = await apiService.verifyDeviceOtp({
        email: emailInput,
        otp: otpCode,
        deviceId,
        deviceName
      });
      onLogin(result.user, result.token);
      navigate('/trang-chu');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step: Limit reached
  if (step === 'limit') {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md mx-auto rounded-3xl bg-white dark:bg-slate-800 p-8 shadow-xl dark:shadow-slate-800 sm:p-10 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Giới hạn đổi thiết bị</h1>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Bạn chỉ được phép đổi thiết bị <strong>1 lần mỗi tuần</strong>.
          </p>
          <p className="mt-2 text-sm text-amber-600 dark:text-amber-400 font-semibold">
            Vui lòng thử lại sau {remainingDays} ngày.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="mt-6 w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 transition"
          >
            Quay lại đăng nhập
          </button>
        </div>
      </div>
    );
  }

  // Step: OTP
  if (step === 'otp') {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md mx-auto rounded-3xl bg-white dark:bg-slate-800 p-8 shadow-xl dark:shadow-slate-800 sm:p-10">
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Xác nhận đổi thiết bị</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {existingDeviceName ? (
              <>Tài khoản của bạn đang được đăng nhập trên <strong className="text-slate-900 dark:text-slate-200">"{existingDeviceName}"</strong>.</>
            ) : (
              <>Một thiết bị khác đang đăng nhập vào tài khoản của bạn.</>
            )}
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Nhập mã OTP gồm 6 số được gửi đến <strong className="text-slate-900 dark:text-slate-200">{emailInput}</strong> để xác nhận đổi thiết bị.
          </p>
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
            Lưu ý: bạn chỉ được đổi thiết bị <strong>1 lần mỗi tuần</strong>.
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
              disabled={loading}
              className="mt-6 w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 transition disabled:opacity-50"
            >
              {loading ? 'Đang xác thực...' : 'Xác nhận đổi thiết bị'}
            </button>

            <div className="mt-4 text-center">
              <button
                onClick={handleResendOtp}
                disabled={countdown > 0 || sending}
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

          {message && (
            <p className="mt-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{message}</p>
          )}
          {error && (
            <p className="mt-4 rounded-xl bg-rose-50 dark:bg-rose-900/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{error}</p>
          )}

          <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
            <Link to="/login" className="font-semibold text-slate-900 dark:text-slate-100 hover:text-slate-600 dark:hover:text-slate-400">
              Quay lại
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // Step: Email form (initial)
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-md mx-auto rounded-3xl bg-white dark:bg-slate-800 p-8 shadow-xl dark:shadow-slate-800 sm:p-10">
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Đổi thiết bị đăng nhập</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Nhập email và mật khẩu để nhận mã OTP xác nhận đổi thiết bị.
        </p>

        <form className="mt-8 space-y-6" onSubmit={handleRequestOtp}>
          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 dark:focus:ring-slate-600"
              placeholder="your@email.com"
            />
          </div>
          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Mật khẩu</label>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 dark:focus:ring-slate-600"
              placeholder="Mật khẩu"
            />
          </div>

          {error && <p className="rounded-xl bg-rose-50 dark:bg-rose-900/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{error}</p>}

          <button
            type="submit"
            disabled={sending}
            className="w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 transition disabled:opacity-50"
          >
            {sending ? 'Đang gửi...' : 'Gửi mã OTP'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          <Link to="/login" className="font-semibold text-slate-900 dark:text-slate-100 hover:text-slate-600 dark:hover:text-slate-400">
            Quay lại đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}