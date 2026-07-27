import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { apiService } from '../services/apiService';
import { AuthContext } from '../App';
import { Button, Card } from '../components/ui';
import { WarningCircle } from '@phosphor-icons/react';

export default function VerifyEmailPage() {
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const emailFromUser = user?.email || '';
  const initialEmail = location.state?.email || emailFromUser || '';

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const otpRefs = useRef([]);
  const navigate = useNavigate();
  const { onLogin } = useContext(AuthContext);
  const countdownRef = useRef(null);

  useEffect(() => {
    if (email && !otp.some(d => d !== '')) {
      handleResendOtp();
    }
  }, [email]);

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

  const handleResendOtp = async () => {
    if (countdown > 0 || !email) return;
    setLoading(true); setError('');
    try {
      await apiService.resendOtp({ email });
      setMessage('Mã OTP mới đã được gửi đến email của bạn.');
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
      const result = await apiService.verifyEmail({ email, otp: otpCode });
      onLogin(result.user, result.token);
      navigate('/trang-chu');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12 sm:px-6">
      <Card padding="lg" className="w-full max-w-md mx-auto">
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Xác thực email</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Nhập mã OTP gồm 6 số được gửi đến email của bạn.
        </p>
        <p className="mt-2 text-sm font-medium text-warning-600 dark:text-warning-400">
          💡 Nếu không thấy email, vui lòng kiểm tra mục <strong>Spam</strong> hoặc <strong>Thư rác</strong>.
        </p>

        <div className="mt-6 space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800"
          />

          {email && (
            <>
              <div className="flex justify-center gap-3">
                {otp.map((digit, index) => (
                  <input key={index} ref={(el) => (otpRefs.current[index] = el)} type="text" maxLength={1} value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)} onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={index === 0 ? handleOtpPaste : undefined}
                    className="w-12 h-14 text-center text-2xl font-bold rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition"
                    inputMode="numeric" autoComplete="one-time-code" aria-label={`Mã OTP số ${index + 1}`} />
                ))}
              </div>

              <Button onClick={handleVerifyOtp} loading={loading} className="w-full">Xác thực</Button>

              <div className="text-center">
                <button onClick={handleResendOtp} disabled={countdown > 0}
                  className={`text-sm font-medium transition ${countdown > 0 ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed' : 'text-slate-900 dark:text-slate-200 hover:text-slate-600 dark:hover:text-slate-400'}`}>
                  {countdown > 0 ? `Gửi lại mã (${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, '0')})` : 'Gửi lại mã OTP'}
                </button>
              </div>
            </>
          )}
        </div>

        {message && <div className="mt-4 flex items-center gap-2 rounded-xl bg-success-50 dark:bg-success-900/30 px-4 py-3 text-sm text-success-700 dark:text-success-300">{message}</div>}
        {error && <div className="mt-4 flex items-center gap-2 rounded-xl bg-danger-50 dark:bg-danger-900/30 px-4 py-3 text-sm text-danger-700 dark:text-danger-300" role="alert"><WarningCircle size={18} weight="fill" /><span>{error}</span></div>}

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          <Link to="/login" className="font-semibold text-slate-900 dark:text-slate-100 hover:text-slate-600 dark:hover:text-slate-400">Quay lại đăng nhập</Link>
        </p>
      </Card>
    </div>
  );
}