import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiService } from '../services/apiService';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState('email'); // 'email' | 'otp' | 'newPassword' | 'success'
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const otpRefs = useRef([]);
  const navigate = useNavigate();

  const startCountdown = () => {
    setCountdown(300);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async (event) => {
    event?.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await apiService.forgotPassword({ email });
      setMessage(result.message);
      setStep('otp');
      startCountdown();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setLoading(true);
    setError('');
    try {
      const result = await apiService.forgotPassword({ email });
      setMessage(result.message);
      startCountdown();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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

  // Cho phép paste toàn bộ mã OTP (6 số) vào ô đầu tiên
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
      setStep('newPassword');
      setMessage('Mã OTP hợp lệ. Vui lòng nhập mật khẩu mới.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    
    if (newPassword.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await apiService.resetPassword({
        email,
        otp: otp.join(''),
        newPassword
      });
      setStep('success');
      setMessage(result.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step: Success
  if (step === 'success') {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md mx-auto rounded-3xl bg-white dark:bg-slate-800 p-8 shadow-xl dark:shadow-slate-800 sm:p-10 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Đặt lại mật khẩu thành công!</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{message}</p>
          <button
            onClick={() => navigate('/login')}
            className="mt-6 w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 transition"
          >
            Đăng nhập
          </button>
        </div>
      </div>
    );
  }

  // Step: New Password
  if (step === 'newPassword') {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md mx-auto rounded-3xl bg-white dark:bg-slate-800 p-8 shadow-xl dark:shadow-slate-800 sm:p-10">
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Đặt mật khẩu mới</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Nhập mật khẩu mới cho tài khoản <strong className="text-slate-900 dark:text-slate-200">{email}</strong></p>

          <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Mật khẩu mới</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-900 dark:text-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 dark:focus:ring-slate-600"
                placeholder="Ít nhất 6 ký tự"
              />
            </div>
            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Xác nhận mật khẩu</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-900 dark:text-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 dark:focus:ring-slate-600"
                placeholder="Nhập lại mật khẩu mới"
              />
            </div>

            {error && <p className="rounded-xl bg-rose-50 dark:bg-rose-900/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 transition disabled:opacity-50"
            >
              {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Step: OTP
  if (step === 'otp') {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md mx-auto rounded-3xl bg-white dark:bg-slate-800 p-8 shadow-xl dark:shadow-slate-800 sm:p-10">
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Xác thực OTP</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Nhập mã OTP gồm 6 số được gửi đến <strong className="text-slate-900 dark:text-slate-200">{email}</strong>
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
              {loading ? 'Đang xác thực...' : 'Xác thực'}
            </button>

            <div className="mt-4 text-center">
              <button
                onClick={handleResendOtp}
                disabled={countdown > 0 || loading}
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
            <p className="mt-4 rounded-xl bg-rose-50 dark:bg-rose-900/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{error}</p>
          )}

          <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
            <button
              onClick={() => setStep('email')}
              className="font-semibold text-slate-900 dark:text-slate-200 hover:text-slate-600 dark:hover:text-slate-400"
            >
              Quay lại
            </button>
          </p>
        </div>
      </div>
    );
  }

  // Step: Email
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-md mx-auto rounded-3xl bg-white dark:bg-slate-800 p-8 shadow-xl dark:shadow-slate-800 sm:p-10">
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Quên mật khẩu</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Nhập email của bạn, chúng tôi sẽ gửi mã OTP để đặt lại mật khẩu.
        </p>

        <form className="mt-8 space-y-6" onSubmit={handleSendOtp}>
          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 dark:focus:ring-slate-600"
              placeholder="your@email.com"
            />
          </div>

          {message && (
            <p className="rounded-xl bg-emerald-50 dark:bg-emerald-900/30 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{message}</p>
          )}

          {error && (
            <p className="rounded-xl bg-rose-50 dark:bg-rose-900/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 transition disabled:opacity-50"
          >
            {loading ? 'Đang gửi...' : 'Gửi mã OTP'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          Nhớ mật khẩu?{' '}
          <Link to="/login" className="font-semibold text-slate-900 dark:text-slate-100 hover:text-slate-700 dark:hover:text-slate-300">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}