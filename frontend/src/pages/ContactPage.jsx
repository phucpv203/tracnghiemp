import { Link } from 'react-router-dom';

export default function ContactPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-md mx-auto rounded-3xl bg-white dark:bg-slate-800 p-8 shadow-xl dark:shadow-slate-800 sm:p-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30">
          <svg className="h-8 w-8 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.49 10.04c-.27-.11-.55-.16-.84-.16h-1.4v3.38h1.4c.29 0 .57-.05.84-.16.27-.11.5-.26.7-.46.2-.2.35-.43.46-.7.11-.27.16-.56.16-.87 0-.31-.05-.6-.16-.87-.11-.27-.26-.5-.46-.7-.2-.2-.43-.35-.7-.46zM12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm-.5 16.54H8.25V7.46h3.25c.69 0 1.33.13 1.92.39.59.26 1.1.62 1.53 1.08.43.46.77 1 1.01 1.63.24.63.36 1.32.36 2.07 0 .75-.12 1.44-.36 2.07-.24.63-.58 1.17-1.01 1.63-.43.46-.94.82-1.53 1.08-.59.26-1.23.39-1.92.39zm5.5-2.89c-.11.27-.26.5-.46.7-.2.2-.43.35-.7.46-.27.11-.56.16-.86.16-.3 0-.59-.05-.86-.16-.27-.11-.5-.26-.7-.46-.2-.2-.35-.43-.46-.7-.11-.27-.16-.56-.16-.87 0-.31.05-.6.16-.87.11-.27.26-.5.46-.7.2-.2.43-.35.7-.46.27-.11.56-.16.86-.16.3 0 .59.05.86.16.27.11.5.26.7.46.2.2.35.43.46.7.11.27.16.56.16.87 0 .31-.05.6-.16.87z"/>
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Liên hệ hỗ trợ</h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Nếu bạn gặp vấn đề trong quá trình sử dụng, vui lòng liên hệ với chúng tôi qua Zalo để được hỗ trợ nhanh nhất.
        </p>

        <div className="mt-6 rounded-2xl border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 p-5 flex flex-col items-center">
          <img
            src="https://hdfruisfrluvwstoryak.supabase.co/storage/v1/object/sign/image/QRZALO.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV85OTQzZmI1YS0yYTI1LTRlZGQtOGM3Yy1mMmNmNDMzMzk3NDYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZS9RUlpBTE8uanBnIiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc4MzE2MDE1OCwiZXhwIjoyMDk4NTIwMTU4fQ.QoaFCOsRpRHa75WT3XjX6id5t_SyfoBAw2aNCprLwh4"
            alt="QR Zalo"
            className="w-48 h-48 rounded-xl shadow-sm"
          />
          <p className="mt-3 text-sm font-semibold text-blue-600 dark:text-blue-400">
            Quét mã QR để liên hệ Zalo
          </p>
        </div>

        <Link
          to="/dashboard"
          className="mt-6 inline-block w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 transition text-center"
        >
          Quay lại trang chủ
        </Link>
      </div>
    </div>
  );
}