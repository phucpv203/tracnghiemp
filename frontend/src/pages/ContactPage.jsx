import { Link } from 'react-router-dom';
import { Card, Button } from '../components/ui';
import { ArrowLeft, ChatTeardropDots } from '@phosphor-icons/react';

export default function ContactPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12 sm:px-6">
      <Card padding="lg" className="w-full max-w-md mx-auto text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/30">
          <ChatTeardropDots size={32} weight="fill" className="text-primary-600 dark:text-primary-400" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Liên hệ hỗ trợ</h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Nếu bạn gặp vấn đề trong quá trình sử dụng, vui lòng liên hệ với chúng tôi qua Zalo để được hỗ trợ nhanh nhất.
        </p>

        <div className="mt-6 rounded-2xl border border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/30 p-5 flex flex-col items-center">
          <img
            src="https://hdfruisfrluvwstoryak.supabase.co/storage/v1/object/sign/image/QRZALO.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV85OTQzZmI1YS0yYTI1LTRlZGQtOGM3Yy1mMmNmNDMzMzk3NDYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZS9RUlpBTE8uanBnIiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc4MzE2MDE1OCwiZXhwIjoyMDk4NTIwMTU4fQ.QoaFCOsRpRHa75WT3XjX6id5t_SyfoBAw2aNCprLwh4"
            alt="QR Zalo"
            className="w-48 h-48 rounded-xl shadow-sm"
          />
          <p className="mt-3 text-sm font-semibold text-primary-600 dark:text-primary-400">
            Quét mã QR để liên hệ Zalo
          </p>
        </div>

        <Link to="/trang-chu">
          <Button variant="primary" className="mt-6 w-full">
            <ArrowLeft size={16} weight="bold" />
            Quay lại trang chủ
          </Button>
        </Link>
      </Card>
    </div>
  );
}