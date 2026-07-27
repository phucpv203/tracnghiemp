import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiService } from '../services/apiService';
import { Button, Input, Card } from '../components/ui';
import { WarningCircle, CheckCircle, ArrowLeft, PaperPlaneTilt } from '@phosphor-icons/react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState('email');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const otpRefs = useRef([]);
  const navigate = useNavigate();
  const countdownRef = useRef(null);

  useEffect(() => {
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, []);

  const startCountdown = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(300);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(countdownRef.current); countdownRef.current = null; return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async (event) => {
    event?.preventDefault();
    if (!email.trim()) { setFieldErrors({ email: 'Vui lòng nhập email' }); return; }
    setLoading(true); setError('');
    try {
      const result = await apiService.forgotPassword({ email });
      setMessage(result.message);
      setStep('otp');
      startCountdown();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setLoading(true); setError('');
    try {
      await apiService.forgotPassword({ email });
      startCountdown();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleOtpChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return;
    const newOtp = [...otp]; newOtp[index] = value; setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').trim();
    if (!/^\d{6}$/.test(pastedData)) return;
    const digits = pastedData.split(''); setOtp(digits); otpRefs.current[5]?.focus();
  };

  const handleVerifyOtp = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) { setError('Vui lòng nhập đủ 6 mã số OTP.'); return; }
    setLoading(true); setError('');
    try {
      setStep('newPassword');
      setMessage('Mã OTP hợp lệ. Vui lòng nhập mật khẩu mới.');
    } finally { setLoading(false); }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    const errors = {};
    if (newPassword.length < 6) errors.newPassword = 'Mật khẩu phải có ít nhất 6 ký tự';
    if (newPassword !== confirmPassword) errors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true); setError('');
    try {
      const result = await apiService.resetPassword({ email, otp: otp.join(''), newPassword });
      setStep('success');
      setMessage(result.message);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  // Success step
  if (step === 'success') {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12 sm:px-6">
        <Card padding="lg" className="w-full max-w-md mx-auto text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-success-50 dark:bg-success-900/30">
            <CheckCircle size={32} weight="fill" className="text-success-600 dark:text-success-400" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Đặt lại mật khẩu thành công!</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{message}</p>
          <Button variant="primary" onClick={() => navigate('/login')} className="mt-6 w-full">
            Đăng nhập
          </Button>
        </Card>
      </div>
    );
  }

  // New Password step
  if (step === 'newPassword') {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12 sm:px-6">
        <Card padding="lg" className="w-full max-w-md mx-auto">
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Đặt mật khẩu mới</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Nhập mật khẩu mới cho tài khoản <strong className="text-slate-900 dark:text-slate-200">{email}</strong></p>

          <form className="mt-8 space-y-5" onSubmit={handleResetPassword} noValidate>
            <Input label="Mật khẩu mới" type="password" value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setFieldErrors(p => ({...p, newPassword: ''})); }} error={fieldErrors.newPassword} placeholder="Ít nhất 6 ký tự" required />
            <Input label="Xác nhận mật khẩu" type="password" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors(p => ({...p, confirmPassword: ''})); }} error={fieldErrors.confirmPassword} placeholder="Nhập lại mật khẩu mới" required />
            {error && <div className="flex items-center gap-2 rounded-xl bg-danger-50 dark:bg-danger-900/30 px-4 py-3 text-sm text-danger-700 dark:text-danger-300" role="alert"><WarningCircle size={18} weight="fill" /><span>{error}</span></div>}
            <Button type="submit" variant="primary" loading={loading} className="w-full">Đặt lại mật khẩu</Button>
          </form>
        </Card>
      </div>
    );
  }

  // OTP step
  if (step === 'otp') {
    const otpCode = otp.join('');
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12 sm:px-6">
        <Card padding="lg" className="w-full max-w-md mx-auto">
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Xác thực OTP</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Nhập mã OTP gồm 6 số được gửi đến <strong className="text-slate-900 dark:text-slate-200">{email}</strong></p>
          <p className="mt-2 text-sm font-medium text-warning-600 dark:text-warning-400">💡 Nếu không thấy email, vui lòng kiểm tra mục <strong>Spam</strong> hoặc <strong>Thư rác</strong>.</p>

          <div className="mt-8">
            <div className="flex justify-center gap-3">
              {otp.map((digit, index) => (
                <input key={index} ref={(el) => (otpRefs.current[index] = el)} type="text" maxLength={1} value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)} onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  onPaste={index === 0 ? handleOtpPaste : undefined}
                  className="w-12 h-14 text-center text-2xl font-bold rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition"
                  inputMode="numeric" autoComplete="one-time-code" aria-label={`Mã OTP số ${index + 1}`} />
              ))}
            </div>

            <Button onClick={handleVerifyOtp} loading={loading} className="mt-6 w-full">Xác thực</Button>

            <div className="mt-4 text-center">
              <button onClick={handleResendOtp} disabled={countdown > 0}
                className={`text-sm font-medium transition ${countdown > 0 ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed' : 'text-slate-900 dark:text-slate-200 hover:text-slate-600 dark:hover:text-slate-400'}`}>
                {countdown > 0 ? `Gửi lại mã (${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, '0')})` : 'Gửi lại mã OTP'}
              </button>
            </div>
          </div>

          {error && <div className="mt-4 flex items-center gap-2 rounded-xl bg-danger-50 dark:bg-danger-900/30 px-4 py-3 text-sm text-danger-700 dark:text-danger-300" role="alert"><WarningCircle size={18} weight="fill" /><span>{error}</span></div>}
          {message && <div className="mt-4 flex items-center gap-2 rounded-xl bg-success-50 dark:bg-success-900/30 px-4 py-3 text-sm text-success-700 dark:text-success-300">{message}</div>}

          <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
            <button onClick={() => setStep('email')} className="font-semibold text-slate-900 dark:text-slate-200 hover:text-slate-600 dark:hover:text-slate-400"><ArrowLeft size={16} weight="bold" className="inline" /> Quay lại</button>
          </p>
        </Card>
      </div>
    );
  }

  // Email step
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12 sm:px-6">
      <Card padding="lg" className="w-full max-w-md mx-auto">
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Quên mật khẩu</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Nhập email của bạn, chúng tôi sẽ gửi mã OTP để đặt lại mật khẩu.</p>
        <p className="mt-1 text-sm font-medium text-warning-600 dark:text-warning-400">💡 Nếu không thấy email, vui lòng kiểm tra mục <strong>Spam</strong> hoặc <strong>Thư rác</strong>.</p>

        <form className="mt-8 space-y-5" onSubmit={handleSendOtp} noValidate>
          <Input label="Email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setFieldErrors(p => ({...p, email: ''})); }} error={fieldErrors.email} placeholder="your@email.com" required />
          {error && <div className="flex items-center gap-2 rounded-xl bg-danger-50 dark:bg-danger-900/30 px-4 py-3 text-sm text-danger-700 dark:text-danger-300" role="alert"><WarningCircle size={18} weight="fill" /><span>{error}</span></div>}
          <Button type="submit" variant="primary" loading={loading} className="w-full">
            <PaperPlaneTilt size={16} weight="bold" />
            Gửi mã OTP
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          Nhớ mật khẩu?{' '}
          <Link to="/login" className="font-semibold text-slate-900 dark:text-slate-100 hover:text-slate-700 dark:hover:text-slate-300">Đăng nhập</Link>
        </p>
      </Card>
    </div>
  );
}