import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { apiService } from '../services/apiService';
import { deviceService } from '../services/deviceService';
import { AuthContext } from '../App';
import { Button, Card, Input } from '../components/ui';
import { WarningCircle, CheckCircle, ArrowLeft } from '@phosphor-icons/react';

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
  const [step, setStep] = useState(email && password ? 'confirm' : 'email');
  const [emailInput, setEmailInput] = useState(email || '');
  const [passwordInput, setPasswordInput] = useState(password || '');
  const [remainingDays, setRemainingDays] = useState(0);
  const [fieldErrors, setFieldErrors] = useState({});
  const otpRefs = useRef([]);
  const navigate = useNavigate();
  const { onLogin } = useContext(AuthContext);
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

  const handleRequestOtp = async (event) => {
    event?.preventDefault();
    const errors = {};
    if (!emailInput.trim()) errors.email = 'Vui lòng nhập email';
    if (!passwordInput.trim()) errors.password = 'Vui lòng nhập mật khẩu';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    if (sending) return;
    setSending(true); setError(''); setMessage('');
    try {
      const result = await apiService.requestDeviceOtp({ email: emailInput, password: passwordInput });
      setMessage(result.message);
      setStep('otp');
      startCountdown();
    } catch (err) {
      if (err.message?.includes('mỗi tuần')) {
        setStep('limit');
        const match = err.message.match(/sau (\d+) ngày/);
        setRemainingDays(match ? parseInt(match[1]) : 7);
      }
      setError(err.message);
    } finally { setSending(false); }
  };

  const handleResendOtp = async () => {
    if (countdown > 0 || sending || !emailInput) return;
    setSending(true); setError('');
    try {
      await apiService.requestDeviceOtp({ email: emailInput, password: passwordInput });
      setMessage('Mã OTP mới đã được gửi đến email của bạn.');
      startCountdown();
    } catch (err) { setError(err.message); }
    finally { setSending(false); }
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
      const deviceId = await deviceService.getDeviceId();
      const deviceName = deviceService.getDeviceName();
      const result = await apiService.verifyDeviceOtp({ email: emailInput, otp: otpCode, deviceId, deviceName });
      onLogin(result.user, result.token);
      navigate('/trang-chu');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  if (step === 'limit') {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12 sm:px-6">
        <Card padding="lg" className="w-full max-w-md mx-auto text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-warning-50 dark:bg-warning-900/30">
            <WarningCircle size={32} weight="fill" className="text-warning-600 dark:text-warning-400" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Giới hạn đổi thiết bị</h1>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">Bạn chỉ được phép đổi thiết bị <strong>1 lần mỗi tuần</strong>.</p>
          <p className="mt-2 text-sm text-warning-600 dark:text-warning-400 font-semibold">Vui lòng thử lại sau {remainingDays} ngày.</p>
          <Button variant="primary" onClick={() => navigate('/login')} className="mt-6 w-full">Quay lại đăng nhập</Button>
        </Card>
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12 sm:px-6">
        <Card padding="lg" className="w-full max-w-md mx-auto text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-warning-50 dark:bg-warning-900/30">
            <WarningCircle size={32} weight="fill" className="text-warning-600 dark:text-warning-400" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Xác nhận đổi thiết bị</h1>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">Tài khoản của bạn đang được đăng nhập trên thiết bị:</p>
          <p className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-200">"{existingDeviceName}"</p>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">Bạn có muốn đăng nhập trên thiết bị này không?</p>

          <div className="mt-4 rounded-xl bg-warning-50 dark:bg-warning-900/30 p-4 border border-warning-200 dark:border-warning-700">
            <p className="text-sm font-bold text-warning-700 dark:text-warning-300">
              ⚠ Lưu ý: bạn chỉ được đổi thiết bị <strong>1 lần mỗi tuần</strong>.
            </p>
          </div>

          <div className="mt-6 flex gap-3">
            <Button variant="secondary" onClick={() => navigate('/login')} className="flex-1">Huỷ</Button>
            <Button variant="warning" onClick={() => { setStep('otp'); handleRequestOtp(); }} loading={sending} className="flex-1">Đồng ý đổi thiết bị</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (step === 'otp') {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12 sm:px-6">
        <Card padding="lg" className="w-full max-w-md mx-auto">
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Xác nhận đổi thiết bị</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {existingDeviceName ? <>Tài khoản của bạn đang được đăng nhập trên <strong className="text-slate-900 dark:text-slate-200">"{existingDeviceName}"</strong>.</> : <>Một thiết bị khác đang đăng nhập vào tài khoản của bạn.</>}
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Nhập mã OTP gồm 6 số được gửi đến <strong className="text-slate-900 dark:text-slate-200">{emailInput}</strong> để xác nhận.</p>
          <p className="mt-2 text-sm font-medium text-warning-600 dark:text-warning-400">💡 Nếu không thấy email, vui lòng kiểm tra mục <strong>Spam</strong> hoặc <strong>Thư rác</strong>.</p>
          <div className="mt-3 rounded-xl bg-warning-50 dark:bg-warning-900/30 p-3 border border-warning-200 dark:border-warning-700">
            <p className="text-sm font-bold text-warning-700 dark:text-warning-300">⚠ Lưu ý: bạn chỉ được đổi thiết bị <strong>1 lần mỗi tuần</strong>.</p>
          </div>

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

            <Button onClick={handleVerifyOtp} loading={loading} className="mt-6 w-full">Xác nhận đổi thiết bị</Button>

            <div className="mt-4 text-center">
              <button onClick={handleResendOtp} disabled={countdown > 0 || sending}
                className={`text-sm font-medium transition ${countdown > 0 ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed' : 'text-slate-900 dark:text-slate-200 hover:text-slate-600 dark:hover:text-slate-400'}`}>
                {countdown > 0 ? `Gửi lại mã (${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, '0')})` : 'Gửi lại mã OTP'}
              </button>
            </div>
          </div>

          {message && <div className="mt-4 flex items-center gap-2 rounded-xl bg-success-50 dark:bg-success-900/30 px-4 py-3 text-sm text-success-700 dark:text-success-300">{message}</div>}
          {error && <div className="mt-4 flex items-center gap-2 rounded-xl bg-danger-50 dark:bg-danger-900/30 px-4 py-3 text-sm text-danger-700 dark:text-danger-300" role="alert"><WarningCircle size={18} weight="fill" /><span>{error}</span></div>}

          <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
            <Link to="/login" className="font-semibold text-slate-900 dark:text-slate-100 hover:text-slate-600 dark:hover:text-slate-400">Quay lại</Link>
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12 sm:px-6">
      <Card padding="lg" className="w-full max-w-md mx-auto">
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Đổi thiết bị đăng nhập</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Nhập email và mật khẩu để nhận mã OTP xác nhận đổi thiết bị.</p>
        <p className="mt-1 text-sm font-medium text-warning-600 dark:text-warning-400">💡 Nếu không thấy email, vui lòng kiểm tra mục <strong>Spam</strong> hoặc <strong>Thư rác</strong>.</p>

        <form className="mt-8 space-y-5" onSubmit={handleRequestOtp} noValidate>
          <Input label="Email" type="email" value={emailInput} onChange={(e) => { setEmailInput(e.target.value); setFieldErrors(p => ({...p, email: ''})); }} error={fieldErrors.email} placeholder="your@email.com" required />
          <Input label="Mật khẩu" type="password" value={passwordInput} onChange={(e) => { setPasswordInput(e.target.value); setFieldErrors(p => ({...p, password: ''})); }} error={fieldErrors.password} placeholder="Mật khẩu" required />
          {error && <div className="flex items-center gap-2 rounded-xl bg-danger-50 dark:bg-danger-900/30 px-4 py-3 text-sm text-danger-700 dark:text-danger-300" role="alert"><WarningCircle size={18} weight="fill" /><span>{error}</span></div>}
          <Button type="submit" variant="primary" loading={sending} className="w-full">Gửi mã OTP</Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          <Link to="/login" className="font-semibold text-slate-900 dark:text-slate-100 hover:text-slate-600 dark:hover:text-slate-400">Quay lại đăng nhập</Link>
        </p>
      </Card>
    </div>
  );
}