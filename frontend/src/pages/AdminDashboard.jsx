import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../App';
import { Button, Card } from '../components/ui';
import { SignOut, ArrowLeft, Users, BookOpen, PushPin, ChalkboardTeacher } from '@phosphor-icons/react';

export default function AdminDashboard() {
  const { onLogout } = useContext(AuthContext);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <Card padding="md" className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Admin Trang chủ</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Quản lý người dùng và nội dung.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/trang-chu">
              <Button variant="secondary" size="sm">
                <ArrowLeft size={16} weight="bold" />
                Quay lại Trang chủ
              </Button>
            </Link>
            <Button variant="primary" size="sm" onClick={onLogout}>
              <SignOut size={16} weight="bold" />
              Đăng xuất
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link to="/admin/users">
          <Card padding="md" hover className="h-full">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/30">
                <Users size={24} weight="fill" className="text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Quản lý tài khoản</h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Chỉnh sửa, thay đổi role và xóa (demo).</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/admin/courses">
          <Card padding="md" hover className="h-full">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success-50 dark:bg-success-900/30">
                <BookOpen size={24} weight="fill" className="text-success-600 dark:text-success-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Quản lý môn học & câu hỏi</h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Thêm/Chỉnh sửa môn học, thêm câu hỏi.</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/admin/note">
          <Card padding="md" hover className="h-full">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-warning-50 dark:bg-warning-900/30">
                <PushPin size={24} weight="fill" className="text-warning-600 dark:text-warning-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Quản lý lưu ý</h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Chỉnh sửa dòng lưu ý hiển thị trên trang.</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </main>
  );
}